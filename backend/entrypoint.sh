#!/bin/bash
set -e

echo "=== School Management System Startup ==="

# Simple database wait
echo "Waiting for database..."
until pg_isready -h ${DATABASE_HOST:-postgres} -p ${DATABASE_PORT:-5432} -U ${DATABASE_USER:-school_admin} -q; do
    echo "Database not ready, waiting..."
    sleep 2
done
echo "✅ Database connected"

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
    except:
        print('Admin user creation failed')
else:
    print('Admin user exists')
" 2>/dev/null || echo "User setup skipped"

echo "✅ Startup complete, launching application..."
exec "$@"