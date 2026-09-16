"""
Base Django settings for Mwalimu School Management System.
Contains common settings shared across all environments.
"""
from pathlib import Path
from decouple import config, Csv
from datetime import timedelta
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# Application definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
]

LOCAL_APPS = [
    'apps.core',
    'apps.schools',
    'apps.users',
    'apps.students',
    'apps.academics',
    'apps.reports',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'apps.core.middleware.SecurityHeadersMiddleware',
    'apps.core.middleware.RateLimitMiddleware',
    'apps.core.middleware.InputValidationMiddleware',
    'apps.core.middleware.IPWhitelistMiddleware',
    'apps.core.middleware_monitoring.PerformanceMonitoringMiddleware',
    'apps.core.middleware_monitoring.DatabaseQueryCounterMiddleware',
    'apps.core.middleware_monitoring.SecurityEventMiddleware',
    'apps.core.middleware_monitoring.ResponseHeaderMiddleware',
    'apps.core.middleware_monitoring.MemoryUsageMiddleware',
    'apps.core.performance.DatabaseOptimizationMiddleware',  # Added performance middleware
    'django.middleware.cache.UpdateCacheMiddleware',  # Cache middleware (before sessions)
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.core.middleware.RequestLoggingMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.cache.FetchFromCacheMiddleware',  # Cache middleware (after all others)
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DATABASE_NAME'),
        'USER': config('DATABASE_USER'),
        'PASSWORD': config('DATABASE_PASSWORD'),
        'HOST': config('DATABASE_HOST'),
        'PORT': config('DATABASE_PORT', default='5432'),
        'OPTIONS': {
            'connect_timeout': 60,
            'options': '-c default_transaction_isolation=read_committed'
        }
    }
}

# Password validation with enhanced security
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'apps.core.validators.StrongPasswordValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = config('TIME_ZONE', default='Africa/Lusaka')
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
    'EXCEPTION_HANDLER': 'config.exceptions.custom_exception_handler',
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=config('JWT_ACCESS_TOKEN_HOURS', default=1, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=config('JWT_REFRESH_TOKEN_DAYS', default=7, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Email Configuration
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@school.com')

# Cache Configuration with Redis and Performance Optimization
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'mwalimu',
        'TIMEOUT': 300,  # 5 minutes default
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/2'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'mwalimu_sessions',
        'TIMEOUT': 86400,  # 24 hours
    },
    'query_cache': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/3'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'mwalimu_queries',
        'TIMEOUT': 1800,  # 30 minutes
    }
}

# Session Configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_SAVE_EVERY_REQUEST = False
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# Cache Framework Settings
CACHE_MIDDLEWARE_ALIAS = 'default'
CACHE_MIDDLEWARE_SECONDS = 600  # 10 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = 'mwalimu_page'

# Performance Optimization Settings
PERFORMANCE_OPTIMIZATION = {
    'QUERY_OPTIMIZATION_ENABLED': True,
    'CACHE_WARMING_ENABLED': True,
    'SLOW_QUERY_THRESHOLD': 0.1,  # 100ms
    'SLOW_RESPONSE_THRESHOLD': 2.0,  # 2 seconds
    'MAX_QUERIES_PER_REQUEST': 50,
    'ENABLE_QUERY_TRACKING': config('DEBUG', default=False, cast=bool),
    'N_PLUS_ONE_DETECTION': True,
    'AUTO_PREFETCH_ENABLED': True,
}

# CDN and Static File Optimization
CDN_ENABLED = config('CDN_ENABLED', default=False, cast=bool)
CDN_DOMAIN = config('CDN_DOMAIN', default=None)
AWS_S3_CDN_BUCKET = config('AWS_S3_CDN_BUCKET', default=None)
CLOUDFLARE_ENABLED = config('CLOUDFLARE_ENABLED', default=False, cast=bool)

# Asset Optimization
ASSET_OPTIMIZATION_ENABLED = config('ASSET_OPTIMIZATION_ENABLED', default=True, cast=bool)
COMPRESS_ENABLED = config('COMPRESS_ENABLED', default=True, cast=bool)
COMPRESS_OFFLINE = config('COMPRESS_OFFLINE', default=False, cast=bool)

# Logging Configuration (Base)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            '()': 'apps.core.logging.StructuredLogFormatter',
        },
    },
    'filters': {
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'console_json': {
            'level': 'INFO',
            'filters': ['require_debug_false'],
            'class': 'logging.StreamHandler',
            'formatter': 'json'
        },
    },
    'root': {
        'handlers': ['console'],
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'console_json'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'console_json'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['console', 'console_json'],
            'level': 'INFO',
            'propagate': False,
        },
        'performance': {
            'handlers': ['console', 'console_json'],
            'level': 'WARNING',
            'propagate': False,
        },
        'errors': {
            'handlers': ['console', 'console_json'],
            'level': 'ERROR',
            'propagate': False,
        },
        'application': {
            'handlers': ['console', 'console_json'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Monitoring Configuration
MONITORING = {
    'SLOW_REQUEST_THRESHOLD_MS': config('SLOW_REQUEST_THRESHOLD_MS', default=1000, cast=int),
    'MAX_QUERIES_PER_REQUEST': config('MAX_QUERIES_PER_REQUEST', default=50, cast=int),
    'MEMORY_THRESHOLD_MB': config('MEMORY_THRESHOLD_MB', default=100, cast=int),
    'ENABLE_METRICS_COLLECTION': config('ENABLE_METRICS_COLLECTION', default=True, cast=bool),
}

# Add monitoring settings to Django settings
SLOW_REQUEST_THRESHOLD_MS = MONITORING['SLOW_REQUEST_THRESHOLD_MS']
MAX_QUERIES_PER_REQUEST = MONITORING['MAX_QUERIES_PER_REQUEST']
MEMORY_THRESHOLD_MB = MONITORING['MEMORY_THRESHOLD_MB']
ENABLE_METRICS_COLLECTION = MONITORING['ENABLE_METRICS_COLLECTION']

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000