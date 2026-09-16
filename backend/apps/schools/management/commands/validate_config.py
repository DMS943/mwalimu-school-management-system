"""
Django management command to validate environment configuration.
Usage: python manage.py validate_config
"""
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from decouple import config
import os
import sys
from django.db import connection
from django.core.cache import cache


class Command(BaseCommand):
    help = 'Validate environment configuration for production readiness'

    def add_arguments(self, parser):
        parser.add_argument(
            '--environment',
            type=str,
            help='Environment to validate (development, staging, production)',
            default='development'
        )
        parser.add_argument(
            '--strict',
            action='store_true',
            help='Fail on warnings in addition to errors',
        )

    def handle(self, *args, **options):
        environment = options['environment'].lower()
        strict = options['strict']
        
        self.stdout.write(
            self.style.SUCCESS(f'🔍 Validating configuration for {environment} environment...\n')
        )
        
        errors = []
        warnings = []
        
        # Basic configuration validation
        errors.extend(self.validate_basic_config(environment))
        warnings.extend(self.check_basic_warnings(environment))
        
        # Database validation
        db_errors, db_warnings = self.validate_database()
        errors.extend(db_errors)
        warnings.extend(db_warnings)
        
        # Cache validation (if configured)
        cache_errors, cache_warnings = self.validate_cache()
        errors.extend(cache_errors)
        warnings.extend(cache_warnings)
        
        # Environment-specific validation
        if environment in ['staging', 'production']:
            prod_errors, prod_warnings = self.validate_production_config()
            errors.extend(prod_errors)
            warnings.extend(prod_warnings)
        
        # Report results
        self.report_results(errors, warnings, strict)

    def validate_basic_config(self, environment):
        """Validate basic configuration requirements."""
        errors = []
        
        # Required settings for all environments
        required_settings = [
            'SECRET_KEY',
            'DATABASE_NAME',
            'DATABASE_USER',
            'DATABASE_HOST',
        ]
        
        # Additional required settings for production/staging
        if environment in ['staging', 'production']:
            required_settings.extend([
                'DATABASE_PASSWORD',
                'ALLOWED_HOSTS',
            ])
        
        for setting in required_settings:
            try:
                value = config(setting)
                if not value:
                    errors.append(f'❌ {setting} is empty or not set')
            except Exception:
                errors.append(f'❌ {setting} is not configured')
        
        # Validate SECRET_KEY strength
        try:
            secret_key = config('SECRET_KEY')
            if len(secret_key) < 50:
                errors.append('❌ SECRET_KEY should be at least 50 characters long')
            if secret_key == 'django-insecure-change-this-in-production':
                errors.append('❌ SECRET_KEY is using default insecure value')
        except Exception:
            pass
        
        return errors

    def check_basic_warnings(self, environment):
        """Check for configuration warnings."""
        warnings = []
        
        # Debug mode warnings
        if environment in ['staging', 'production'] and settings.DEBUG:
            warnings.append('⚠️  DEBUG is True in production environment')
        
        # CORS warnings
        if hasattr(settings, 'CORS_ALLOW_ALL_ORIGINS') and settings.CORS_ALLOW_ALL_ORIGINS:
            if environment in ['staging', 'production']:
                warnings.append('⚠️  CORS_ALLOW_ALL_ORIGINS is True in production environment')
        
        return warnings

    def validate_database(self):
        """Validate database connectivity and configuration."""
        errors = []
        warnings = []
        
        try:
            # Test database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                if result[0] == 1:
                    self.stdout.write('✅ Database connection successful')
                else:
                    errors.append('❌ Database connection test failed')
        except Exception as e:
            errors.append(f'❌ Database connection failed: {str(e)}')
        
        # Check database configuration
        db_config = settings.DATABASES['default']
        
        if not db_config.get('OPTIONS', {}).get('sslmode'):
            if config('ENVIRONMENT', default='development') in ['staging', 'production']:
                warnings.append('⚠️  Database SSL mode not configured for production')
        
        if not db_config.get('CONN_MAX_AGE'):
            warnings.append('⚠️  Database connection pooling (CONN_MAX_AGE) not configured')
        
        return errors, warnings

    def validate_cache(self):
        """Validate cache configuration and connectivity."""
        errors = []
        warnings = []
        
        try:
            # Test cache connection
            cache.set('config_test', 'test_value', 30)
            if cache.get('config_test') == 'test_value':
                self.stdout.write('✅ Cache connection successful')
                cache.delete('config_test')
            else:
                warnings.append('⚠️  Cache set/get test failed')
        except Exception as e:
            warnings.append(f'⚠️  Cache connection failed: {str(e)}')
        
        return errors, warnings

    def validate_production_config(self):
        """Validate production-specific configuration."""
        errors = []
        warnings = []
        
        # Security settings
        security_settings = [
            ('SECURE_SSL_REDIRECT', True),
            ('SESSION_COOKIE_SECURE', True),
            ('CSRF_COOKIE_SECURE', True),
            ('SECURE_BROWSER_XSS_FILTER', True),
            ('SECURE_CONTENT_TYPE_NOSNIFF', True),
        ]
        
        for setting_name, expected_value in security_settings:
            if not getattr(settings, setting_name, False) == expected_value:
                warnings.append(f'⚠️  {setting_name} should be {expected_value} in production')
        
        # Check HSTS
        if not getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0:
            warnings.append('⚠️  SECURE_HSTS_SECONDS should be set for production')
        
        # Check static files configuration
        if not hasattr(settings, 'STATICFILES_STORAGE'):
            warnings.append('⚠️  STATICFILES_STORAGE not configured for production')
        
        # Check logging configuration
        if not settings.LOGGING.get('handlers'):
            warnings.append('⚠️  No logging handlers configured')
        
        # Check email configuration
        email_backend = getattr(settings, 'EMAIL_BACKEND', '')
        if 'console' in email_backend.lower():
            warnings.append('⚠️  EMAIL_BACKEND is set to console in production')
        
        return errors, warnings

    def report_results(self, errors, warnings, strict):
        """Report validation results."""
        self.stdout.write('\n' + '='*60)
        
        if errors:
            self.stdout.write(self.style.ERROR(f'\n❌ {len(errors)} ERRORS FOUND:'))
            for error in errors:
                self.stdout.write(f'   {error}')
        
        if warnings:
            self.stdout.write(self.style.WARNING(f'\n⚠️  {len(warnings)} WARNINGS FOUND:'))
            for warning in warnings:
                self.stdout.write(f'   {warning}')
        
        if not errors and not warnings:
            self.stdout.write(self.style.SUCCESS('\n🎉 All configuration checks passed!'))
        elif not errors:
            self.stdout.write(self.style.SUCCESS(f'\n✅ No critical errors found. {len(warnings)} warnings to address.'))
        
        self.stdout.write('\n' + '='*60)
        
        # Exit with appropriate code
        if errors or (strict and warnings):
            sys.exit(1)
        else:
            sys.exit(0)