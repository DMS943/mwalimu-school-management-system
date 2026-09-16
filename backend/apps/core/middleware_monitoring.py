"""
Monitoring middleware for performance and request tracking.
"""
import time
import logging
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from .logging import performance_logger, security_logger

logger = logging.getLogger(__name__)


class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """
    Middleware to monitor request performance and log slow requests.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.slow_request_threshold = getattr(settings, 'SLOW_REQUEST_THRESHOLD_MS', 1000)
    
    def process_request(self, request):
        """Start timing the request."""
        request.start_time = time.time()
        return None
    
    def process_response(self, request, response):
        """Log request performance metrics."""
        if hasattr(request, 'start_time'):
            duration_ms = round((time.time() - request.start_time) * 1000, 2)
            
            # Log performance metrics
            log_data = {
                'request_id': getattr(request, 'id', None),
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration_ms': duration_ms,
                'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
                'content_length': response.get('Content-Length', 0),
                'query_count': getattr(request, 'query_count', 0) if hasattr(request, 'query_count') else 0
            }
            
            # Log all requests for analytics
            logger.info(f"Request completed: {request.method} {request.path}", extra=log_data)
            
            # Log slow requests separately
            if duration_ms > self.slow_request_threshold:
                performance_logger.log_slow_request(
                    request_path=request.path,
                    method=request.method,
                    execution_time=duration_ms,
                    user=request.user if hasattr(request, 'user') else None,
                    status_code=response.status_code
                )
            
            # Add performance headers for debugging
            if settings.DEBUG:
                response['X-Response-Time'] = f"{duration_ms}ms"
                response['X-Query-Count'] = str(log_data['query_count'])
        
        return response


class DatabaseQueryCounterMiddleware(MiddlewareMixin):
    """
    Middleware to count database queries per request.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.query_threshold = getattr(settings, 'MAX_QUERIES_PER_REQUEST', 50)
    
    def process_request(self, request):
        """Initialize query counter."""
        from django.db import connection
        request.query_count_start = len(connection.queries)
        return None
    
    def process_response(self, request, response):
        """Count and log database queries."""
        if hasattr(request, 'query_count_start'):
            from django.db import connection
            
            query_count = len(connection.queries) - request.query_count_start
            request.query_count = query_count
            
            # Log excessive queries
            if query_count > self.query_threshold:
                logger.warning(
                    f"High query count: {request.method} {request.path} ({query_count} queries)",
                    extra={
                        'method': request.method,
                        'path': request.path,
                        'query_count': query_count,
                        'threshold': self.query_threshold,
                        'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
                    }
                )
            
            # Add query count header in debug mode
            if settings.DEBUG:
                response['X-Query-Count'] = str(query_count)
        
        return response


class SecurityEventMiddleware(MiddlewareMixin):
    """
    Middleware to log security-relevant events.
    """
    
    def process_response(self, request, response):
        """Log security events based on response codes."""
        
        # Log authentication events
        if request.path.startswith('/api/auth/'):
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            client_ip = self.get_client_ip(request)
            
            if request.path.endswith('/login/') and request.method == 'POST':
                username = request.POST.get('username', '') or request.data.get('username', '') if hasattr(request, 'data') else ''
                success = response.status_code == 200
                
                security_logger.log_login_attempt(
                    username=username,
                    success=success,
                    ip_address=client_ip,
                    user_agent=user_agent
                )
        
        # Log permission denied events
        if response.status_code == 403:
            logger.warning(
                f"Permission denied: {request.method} {request.path}",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
                    'ip_address': self.get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')
                }
            )
        
        # Log suspicious 404 patterns
        if response.status_code == 404 and self.is_suspicious_404(request.path):
            logger.warning(
                f"Suspicious 404: {request.method} {request.path}",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'ip_address': self.get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'reason': 'suspicious_path'
                }
            )
        
        return response
    
    def get_client_ip(self, request):
        """Get client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_suspicious_404(self, path):
        """Check if 404 path looks suspicious."""
        suspicious_patterns = [
            'admin', 'wp-admin', 'phpmyadmin', 'mysql', 'sql',
            '.php', '.asp', '.aspx', '.jsp',
            'config', 'backup', 'test', 'debug',
            'shell', 'webshell', 'cmd', 'shell.php'
        ]
        
        path_lower = path.lower()
        return any(pattern in path_lower for pattern in suspicious_patterns)


class ResponseHeaderMiddleware(MiddlewareMixin):
    """
    Add monitoring and debugging headers to responses.
    """
    
    def process_response(self, request, response):
        """Add custom headers for monitoring."""
        
        # Add server identifier (useful for load balancing)
        response['X-Server-ID'] = getattr(settings, 'SERVER_ID', 'unknown')
        
        # Add environment identifier
        response['X-Environment'] = getattr(settings, 'ENVIRONMENT', 'unknown')
        
        # Add request ID for tracing
        if hasattr(request, 'id'):
            response['X-Request-ID'] = request.id
        
        # Add cache status headers
        if hasattr(response, 'cache_status'):
            response['X-Cache-Status'] = response.cache_status
        
        # Remove sensitive headers in production
        if not settings.DEBUG:
            headers_to_remove = ['X-Django-Version', 'Server']
            for header in headers_to_remove:
                if header in response:
                    del response[header]
        
        return response


class MemoryUsageMiddleware(MiddlewareMixin):
    """
    Monitor memory usage per request.
    """
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.memory_threshold_mb = getattr(settings, 'MEMORY_THRESHOLD_MB', 100)
        
        try:
            import psutil
            self.psutil_available = True
        except ImportError:
            self.psutil_available = False
            logger.warning("psutil not available - memory monitoring disabled")
    
    def process_request(self, request):
        """Record initial memory usage."""
        if self.psutil_available:
            import psutil
            process = psutil.Process()
            request.memory_start = process.memory_info().rss
        return None
    
    def process_response(self, request, response):
        """Check memory usage after request."""
        if self.psutil_available and hasattr(request, 'memory_start'):
            import psutil
            process = psutil.Process()
            memory_end = process.memory_info().rss
            memory_used_mb = (memory_end - request.memory_start) / 1024 / 1024
            
            # Log high memory usage
            if memory_used_mb > self.memory_threshold_mb:
                logger.warning(
                    f"High memory usage: {request.method} {request.path} ({memory_used_mb:.2f}MB)",
                    extra={
                        'method': request.method,
                        'path': request.path,
                        'memory_used_mb': round(memory_used_mb, 2),
                        'threshold_mb': self.memory_threshold_mb,
                        'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
                    }
                )
            
            # Add memory header in debug mode
            if settings.DEBUG:
                response['X-Memory-Used'] = f"{memory_used_mb:.2f}MB"
        
        return response