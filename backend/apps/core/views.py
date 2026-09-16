"""
Core views for error handling and monitoring.
"""
from apps.core.monitoring import get_system_metrics, get_application_metrics
from apps.core.database import get_database_health_check
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import connection
import logging
import time

logger = logging.getLogger(__name__)


def bad_request_view(request, exception):
    """Custom 400 error handler."""
    logger.warning(
        f"Bad Request: {request.method} {request.path}",
        extra={
            'status_code': 400,
            'method': request.method,
            'path': request.path,
            'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
            'ip_address': get_client_ip(request),
            'exception': str(exception)
        }
    )
    
    return JsonResponse({
        'error': True,
        'message': 'Bad Request',
        'status_code': 400,
        'details': str(exception) if settings.DEBUG else 'Invalid request format'
    }, status=400)


def permission_denied_view(request, exception):
    """Custom 403 error handler."""
    logger.warning(
        f"Permission Denied: {request.method} {request.path}",
        extra={
            'status_code': 403,
            'method': request.method,
            'path': request.path,
            'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
            'ip_address': get_client_ip(request),
            'exception': str(exception)
        }
    )
    
    return JsonResponse({
        'error': True,
        'message': 'Permission Denied',
        'status_code': 403,
        'details': 'You do not have permission to access this resource'
    }, status=403)


def not_found_view(request, exception):
    """Custom 404 error handler."""
    logger.info(
        f"Not Found: {request.method} {request.path}",
        extra={
            'status_code': 404,
            'method': request.method,
            'path': request.path,
            'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
            'ip_address': get_client_ip(request)
        }
    )
    
    return JsonResponse({
        'error': True,
        'message': 'Not Found',
        'status_code': 404,
        'details': 'The requested resource was not found'
    }, status=404)


def server_error_view(request):
    """Custom 500 error handler."""
    logger.error(
        f"Server Error: {request.method} {request.path}",
        extra={
            'status_code': 500,
            'method': request.method,
            'path': request.path,
            'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
            'ip_address': get_client_ip(request)
        },
        exc_info=True
    )
    
    return JsonResponse({
        'error': True,
        'message': 'Internal Server Error',
        'status_code': 500,
        'details': 'An internal server error occurred' if not settings.DEBUG else 'Check server logs for details'
    }, status=500)


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@csrf_exempt
@require_http_methods(["GET"])
def status_view(request):
    """Simple status endpoint."""
    return JsonResponse({
        'status': 'ok',
        'environment': getattr(settings, 'ENVIRONMENT', 'unknown'),
        'debug': settings.DEBUG
    })


# ===== MONITORING ENDPOINTS =====

@csrf_exempt
@require_http_methods(["GET"])
@cache_page(60)  # Cache for 1 minute
def health_check(request):
    """Comprehensive health check endpoint."""
    start_time = time.time()
    
    try:
        # Test database connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        db_status = "healthy"
        db_response_time = time.time() - start_time
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
        db_response_time = time.time() - start_time
        
        return JsonResponse({
            'status': 'unhealthy',
            'timestamp': time.time(),
            'database': {'status': db_status, 'response_time': db_response_time},
            'message': 'Database connectivity failed'
        }, status=503)
    
    # Get system metrics
    try:
        system_metrics = get_system_metrics()
        app_metrics = get_application_metrics()
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        system_metrics = {}
        app_metrics = {}
    
    return JsonResponse({
        'status': 'healthy',
        'timestamp': time.time(),
        'database': {
            'status': db_status,
            'response_time': round(db_response_time * 1000, 2)  # ms
        },
        'system': system_metrics,
        'application': app_metrics,
        'environment': getattr(settings, 'ENVIRONMENT', 'unknown'),
        'debug': settings.DEBUG
    })


@csrf_exempt
@require_http_methods(["GET"])
def ready_check(request):
    """Kubernetes-style readiness probe."""
    try:
        # Test database
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        return JsonResponse({'status': 'ready'})
    except Exception:
        return JsonResponse({'status': 'not ready'}, status=503)


@csrf_exempt
@require_http_methods(["GET"])
def alive_check(request):
    """Kubernetes-style liveness probe."""
    return JsonResponse({'status': 'alive'})


class DatabaseMetricsView(APIView):
    """Database performance metrics endpoint."""
    permission_classes = [IsAuthenticated]
    
    @method_decorator(cache_page(30))  # Cache for 30 seconds
    def get(self, request):
        """Get comprehensive database metrics."""
        try:
            db_health = get_database_health_check()
            return Response({
                'status': 'success',
                'data': db_health,
                'timestamp': time.time()
            })
        except Exception as e:
            logger.error(f"Database metrics collection failed: {e}")
            return Response({
                'status': 'error',
                'message': 'Failed to collect database metrics',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SystemMetricsView(APIView):
    """System performance metrics endpoint."""
    permission_classes = [IsAuthenticated]
    
    @method_decorator(cache_page(30))  # Cache for 30 seconds
    def get(self, request):
        """Get system performance metrics."""
        try:
            system_metrics = get_system_metrics()
            app_metrics = get_application_metrics()
            
            return Response({
                'status': 'success',
                'data': {
                    'system': system_metrics,
                    'application': app_metrics
                },
                'timestamp': time.time()
            })
        except Exception as e:
            logger.error(f"System metrics collection failed: {e}")
            return Response({
                'status': 'error',
                'message': 'Failed to collect system metrics',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@require_http_methods(["GET"])
def metrics_prometheus(request):
    """Prometheus-style metrics endpoint."""
    try:
        system_metrics = get_system_metrics()
        db_health = get_database_health_check()
        
        # Format metrics in Prometheus format
        metrics = []
        
        # System metrics
        if 'cpu_percent' in system_metrics:
            metrics.append(f'system_cpu_percent {system_metrics["cpu_percent"]}')
        if 'memory_percent' in system_metrics:
            metrics.append(f'system_memory_percent {system_metrics["memory_percent"]}')
        if 'disk_percent' in system_metrics:
            metrics.append(f'system_disk_percent {system_metrics["disk_percent"]}')
        
        # Database metrics
        if 'health_score' in db_health:
            metrics.append(f'database_health_score {db_health["health_score"]}')
        
        db_stats = db_health.get('statistics', {})
        if 'cache_hit_ratio' in db_stats:
            metrics.append(f'database_cache_hit_ratio {db_stats["cache_hit_ratio"]}')
        if 'total_connections' in db_stats:
            metrics.append(f'database_connections_total {db_stats["total_connections"]}')
        if 'active_connections' in db_stats:
            metrics.append(f'database_connections_active {db_stats["active_connections"]}')
        
        response_content = '\n'.join(metrics) + '\n'
        
        return JsonResponse({
            'metrics': response_content
        }, content_type='text/plain')
        
    except Exception as e:
        logger.error(f"Prometheus metrics collection failed: {e}")
        return JsonResponse({'error': str(e)}, status=500)