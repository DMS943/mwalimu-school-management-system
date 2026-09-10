#!/bin/bash
set -e

echo "=== Starting entrypoint script ==="

# Wait for database to be ready
echo "=== Waiting for database ==="
MAX_TRIES=60
COUNT=0
while ! pg_isready -h ${DATABASE_HOST:-postgres} -p ${DATABASE_PORT:-5432} -U ${DATABASE_USER:-school_admin}; do
    echo "Database is unavailable - sleeping (attempt $COUNT/$MAX_TRIES)"
    COUNT=$((COUNT + 1))
    if [ $COUNT -gt $MAX_TRIES ]; then
        echo "❌ Database failed to become ready after $MAX_TRIES attempts"
        exit 1
    fi
    sleep 2
done
echo "✅ Database is up - continuing..."

# Run migrations
echo "=== Running database migrations ==="
python manage.py migrate --noinput || {
    echo "❌ Migration failed, but continuing..."
}

# Collect static files
echo "=== Collecting static files ==="
python manage.py collectstatic --noinput || {
    echo "❌ Static file collection failed, but continuing..."
}

# Create superuser if it doesn't exist
echo "=== Creating superuser if needed ==="
python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()
try:
    if not User.objects.filter(username='admin').exists():
        if hasattr(User, 'role'):
            # Custom user model with role field
            User.objects.create_superuser('admin', 'admin@school.com', 'admin123', role='admin')
        else:
            # Default Django user model
            User.objects.create_superuser('admin', 'admin@school.com', 'admin123')
        print('✅ Superuser created: admin/admin123')
    else:
        print('✅ Superuser already exists')
except Exception as e:
    print(f'⚠️ Superuser creation error: {e}')
" || echo "⚠️ Superuser creation skipped or failed"

# Check Django configuration
echo "=== Running Django system check ==="
python manage.py check || {
    echo "⚠️ Django check found issues, but continuing..."
}

echo "✅ Entrypoint script completed successfully"
echo "=== Starting application: $@ ==="
exec "$@"