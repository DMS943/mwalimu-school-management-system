#!/bin/bash

# Complete database setup script
# Run this to set up everything at once

echo "=========================================="
echo "School Management System - Database Setup"
echo "=========================================="
echo ""

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "Error: PostgreSQL is not running"
    exit 1
fi

echo "Step 1: Creating database and user..."
psql -U postgres -f 01_create_database.sql

if [ $? -ne 0 ]; then
    echo "Error creating database"
    exit 1
fi

echo ""
echo "Step 2: Creating tables..."
psql -U postgres -d school_management -f 02_create_tables.sql

if [ $? -ne 0 ]; then
    echo "Error creating tables"
    exit 1
fi

echo ""
echo "Step 3: Granting privileges..."
psql -U postgres -d school_management -f 01b_grant_privileges.sql

if [ $? -ne 0 ]; then
    echo "Error granting privileges"
    exit 1
fi

echo ""
echo "Step 4: Creating functions and triggers..."
psql -U postgres -d school_management -f 04_functions.sql

if [ $? -ne 0 ]; then
    echo "Error creating functions"
    exit 1
fi

echo ""
read -p "Do you want to insert sample data? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Step 5: Inserting sample data..."
    psql -U postgres -d school_management -f 03_sample_data.sql
fi

echo ""
echo "=========================================="
echo "Database setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update backend/.env with database credentials"
echo "2. Run Django migrations: python manage.py migrate"
echo "3. Create superuser: python manage.py createsuperuser"
echo "4. Start server: python manage.py runserver"
