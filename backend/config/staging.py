"""
Staging settings for Mwalimu School Management System.
Staging should mirror production as closely as possible but with relaxed security for testing.
"""
from .production import *
from decouple import config

# Override some production settings for staging
DEBUG = config('DEBUG', default=False, cast=bool)

# Staging-specific hosts
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='staging.school.com,localhost', cast=Csv())

# Database optimizations for staging
DATABASES['default'].update({
    'CONN_MAX_AGE': 300,  # 5 minute connection pooling for staging
    'CONN_HEALTH_CHECKS': True,
    'OPTIONS': {
        'connect_timeout': 30,
        'options': (
            '-c default_transaction_isolation=read_committed '
            '-c statement_timeout=30000 '  # 30 second statement timeout
            '-c idle_in_transaction_session_timeout=600000 '  # 10 minute idle timeout
            '-c log_min_duration_statement=500 '  # Log queries slower than 500ms
            '-c max_connections=100 '  # Moderate max connections for staging
            '-c effective_cache_size=1GB '  # Optimize for 1GB cache
            '-c maintenance_work_mem=128MB'  # Staging maintenance memory
        ),
        'sslmode': 'prefer',
        'application_name': 'mwalimu_school_staging',
    }
})

# Relaxed security for staging testing
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SECURE_HSTS_SECONDS = 0  # Disable HSTS in staging

# Staging email (can use different provider or console)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')

# Staging logging (more verbose for debugging)
LOGGING['handlers']['console']['level'] = 'INFO'
LOGGING['loggers']['django']['level'] = 'INFO'
LOGGING['loggers']['apps'] = {
    'handlers': ['file', 'console'],
    'level': 'DEBUG',
    'propagate': False,
}

# Staging DRF settings (more permissive rate limits)
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '500/hour',
    'user': '5000/hour',
    'login': '20/min',
    'password_reset': '10/hour',
}

# Staging JWT settings (longer tokens for testing)
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=4),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
})

# Optional: Enable some debugging tools in staging
if config('ENABLE_STAGING_DEBUG', default=False, cast=bool):
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    INTERNAL_IPS = ['127.0.0.1']