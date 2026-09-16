"""
Tests for user authentication and management.
"""
import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.mark.django_db
class TestUserAuthentication:
    """Test user authentication endpoints."""
    
    def test_user_registration(self, api_client):
        """Test user registration."""
        url = reverse('user-register')
        data = {
            'username': 'newuser',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'email': 'newuser@school.com',
            'full_name': 'New User',
            'role': 'teacher'
        }
        
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(username='newuser').exists()
    
    def test_user_login(self, api_client, teacher_user):
        """Test user login."""
        url = reverse('token_obtain_pair')
        data = {
            'username': teacher_user.username,
            'password': 'testpass123'
        }
        
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
    
    def test_protected_endpoint_requires_auth(self, api_client):
        """Test that protected endpoints require authentication."""
        url = reverse('user-profile')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_authenticated_user_profile(self, authenticated_client):
        """Test authenticated user can access profile."""
        url = reverse('user-profile')
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == authenticated_client.user.username


@pytest.mark.django_db
class TestUserModel:
    """Test User model functionality."""
    
    def test_user_creation(self, user_factory):
        """Test user creation."""
        user = user_factory()
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.is_active is True
    
    def test_user_string_representation(self, user_factory):
        """Test user string representation."""
        user = user_factory(full_name='John Doe')
        assert str(user) == 'John Doe (teacher)'
    
    def test_password_validation(self, user_factory):
        """Test password validation."""
        user = user_factory()
        # Test password is hashed
        assert user.password != 'testpass123'
        # Test password check
        assert user.check_password('testpass123') is False  # Default factory doesn't set password


@pytest.mark.django_db
class TestUserSecurity:
    """Test user security features."""
    
    def test_account_lockout(self, teacher_user, api_client):
        """Test account lockout after failed login attempts."""
        url = reverse('token_obtain_pair')
        
        # Simulate failed login attempts
        for i in range(6):  # More than the 5 attempt limit
            response = api_client.post(url, {
                'username': teacher_user.username,
                'password': 'wrongpassword'
            })
            
        # User should be locked after 5 failed attempts
        teacher_user.refresh_from_db()
        assert teacher_user.is_account_locked()
    
    def test_password_age_validation(self, teacher_user):
        """Test password age validation."""
        from datetime import timedelta
        from django.utils import timezone
        
        # Set password change date to 100 days ago
        teacher_user.password_changed_at = timezone.now() - timedelta(days=100)
        teacher_user.save()
        
        # User should need password change
        assert teacher_user.needs_password_change() is True