#!/usr/bin/env python3
"""
Generate a secure Django SECRET_KEY
"""
import secrets
import string

def generate_secret_key(length=50):
    """Generate a secure random secret key"""
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*(-_=+)'
    return ''.join(secrets.choice(alphabet) for i in range(length))

def generate_django_secret_key():
    """Generate Django-style secret key"""
    from django.core.management.utils import get_random_secret_key
    return get_random_secret_key()

if __name__ == '__main__':
    print("🔐 Django SECRET_KEY Generator")
    print("=" * 50)
    
    # Method 1: Django's built-in generator
    try:
        import django
        from django.core.management.utils import get_random_secret_key
        django_key = get_random_secret_key()
        print(f"Django Built-in Key: {django_key}")
    except ImportError:
        print("Django not available, using alternative method...")
    
    # Method 2: Custom secure generator
    custom_key = generate_secret_key()
    print(f"Custom Secure Key:   {custom_key}")
    
    print("\n💡 Copy one of the keys above and use it as your SECRET_KEY")
    print("⚠️  Keep this key secret and never commit it to version control!")