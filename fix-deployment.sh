#!/bin/bash

# Colors for better output readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 School Management System - Deployment Fix Script${NC}"
echo "=================================================================="

# Function to print status
print_status() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose not found. Please install Docker Compose."
    exit 1
fi

print_status "Starting deployment fix process..."

# Step 1: Stop existing containers
print_status "Step 1: Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Step 2: Clean up old images (optional)
print_status "Step 2: Cleaning up unused Docker resources..."
docker system prune -f

# Step 3: Setup environment file
print_status "Step 3: Setting up environment file..."
if [ ! -f .env.production ]; then
    if [ -f .env.example.production ]; then
        cp .env.example.production .env.production
        print_warning "Created .env.production from template. Please edit with your values!"
    else
        print_error ".env.example.production not found!"
        exit 1
    fi
else
    print_status "Environment file .env.production already exists"
fi

# Step 4: Verify environment variables
print_status "Step 4: Verifying critical environment variables..."
source .env.production

if [ -z "$SECRET_KEY" ]; then
    print_error "SECRET_KEY not set in .env.production"
    exit 1
fi

if [ -z "$DATABASE_PASSWORD" ]; then
    print_error "DATABASE_PASSWORD not set in .env.production"
    exit 1
fi

print_status "Environment variables verified"

# Step 5: Build images
print_status "Step 5: Building Docker images (this may take a few minutes)..."
if ! docker-compose -f docker-compose.prod.yml build --no-cache; then
    print_error "Docker build failed"
    exit 1
fi

# Step 6: Start database first
print_status "Step 6: Starting database..."
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 15

# Check if database is responding
MAX_RETRIES=30
RETRY_COUNT=0
until docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U ${DATABASE_USER:-school_admin} -d ${DATABASE_NAME:-school_management}; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        print_error "Database failed to start after $MAX_RETRIES attempts"
        docker-compose -f docker-compose.prod.yml logs postgres
        exit 1
    fi
    echo "Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

print_status "Database is ready!"

# Step 7: Start backend
print_status "Step 7: Starting backend..."
docker-compose -f docker-compose.prod.yml up -d backend

# Wait for backend to be ready
print_status "Waiting for backend to initialize..."
sleep 30

# Check backend health
RETRY_COUNT=0
until docker-compose -f docker-compose.prod.yml exec -T backend python manage.py check; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge 10 ]; then
        print_error "Backend failed to start properly"
        docker-compose -f docker-compose.prod.yml logs backend
        exit 1
    fi
    echo "Waiting for backend... (attempt $RETRY_COUNT/10)"
    sleep 5
done

print_status "Backend is ready!"

# Step 8: Start frontend and nginx
print_status "Step 8: Starting frontend and nginx..."
docker-compose -f docker-compose.prod.yml up -d frontend nginx

# Step 9: Final health check
print_status "Step 9: Running final health checks..."
sleep 20

# Check all containers are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Exit"; then
    print_error "Some containers have exited. Check logs:"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

# Test endpoints
print_status "Testing endpoints..."
sleep 10

# Test health endpoint
if curl -f -s http://localhost/health/ > /dev/null; then
    print_status "✅ Health endpoint is responding"
else
    print_warning "Health endpoint not responding yet (may need more time)"
fi

# Test API endpoint
if curl -f -s http://localhost/api/ > /dev/null; then
    print_status "✅ API endpoint is responding"
else
    print_warning "API endpoint not responding yet (may need more time)"
fi

print_status "Step 10: Deployment summary..."
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo -e "${BLUE}📋 What's next:${NC}"
echo "1. Test the application: http://localhost/"
echo "2. Access admin panel: http://localhost/admin/"
echo "3. Check API: http://localhost/api/"
echo "4. Default admin login: admin / admin123"
echo ""
echo -e "${YELLOW}⚠️  Security reminders:${NC}"
echo "- Change the default admin password immediately"
echo "- Review and update .env.production with secure values"
echo "- Set up SSL certificates for production use"
echo ""
echo -e "${BLUE}🔧 Useful commands:${NC}"
echo "- View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "- Restart: docker-compose -f docker-compose.prod.yml restart"
echo "- Stop: docker-compose -f docker-compose.prod.yml down"
echo "- Troubleshoot: ./deployment/troubleshoot.sh"
echo ""
print_status "Deployment fix completed!"