#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 School Management System - Deployment Troubleshooter${NC}"
echo "============================================================"

# Check if running with docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Checking environment files...${NC}"

# Check environment files
ENV_FILES=(".env.production" ".env.example.production")
for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        echo -e "${GREEN}✅ Found: $env_file${NC}"
    else
        echo -e "${RED}❌ Missing: $env_file${NC}"
        if [ "$env_file" = ".env.production" ]; then
            echo -e "${YELLOW}💡 Creating $env_file from example...${NC}"
            cp .env.example.production .env.production
            echo -e "${YELLOW}⚠️  Please edit .env.production with your actual values!${NC}"
        fi
    fi
done

echo -e "\n${YELLOW}🐳 Checking Docker containers...${NC}"

# Check container status
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${YELLOW}🔍 Checking container logs...${NC}"

# Function to check logs
check_logs() {
    local service=$1
    echo -e "${BLUE}--- $service logs (last 20 lines) ---${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=20 $service 2>/dev/null || echo "Service $service not found or not running"
}

# Check logs for each service
check_logs "postgres"
check_logs "backend"
check_logs "frontend"
check_logs "nginx"

echo -e "\n${YELLOW}🔌 Testing network connectivity...${NC}"

# Test if containers can reach each other
echo -e "${BLUE}Testing database connection...${NC}"
if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U ${DATABASE_USER:-school_admin} -d ${DATABASE_NAME:-school_management} &>/dev/null; then
    echo -e "${GREEN}✅ Database is ready${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
fi

echo -e "${BLUE}Testing backend health...${NC}"
if docker-compose -f docker-compose.prod.yml exec -T backend python manage.py check &>/dev/null; then
    echo -e "${GREEN}✅ Backend Django check passed${NC}"
else
    echo -e "${RED}❌ Backend Django check failed${NC}"
fi

echo -e "\n${YELLOW}🌐 Testing HTTP endpoints...${NC}"

# Test endpoints
test_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    echo -n "Testing $description ($url): "
    status=$(curl -s -o /dev/null -w "%{http_code}" $url 2>/dev/null || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✅ $status${NC}"
    else
        echo -e "${RED}❌ $status (expected $expected_status)${NC}"
    fi
}

test_endpoint "http://localhost/health/" "200" "Health Check"
test_endpoint "http://localhost/api/" "200" "API Root"
test_endpoint "http://localhost/admin/" "200" "Admin Panel"
test_endpoint "http://localhost/" "200" "Frontend"

echo -e "\n${YELLOW}💾 Checking disk space...${NC}"
df -h | grep -E "(Filesystem|/dev/)"

echo -e "\n${YELLOW}🧠 Checking memory usage...${NC}"
free -h

echo -e "\n${YELLOW}🔧 Checking required ports...${NC}"
ports=(80 443 5432 8000)
for port in "${ports[@]}"; do
    if netstat -tuln 2>/dev/null | grep ":$port " > /dev/null; then
        echo -e "${GREEN}✅ Port $port is in use${NC}"
    else
        echo -e "${YELLOW}⚠️  Port $port is free${NC}"
    fi
done

echo -e "\n${YELLOW}🔐 Checking environment variables...${NC}"
if [ -f .env.production ]; then
    echo "Required variables in .env.production:"
    required_vars=("SECRET_KEY" "DATABASE_NAME" "DATABASE_USER" "DATABASE_PASSWORD")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env.production; then
            echo -e "${GREEN}✅ $var is set${NC}"
        else
            echo -e "${RED}❌ $var is missing${NC}"
        fi
    done
fi

echo -e "\n${BLUE}🎯 Quick Fix Commands:${NC}"
echo "============================================================"
echo -e "${YELLOW}Restart all services:${NC}"
echo "docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo -e "${YELLOW}View real-time logs:${NC}"
echo "docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "${YELLOW}Run Django management commands:${NC}"
echo "docker-compose -f docker-compose.prod.yml exec backend python manage.py [command]"
echo ""
echo -e "${YELLOW}Access database:${NC}"
echo "docker-compose -f docker-compose.prod.yml exec postgres psql -U \$DATABASE_USER -d \$DATABASE_NAME"
echo ""
echo -e "${YELLOW}Rebuild and restart:${NC}"
echo "./fix-deployment.sh"

echo -e "\n${GREEN}🔍 Troubleshooting completed!${NC}"