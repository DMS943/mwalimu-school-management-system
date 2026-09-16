"""
Pytest configuration and shared fixtures for the test suite.
"""
import pytest
from django.test import Client
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

# Try to import JWT tokens, but don't fail if not available
try:
    from rest_framework_simplejwt.tokens import RefreshToken
    HAS_JWT = True
except ImportError:
    HAS_JWT = False

User = get_user_model()


@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker):
    """Set up the test database."""
    with django_db_blocker.unblock():
        # Load initial data if needed
        pass


@pytest.fixture
def client():
    """Django test client."""
    return Client()


@pytest.fixture
def api_client():
    """DRF API client."""
    return APIClient()


@pytest.fixture
def test_user(db):
    """Create a basic test user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    return User.objects.create_superuser(
        username='admin',
        email='admin@school.com',
        password='adminpass123'
    )


@pytest.fixture
def authenticated_client(api_client, test_user):
    """API client with authenticated user."""
    if HAS_JWT:
        refresh = RefreshToken.for_user(test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    else:
        # Fallback to session authentication
        api_client.force_authenticate(user=test_user)
    api_client.user = test_user
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """API client with authenticated admin user."""
    if HAS_JWT:
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    else:
        # Fallback to session authentication
        api_client.force_authenticate(user=admin_user)
    api_client.user = admin_user
    return api_client


# Additional fixtures that are safe to use
@pytest.fixture
def multiple_users(db):
    """Create multiple test users."""
    users = []
    for i in range(3):
        user = User.objects.create_user(
            username=f'testuser{i}',
            email=f'test{i}@example.com',
            password='testpass123'
        )
        users.append(user)
    return users


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Grant database access to all tests.
    This fixture is automatically used for all tests.
    """
    pass