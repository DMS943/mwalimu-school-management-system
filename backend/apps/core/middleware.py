"""
Security middleware for the School Management System.
"""
import logging
import time
import uuid
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
import json
import re

logger = logging.getLogger(__name__)
User = get_user_model()


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses.
    """
    
    def process_response(self, request, response):
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        response['Content-Security-Policy'] = csp
        
        # Additional security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # Remove server information
        if 'Server' in response:
            del response['Server']
        
        return response


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Log all requests with security-relevant information.
    """
    
    def process_request(self, request):
        # Generate unique request ID
        request.id = str(uuid.uuid4())
        request.start_time = time.time()
        
        # Log request details
        logger.info(
            f"Request started",
            extra={
                'request_id': request.id,
                'method': request.method,
                'path': request.path,
                'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'Anonymous',
                'ip': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )
    
    def process_response(self, request, response):
        if hasattr(request, 'id'):
            duration = time.time() - request.start_time
            
            logger.info(
                f"Request completed",
                extra={
                    'request_id': request.id,
                    'status_code': response.status_code,
                    'duration_ms': round(duration * 1000, 2),
                    'content_type': response.get('Content-Type', ''),
                }
            )
        
        return response
    
    def get_client_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware to prevent abuse.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.rate_limits = {
            'login': {'requests': 5, 'window': 300},  # 5 requests per 5 minutes
            'api_anon': {'requests': 100, 'window': 3600},  # 100 requests per hour for anonymous users
            'api_user': {'requests': 1000, 'window': 3600},  # 1000 requests per hour for authenticated users
            'password_reset': {'requests': 3, 'window': 3600},  # 3 requests per hour
        }
    
    def process_request(self, request):
        # Skip rate limiting in development
        if settings.DEBUG:
            return None
        
        client_ip = self.get_client_ip(request)
        user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
        
        # Determine rate limit type
        rate_limit_type = self.get_rate_limit_type(request)
        if not rate_limit_type:
            return None
        
        # Create cache key
        cache_key = self.get_cache_key(rate_limit_type, client_ip, user_id)
        
        # Check rate limit
        if self.is_rate_limited(cache_key, rate_limit_type):
            logger.warning(
                f"Rate limit exceeded",
                extra={
                    'ip': client_ip,
                    'user_id': user_id,
                    'rate_limit_type': rate_limit_type,
                    'path': request.path,
                }
            )
            return JsonResponse(
                {
                    'error': True,
                    'message': 'Rate limit exceeded. Please try again later.',
                    'status_code': 429
                },
                status=429
            )
        
        return None
    
    def get_rate_limit_type(self, request):
        """Determine which rate limit to apply."""
        if '/api/auth/login/' in request.path:
            return 'login'
        elif '/api/auth/password-reset/' in request.path:
            return 'password_reset'
        elif request.path.startswith('/api/'):
            if hasattr(request, 'user') and request.user.is_authenticated:
                return 'api_user'
            else:
                return 'api_anon'
        return None
    
    def get_cache_key(self, rate_limit_type, client_ip, user_id):
        """Generate cache key for rate limiting."""
        if user_id:
            return f"rate_limit:{rate_limit_type}:user:{user_id}"
        else:
            return f"rate_limit:{rate_limit_type}:ip:{client_ip}"
    
    def is_rate_limited(self, cache_key, rate_limit_type):
        """Check if the request should be rate limited."""
        config = self.rate_limits[rate_limit_type]
        current_requests = cache.get(cache_key, 0)
        
        if current_requests >= config['requests']:
            return True
        
        # Increment counter
        try:
            cache.set(cache_key, current_requests + 1, config['window'])
        except Exception:
            # If cache fails, allow the request
            pass
        
        return False
    
    def get_client_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class InputValidationMiddleware(MiddlewareMixin):
    """
    Validate and sanitize input to prevent common attacks.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        # Common attack patterns
        self.sql_injection_patterns = [
            r"(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)",
            r"(\bdrop\b\s+\btable\b)|(\bdelete\b\s+\bfrom\b)",
            r"(\binsert\b\s+\binto\b)|(\bupdate\b\s+\bset\b)",
            r"(\bexec\b\s*\()|(\bexecute\b\s*\()",
        ]
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
        ]
        
    def process_request(self, request):
        # Skip validation for safe methods and file uploads
        if request.method in ['GET', 'HEAD', 'OPTIONS'] or request.content_type.startswith('multipart/'):
            return None
        
        # Check request body for attacks
        if hasattr(request, 'body') and request.body:
            try:
                body = request.body.decode('utf-8')
                if self.contains_malicious_content(body):
                    logger.warning(
                        f"Malicious content detected",
                        extra={
                            'ip': self.get_client_ip(request),
                            'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
                            'path': request.path,
                            'method': request.method,
                        }
                    )
                    return JsonResponse(
                        {
                            'error': True,
                            'message': 'Invalid input detected.',
                            'status_code': 400
                        },
                        status=400
                    )
            except (UnicodeDecodeError, AttributeError):
                # Skip validation if body can't be decoded
                pass
        
        # Check query parameters
        for param_name, param_value in request.GET.items():
            if self.contains_malicious_content(param_value):
                logger.warning(
                    f"Malicious query parameter detected: {param_name}",
                    extra={
                        'ip': self.get_client_ip(request),
                        'path': request.path,
                    }
                )
                return JsonResponse(
                    {
                        'error': True,
                        'message': 'Invalid query parameter detected.',
                        'status_code': 400
                    },
                    status=400
                )
        
        return None
    
    def contains_malicious_content(self, content):
        """Check if content contains malicious patterns."""
        content_lower = content.lower()
        
        # Check for SQL injection patterns
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, content_lower, re.IGNORECASE):
                return True
        
        # Check for XSS patterns
        for pattern in self.xss_patterns:
            if re.search(pattern, content_lower, re.IGNORECASE):
                return True
        
        return False
    
    def get_client_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class IPWhitelistMiddleware(MiddlewareMixin):
    """
    IP whitelist middleware for admin access.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.admin_whitelist = getattr(settings, 'ADMIN_IP_WHITELIST', [])
        self.api_whitelist = getattr(settings, 'API_IP_WHITELIST', [])
    
    def process_request(self, request):
        # Skip in development
        if settings.DEBUG:
            return None
        
        client_ip = self.get_client_ip(request)
        
        # Check admin access
        if request.path.startswith('/admin/') and self.admin_whitelist:
            if not self.is_ip_allowed(client_ip, self.admin_whitelist):
                logger.warning(
                    f"Blocked admin access from non-whitelisted IP: {client_ip}",
                    extra={'ip': client_ip, 'path': request.path}
                )
                return JsonResponse(
                    {'error': True, 'message': 'Access denied.'},
                    status=403
                )
        
        # Check API access (if whitelist configured)
        if request.path.startswith('/api/') and self.api_whitelist:
            if not self.is_ip_allowed(client_ip, self.api_whitelist):
                logger.warning(
                    f"Blocked API access from non-whitelisted IP: {client_ip}",
                    extra={'ip': client_ip, 'path': request.path}
                )
                return JsonResponse(
                    {'error': True, 'message': 'API access denied.'},
                    status=403
                )
        
        return None
    
    def is_ip_allowed(self, client_ip, whitelist):
        """Check if IP is in whitelist (supports CIDR notation)."""
        import ipaddress
        
        try:
            client = ipaddress.ip_address(client_ip)
            for allowed in whitelist:
                try:
                    if '/' in allowed:
                        # CIDR notation
                        if client in ipaddress.ip_network(allowed, strict=False):
                            return True
                    else:
                        # Single IP
                        if client == ipaddress.ip_address(allowed):
                            return True
                except (ipaddress.AddressValueError, ValueError):
                    # Invalid IP/network, skip
                    continue
        except ipaddress.AddressValueError:
            # Invalid client IP
            return False
        
        return False
    
    def get_client_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip