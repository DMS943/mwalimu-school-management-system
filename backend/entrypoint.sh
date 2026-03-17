#!/bin/bash

# Wait for database to be ready
echo "Waiting for database..."
while ! pg_isready -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER; do
    echo "Database is unavailable - sleeping"
    sleep 1
done
echo "Database is up - continuing..."

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if it doesn't exist
echo "Creating superuser if needed..."
python manage.py shell -c "
from apps.users.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@school.com', 'admin123', role='admin')
    print('Superuser created: admin/admin123')
else:
    print('Superuser already exists')
"

# Load sample data if needed
echo "Loading sample data if needed..."
python manage.py shell -c "
from apps.students.models import Student
if Student.objects.count() == 0:
    print('Loading sample data...')
    exec(open('setup_parent.py').read())
else:
    print('Sample data already exists')
" || echo "Sample data script not found or failed"

echo "Starting application..."
exec "$@"