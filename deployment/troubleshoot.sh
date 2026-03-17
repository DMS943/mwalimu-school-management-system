#!/bin/bash

echo "🔍 School Management System - Deployment Troubleshooting"
echo "========================================================"

# Check Docker
echo "📦 Checking Docker..."
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed: $(docker --version)"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ Docker is not installed"
fi

echo ""

# Check Docker Compose
echo "🐳 Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is installed: $(docker-compose --version)"
else
    echo "❌ Docker Compose is not installed"
fi

echo ""

# Check containers
echo "📋 Container Status..."
docker-compose -f docker-compose.prod.yml ps

echo ""

# Check logs
echo "📝 Recent Container Logs..."
echo "--- Backend Logs ---"
docker-compose -f docker-compose.prod.yml logs --tail=20 backend

echo ""
echo "--- Frontend Logs ---"
docker-compose -f docker-compose.prod.yml logs --tail=20 frontend

echo ""
echo "--- Nginx Logs ---"
docker-compose -f docker-compose.prod.yml logs --tail=20 nginx

echo ""
echo "--- Database Logs ---"
docker-compose -f docker-compose.prod.yml logs --tail=20 postgres

echo ""

# Check environment variables
echo "🔧 Environment Check..."
if [ -f ".env.production" ]; then
    echo "✅ .env.production file exists"
    echo "Environment variables (without sensitive data):"
    grep -E "^(DEBUG|DATABASE_NAME|DATABASE_HOST|ALLOWED_HOSTS)" .env.production || echo "No matching variables found"
else
    echo "❌ .env.production file missing"
fi

echo ""

# Check network connectivity
echo "🌐 Network Connectivity..."
docker-compose -f docker-compose.prod.yml exec backend ping -c 3 postgres || echo "Cannot reach database"

echo ""

# Check database connection
echo "🗄️ Database Connection..."
docker-compose -f docker-compose.prod.yml exec backend python manage.py check --database default || echo "Database check failed"

echo ""

# Check migrations
echo "📊 Migration Status..."
docker-compose -f docker-compose.prod.yml exec backend python manage.py showmigrations || echo "Cannot check migrations"

echo ""

# Health check
echo "🏥 Application Health Check..."
curl -f http://localhost/api/health/ || echo "Health check endpoint not responding"

echo ""
echo "🎯 Troubleshooting Complete!"
echo ""
echo "💡 Common Solutions:"
echo "1. Check environment variables in .env.production"
echo "2. Ensure database is running: docker-compose -f docker-compose.prod.yml up postgres -d"
echo "3. Run migrations: docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate"
echo "4. Rebuild containers: docker-compose -f docker-compose.prod.yml build --no-cache"
echo "5. Check firewall settings and port availability"