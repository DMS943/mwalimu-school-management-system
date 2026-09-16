"""
Django settings for Mwalimu School Management System.
This file determines which settings to load based on environment.
"""
import os
from decouple import config

# Determine which settings to use
ENVIRONMENT = config('ENVIRONMENT', default='development').lower()

if ENVIRONMENT == 'production':
    from .production import *
elif ENVIRONMENT == 'staging':
    from .staging import *
elif ENVIRONMENT == 'development':
    from .development import *
else:
    # Default to development settings
    from .development import *

# Validate critical settings
def validate_settings():
    """Validate that critical settings are properly configured."""
    import sys
    
    required_settings = []
    
    if ENVIRONMENT in ['production', 'staging']:
        required_settings = [
            'SECRET_KEY',
            'DATABASE_NAME',
            'DATABASE_USER', 
            'DATABASE_PASSWORD',
            'DATABASE_HOST',
            'ALLOWED_HOSTS'
        ]
        
    missing_settings = []
    for setting in required_settings:
        try:
            value = config(setting)
            if not value:
                missing_settings.append(setting)
        except:
            missing_settings.append(setting)
    
    if missing_settings:
        print(f"ERROR: Missing required environment variables: {', '.join(missing_settings)}")
        if ENVIRONMENT in ['production', 'staging']:
            sys.exit(1)

# Run validation
validate_settings()
