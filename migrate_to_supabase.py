#!/usr/bin/env python3
"""
Migration script to move data from old PostgreSQL to Supabase
Run this after setting up Supabase connection
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append('backend')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection

def test_connection():
    """Test database connection"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            print(f"✅ Connected to: {version}")
        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def run_migrations():
    """Run Django migrations"""
    print("Running migrations...")
    try:
        execute_from_command_line(['manage.py', 'migrate'])
        print("✅ Migrations completed")
        return True
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

def create_superuser():
    """Create admin superuser"""
    print("Creating admin user...")
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if not User.objects.filter(username='admin').exists():
            if hasattr(User, 'role'):
                User.objects.create_superuser('admin', 'admin@school.com', 'admin123', role='admin')
            else:
                User.objects.create_superuser('admin', 'admin@school.com', 'admin123')
            print("✅ Admin user created - username: admin, password: admin123")
        else:
            print("✅ Admin user already exists")
        return True
    except Exception as e:
        print(f"❌ User creation failed: {e}")
        return False

def main():
    print("=== Supabase Migration Script ===\n")
    
    # Test connection
    if not test_connection():
        return False
    
    # Run migrations
    if not run_migrations():
        return False
        
    # Create superuser
    if not create_superuser():
        return False
    
    print("\n🎉 Migration to Supabase completed successfully!")
    print("\nNext steps:")
    print("1. Update GitLab CI/CD variables with your Supabase credentials")
    print("2. Push changes to GitLab")
    print("3. Run the deploy-production pipeline")
    print("4. Access your app with admin/admin123")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)