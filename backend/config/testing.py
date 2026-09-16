"""
Testing settings for Mwalimu School Management System.
Optimized for CI/CD pipeline testing with fast, isolated tests.
"""
from .base import *
from decouple import config
import tempfile
import os

# Test mode indicators
TESTING = True
DEBUG = False

# Use in-memory SQLite for fast tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'timeout': 20,
        },
        'TEST': {
            'NAME': ':memory:',
        }
    }
}

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Fast password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Use local memory cache for tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
    }
}

# Disable Redis requirement for tests
REDIS_URL = None

# Email backend for tests
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Media files for tests
MEDIA_ROOT = tempfile.mkdtemp()
MEDIA_URL = '/media/'

# Static files for tests
STATIC_ROOT = tempfile.mkdtemp()

# Disable external services for tests
SENTRY_DSN = None

# JWT settings for tests (short-lived tokens)
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(hours=1),
})

# Disable rate limiting for tests
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}

# Simplified logging for tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'ERROR',
        },
    },
    'root': {
        'handlers': ['console'],
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# Disable security middleware for tests
MIDDLEWARE = [m for m in MIDDLEWARE if 'security' not in m.lower()]

# Test-specific security settings
SECRET_KEY = 'test-secret-key-only-for-testing'
ALLOWED_HOSTS = ['*']

# Disable HTTPS requirements for tests
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_CONTENT_TYPE_NOSNIFF = False
SECURE_BROWSER_XSS_FILTER = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# CORS settings for tests
CORS_ALLOW_ALL_ORIGINS = True

# Test data configuration
FIXTURE_DIRS = [
    BASE_DIR / 'fixtures',
]

# Celery settings for tests (if using)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# File upload settings for tests
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024  # 1MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024  # 1MB

# Disable collectstatic for tests
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'