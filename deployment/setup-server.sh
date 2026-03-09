#!/bin/bash

# Server Setup Script for School Management System
# Run this on a fresh Ubuntu/Debian server

set -e

echo "========================================="
echo "Setting up School Management System Server"
echo "========================================="

# Update system
echo "Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install required packages
echo "Installing required packages..."
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    postgresql \
    postgresql-contrib \
    nginx \
    git \
    curl \
    build-essential \
    libpq-dev

# Install Node.js
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Setup PostgreSQL
echo "Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE school_management;"
sudo -u postgres psql -c "CREATE USER school_admin WITH PASSWORD 'change-this-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE school_management TO school_admin;"
sudo -u postgres psql -d school_management -c "GRANT ALL ON SCHEMA public TO school_admin;"

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /var/www/school-management
sudo chown -R $USER:$USER /var/www/school-management

# Clone repository
echo "Cloning repository..."
cd /var/www
git clone git@gitlab.com:sikapandadavid98/cumulative-score-and-rank-analyzer.git school-management
cd school-management

# Setup backend
echo "Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements-prod.txt

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
DEBUG=False
SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
DATABASE_NAME=school_management
DATABASE_USER=school_admin
DATABASE_PASSWORD=change-this-password
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
EOF

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Create superuser
echo "Creating superuser..."
python manage.py createsuperuser --noinput --username admin --email admin@school.com || true

# Collect static files
python manage.py collectstatic --noinput

cd ..

# Setup frontend
echo "Setting up frontend..."
npm install
npm run build

# Setup systemd service
echo "Setting up systemd service..."
sudo cp deployment/school-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable school-backend
sudo systemctl start school-backend

# Setup Nginx
echo "Setting up Nginx..."
sudo cp deployment/nginx-site.conf /etc/nginx/sites-available/school-management
sudo ln -sf /etc/nginx/sites-available/school-management /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Create log directories
echo "Creating log directories..."
sudo mkdir -p /var/log/school-backend
sudo chown -R www-data:www-data /var/log/school-backend

# Setup firewall
echo "Setting up firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo "========================================="
echo "Server setup completed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your actual values"
echo "2. Update Nginx configuration with your domain"
echo "3. Setup SSL certificate (certbot)"
echo "4. Create Django superuser: python manage.py createsuperuser"
echo "5. Test the application"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status school-backend"
echo "  sudo systemctl restart school-backend"
echo "  sudo systemctl status nginx"
echo "  sudo tail -f /var/log/school-backend/error.log"
