#!/bin/bash

echo "🚀 School Management System - Deployment Fix"
echo "============================================="

# Stop any running containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Clean up
echo "🧹 Cleaning up..."
docker system prune -f
docker volume prune -f

# Create production environment file if it doesn't exist
if [ ! -f ".env.production" ]; then
    echo "📝 Creating .env.production file..."
    cp .env.example.production .env.production
    echo "⚠️  Please edit .env.production with your actual values!"
fi

# Build containers
echo "🔨 Building containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Start database first
echo "🗄️ Starting database..."
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database
echo "⏳ Waiting for database to be ready..."
sleep 10

# Start all services
echo "🚀 Starting all services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check status
echo "📊 Checking deployment status..."
docker-compose -f docker-compose.prod.yml ps

# Run health check
echo "🏥 Running health check..."
sleep 10
curl -f http://localhost/ && echo "✅ Frontend is responding" || echo "❌ Frontend not responding"
curl -f http://localhost/api/ && echo "✅ Backend API is responding" || echo "❌ Backend API not responding"

echo ""
echo "🎉 Deployment fix completed!"
echo ""
echo "📋 Next steps:"
echo "1. Check the container status above"
echo "2. If any containers are not running, check logs: docker-compose -f docker-compose.prod.yml logs [service-name]"
echo "3. Access your application at http://localhost"
echo "4. Login with: admin/admin123 (change this password!)"
echo ""
echo "🔧 For troubleshooting, run: bash deployment/troubleshoot.sh"