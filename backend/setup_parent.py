#!/usr/bin/env python
"""
Quick script to set up a parent user for testing
Run: python setup_parent.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User

# Set password for existing parent user
try:
    user = User.objects.get(username='pmbewe')
    user.set_password('parent123')
    user.save()
    print(f"✓ Password set for parent user: {user.username}")
    print(f"  Username: pmbewe")
    print(f"  Password: parent123")
    print(f"  Full Name: {user.full_name}")
    print(f"  Email: {user.email}")
except User.DoesNotExist:
    print("✗ Parent user 'pmbewe' not found in database")
    print("\nCreating new parent user...")
    user = User.objects.create_user(
        username='testparent',
        email='testparent@example.com',
        password='parent123',
        full_name='Test Parent',
        role='parent'
    )
    print(f"✓ Created new parent user:")
    print(f"  Username: testparent")
    print(f"  Password: parent123")
    print(f"  Full Name: {user.full_name}")
    print(f"  Email: {user.email}")
    print("\nNote: This parent is not linked to any student yet.")
    print("Use the parent signup page to link to a student.")
