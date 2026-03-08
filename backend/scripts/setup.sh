#!/bin/bash

echo "Setting up Django backend..."

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file. Please update with your database credentials."
fi

# Run migrations
python manage.py makemigrations
python manage.py migrate

echo "Setup complete! Create a superuser with: python manage.py createsuperuser"
echo "Run the server with: python manage.py runserver"
