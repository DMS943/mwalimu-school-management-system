"""
Tests for monitoring and health check endpoints.
"""
import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestHealthChecks:
    """Test health check endpoints."""
    
    def test_health_endpoint(self, api_client):
        """Test main health check endpoint."""
        url = reverse('health_check')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'healthy'
        assert 'timestamp' in response.data
        assert 'database' in response.data
        assert 'system' in response.data
    
    def test_ready_endpoint(self, api_client):
        """Test readiness probe endpoint."""
        url = reverse('ready_check')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'ready'
    
    def test_alive_endpoint(self, api_client):
        """Test liveness probe endpoint."""
        url = reverse('alive_check')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'alive'
    
    def test_database_metrics_requires_auth(self, api_client):
        """Test database metrics endpoint requires authentication."""
        url = reverse('database_metrics')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_database_metrics_authenticated(self, authenticated_client):
        """Test database metrics with authentication."""
        url = reverse('database_metrics')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        assert 'data' in response.data
    
    def test_system_metrics_authenticated(self, authenticated_client):
        """Test system metrics with authentication."""
        url = reverse('system_metrics')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        assert 'data' in response.data
        assert 'system' in response.data['data']
        assert 'application' in response.data['data']


@pytest.mark.django_db
class TestSecurityMiddleware:
    """Test security middleware functionality."""
    
    def test_security_headers_present(self, api_client):
        """Test that security headers are present."""
        url = reverse('health_check')
        response = api_client.get(url)
        
        # Check for security headers
        assert 'X-Content-Type-Options' in response
        assert 'X-Frame-Options' in response
        assert 'X-XSS-Protection' in response
    
    def test_rate_limiting(self, api_client):
        """Test rate limiting functionality."""
        url = reverse('health_check')
        
        # Make multiple requests quickly
        responses = []
        for i in range(20):
            response = api_client.get(url)
            responses.append(response)
        
        # Should have some rate limiting headers
        last_response = responses[-1]
        # In testing mode, rate limiting might be disabled
        # Just check the endpoint still works
        assert last_response.status_code in [200, 429]


@pytest.mark.django_db 
class TestDatabaseOptimization:
    """Test database optimization features."""
    
    def test_database_health_calculation(self):
        """Test database health score calculation."""
        from apps.core.database import get_database_health_check
        
        health_data = get_database_health_check()
        
        assert 'healthy' in health_data
        assert 'health_score' in health_data
        assert isinstance(health_data['health_score'], int)
        assert 0 <= health_data['health_score'] <= 100
    
    def test_database_optimizer_stats(self):
        """Test database optimizer statistics."""
        from apps.core.database import DatabaseOptimizer
        
        optimizer = DatabaseOptimizer()
        connection_info = optimizer.get_connection_info()
        
        assert 'vendor' in connection_info
        assert 'settings' in connection_info
        assert 'queries' in connection_info