#!/bin/bash

# Deployment script for School Management System
# Usage: ./deploy.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}

echo "========================================="
echo "Deploying to $ENVIRONMENT environment"
echo "========================================="

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    export $(cat .env.$ENVIRONMENT | xargs)
else
    echo "Error: .env.$ENVIRONMENT file not found"
    exit 1
fi

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Backend deployment
echo "Deploying backend..."
cd backend

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
if [ "$ENVIRONMENT" = "production" ]; then
    pip install -r requirements-prod.txt
else
    pip install -r requirements.txt
fi

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if needed (only for staging)
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "Checking for superuser..."
    python manage.py shell -c "from apps.users.models import User; User.objects.filter(is_superuser=True).exists() or User.objects.create_superuser('admin', 'admin@school.com', 'admin123')" || true
fi

cd ..

# Frontend deployment
echo "Deploying frontend..."

# Install Node dependencies
echo "Installing Node dependencies..."
npm ci

# Build frontend
echo "Building frontend..."
npm run build

# Restart services
echo "Restarting services..."
if [ "$ENVIRONMENT" = "production" ]; then
    sudo systemctl restart school-backend
    sudo systemctl restart nginx
else
    sudo systemctl restart school-backend-staging
    sudo systemctl restart nginx
fi

echo "========================================="
echo "Deployment to $ENVIRONMENT completed!"
echo "========================================="

# Run health check
echo "Running health check..."
sleep 5

if [ "$ENVIRONMENT" = "production" ]; then
    curl -f http://localhost/api/ || echo "Warning: Health check failed"
else
    curl -f http://localhost:8080/api/ || echo "Warning: Health check failed"
fi

echo "Deployment finished successfully!"
