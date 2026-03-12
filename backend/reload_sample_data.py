#!/usr/bin/env python3
"""
Script to reload sample data including marks and reports for testing
"""
import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection

def run_sql_file(filename):
    """Execute SQL file"""
    sql_file = backend_dir / 'sql' / filename
    if sql_file.exists():
        print(f"Executing {filename}...")
        with open(sql_file, 'r') as f:
            sql = f.read()
        
        with connection.cursor() as cursor:
            cursor.execute(sql)
        print(f"✓ {filename} executed successfully")
    else:
        print(f"✗ {filename} not found")

def main():
    print("Reloading sample data with marks and reports...")
    
    try:
        # Run migrations first
        print("Running migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        
        # Load sample data
        run_sql_file('05_sample_zambian_data.sql')
        
        print("\n✓ Sample data reloaded successfully!")
        print("\nTest parent login:")
        print("Username: pmbewe")
        print("Password: parent123")
        print("Child: Mwansa Chanda (Student #LBS2024001)")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()