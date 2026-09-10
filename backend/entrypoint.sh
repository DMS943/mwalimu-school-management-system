#!/bin/bash
set -e

echo "=== School Management System Startup ==="

# Simple database connection test to Supabase
echo "Testing Supabase connection..."
python -c "
import os, psycopg2, sys
try:
    conn = psycopg2.connect(
        host=os.environ.get('DATABASE_HOST', 'localhost'),
        database=os.environ.get('DATABASE_NAME', 'postgres'),
        user=os.environ.get('DATABASE_USER', 'postgres'),
        password=os.environ.get('DATABASE_PASSWORD', ''),
        port=os.environ.get('DATABASE_PORT', '5432'),
        connect_timeout=10
    )
    print('✅ Supabase connection successful')
    conn.close()
except Exception as e:
    print(f'❌ Supabase connection failed: {e}')
    sys.exit(1)
"

# Run essential Django setup
echo "Running migrations..."
python manage.py migrate --noinput || echo "Migration skipped"

echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Static files skipped"

echo "Creating admin user..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    try:
        if hasattr(User, 'role'):
            User.objects.create_superuser('admin', 'admin@school.com', 'admin123', role='admin')
        else:
            User.objects.create_superuser('admin', 'admin@school.com', 'admin123')
        print('Admin user created')
    except Exception as e:
        print(f'Admin user creation failed: {e}')
else:
    print('Admin user exists')
" 2>/dev/null || echo "User setup skipped"

echo "✅ Startup complete, launching application..."
exec "$@"