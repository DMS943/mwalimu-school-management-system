"""
Development settings for Mwalimu School Management System.
"""
from .base import *
from decouple import config, Csv

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '*.ngrok.io']

# Database for development (can use local PostgreSQL or Supabase)
DATABASES['default'].update({
    'CONN_MAX_AGE': 60,  # Short connection pooling for development
    'CONN_HEALTH_CHECKS': False,  # Disable health checks in development
    'OPTIONS': {
        'connect_timeout': 15,
        'options': (
            '-c default_transaction_isolation=read_committed '
            '-c statement_timeout=0 '  # No statement timeout in development
            '-c log_statement=all '  # Log all queries in development
            '-c log_min_duration_statement=100 '  # Log queries slower than 100ms
            '-c max_connections=50 '  # Lower max connections for development
            '-c shared_preload_libraries=pg_stat_statements'  # Enable query stats
        ),
        'sslmode': 'prefer',
        'application_name': 'mwalimu_school_dev',
    }
})

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Development-specific middleware
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
] + MIDDLEWARE

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Cache for development (use local memory)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'school-management-dev',
    }
}

# Development logging
LOGGING['handlers']['console']['level'] = 'DEBUG'
LOGGING['handlers']['console']['filters'] = []
LOGGING['loggers']['django']['level'] = 'DEBUG'
LOGGING['loggers']['django.db.backends']['level'] = 'DEBUG'

# Django Debug Toolbar (optional)
if config('ENABLE_DEBUG_TOOLBAR', default=False, cast=bool):
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    INTERNAL_IPS = ['127.0.0.1']

# Development-specific DRF settings
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '1000/hour',
    'user': '10000/hour'
}

# JWT settings for development (longer tokens for convenience)
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
})

# Media files served by Django in development
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Additional development apps
DEV_APPS = []
if config('ENABLE_SILK_PROFILER', default=False, cast=bool):
    DEV_APPS.append('silk')
    MIDDLEWARE.insert(0, 'silk.middleware.SilkyMiddleware')

INSTALLED_APPS += DEV_APPS