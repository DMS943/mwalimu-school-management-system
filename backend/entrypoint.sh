#!/bin/bash
set -e

echo "Starting entrypoint script..."

# Wait for database to be ready
echo "Waiting for database..."
MAX_TRIES=60
COUNT=0
while ! pg_isready -h ${DATABASE_HOST:-postgres} -p ${DATABASE_PORT:-5432} -U ${DATABASE_USER:-school_admin}; do
    echo "Database is unavailable - sleeping (attempt $COUNT/$MAX_TRIES)"
    COUNT=$((COUNT + 1))
    if [ $COUNT -gt $MAX_TRIES ]; then
        echo "Database failed to become ready after $MAX_TRIES attempts"
        exit 1
    fi
    sleep 2
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
from django.contrib.auth import get_user_model
from django.db import IntegrityError
User = get_user_model()
try:
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@school.com', 'admin123', role='admin')
        print('Superuser created: admin/admin123')
    else:
        print('Superuser already exists')
except Exception as e:
    print(f'Error creating superuser: {e}')
" || echo "Superuser creation skipped or failed"

# Load sample data if needed (optional)
echo "Checking for sample data..."
python manage.py shell -c "
try:
    from apps.students.models import Student
    if Student.objects.count() == 0:
        print('No students found - sample data may need to be loaded manually')
    else:
        print(f'Found {Student.objects.count()} students in database')
except Exception as e:
    print(f'Could not check student data: {e}')
" || echo "Sample data check skipped"

echo "Entrypoint script completed successfully"
echo "Starting application: $@"
exec "$@"