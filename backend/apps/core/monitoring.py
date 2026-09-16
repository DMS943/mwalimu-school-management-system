"""
Monitoring and health check utilities for the School Management System.
"""
import logging
import time
import psutil
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache
from django.db import connection
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
import json

logger = logging.getLogger(__name__)
User = get_user_model()


class SystemMetrics:
    """Collect system performance metrics."""
    
    @staticmethod
    def get_memory_usage():
        """Get memory usage information."""
        memory = psutil.virtual_memory()
        return {
            'total': memory.total,
            'available': memory.available,
            'percent': memory.percent,
            'used': memory.used,
            'free': memory.free
        }
    
    @staticmethod
    def get_cpu_usage():
        """Get CPU usage information."""
        return {
            'percent': psutil.cpu_percent(interval=1),
            'count': psutil.cpu_count(),
            'load_avg': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
        }
    
    @staticmethod
    def get_disk_usage():
        """Get disk usage information."""
        disk = psutil.disk_usage('/')
        return {
            'total': disk.total,
            'used': disk.used,
            'free': disk.free,
            'percent': disk.percent
        }
    
    @staticmethod
    def get_network_stats():
        """Get network statistics."""
        net_io = psutil.net_io_counters()
        return {
            'bytes_sent': net_io.bytes_sent,
            'bytes_recv': net_io.bytes_recv,
            'packets_sent': net_io.packets_sent,
            'packets_recv': net_io.packets_recv
        }


class DatabaseMetrics:
    """Database performance metrics."""
    
    @staticmethod
    def get_connection_info():
        """Get database connection information."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()[0]
                
                # Get connection count (PostgreSQL specific)
                cursor.execute("""
                    SELECT count(*) 
                    FROM pg_stat_activity 
                    WHERE state = 'active'
                """)
                active_connections = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT count(*) 
                    FROM pg_stat_activity
                """)
                total_connections = cursor.fetchone()[0]
                
                return {
                    'version': version,
                    'active_connections': active_connections,
                    'total_connections': total_connections,
                    'status': 'healthy'
                }
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': str(e)
            }
    
    @staticmethod
    def get_query_stats():
        """Get database query statistics."""
        try:
            with connection.cursor() as cursor:
                # Get database size
                cursor.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database()))
                """)
                db_size = cursor.fetchone()[0]
                
                # Get table sizes
                cursor.execute("""
                    SELECT 
                        schemaname,
                        tablename,
                        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                    FROM pg_tables 
                    WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
                    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
                    LIMIT 5
                """)
                table_sizes = cursor.fetchall()
                
                return {
                    'database_size': db_size,
                    'largest_tables': [
                        {'schema': row[0], 'table': row[1], 'size': row[2]}
                        for row in table_sizes
                    ]
                }
        except Exception as e:
            logger.error(f"Database stats collection failed: {str(e)}")
            return {'error': str(e)}


class ApplicationMetrics:
    """Application-specific metrics."""
    
    @staticmethod
    def get_user_stats():
        """Get user statistics."""
        try:
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            recent_logins = User.objects.filter(
                last_login__gte=timezone.now() - timezone.timedelta(days=7)
            ).count()
            
            # Users by role
            role_stats = {}
            for role, _ in User.ROLE_CHOICES:
                role_stats[role] = User.objects.filter(role=role, is_active=True).count()
            
            return {
                'total_users': total_users,
                'active_users': active_users,
                'recent_logins_7d': recent_logins,
                'users_by_role': role_stats,
                'locked_accounts': User.objects.filter(
                    account_locked_until__gt=timezone.now()
                ).count()
            }
        except Exception as e:
            logger.error(f"User stats collection failed: {str(e)}")
            return {'error': str(e)}
    
    @staticmethod
    def get_student_stats():
        """Get student statistics."""
        try:
            from apps.students.models import Student
            
            total_students = Student.objects.count()
            active_students = Student.objects.filter(is_active=True).count()
            
            return {
                'total_students': total_students,
                'active_students': active_students,
            }
        except Exception as e:
            logger.error(f"Student stats collection failed: {str(e)}")
            return {'error': str(e)}


@never_cache
@require_http_methods(["GET"])
def health_check(request):
    """
    Comprehensive health check endpoint.
    Returns HTTP 200 if system is healthy, 503 if unhealthy.
    """
    start_time = time.time()
    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'checks': {}
    }
    
    # Database health check
    try:
        db_info = DatabaseMetrics.get_connection_info()
        health_status['checks']['database'] = db_info
        if db_info.get('status') != 'healthy':
            health_status['status'] = 'unhealthy'
    except Exception as e:
        health_status['checks']['database'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
        health_status['status'] = 'unhealthy'
    
    # Cache health check
    try:
        cache_key = 'health_check_test'
        cache.set(cache_key, 'ok', 10)
        cache_result = cache.get(cache_key)
        cache.delete(cache_key)
        
        health_status['checks']['cache'] = {
            'status': 'healthy' if cache_result == 'ok' else 'unhealthy'
        }
        if cache_result != 'ok':
            health_status['status'] = 'unhealthy'
    except Exception as e:
        health_status['checks']['cache'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
        health_status['status'] = 'unhealthy'
    
    # System resources check
    try:
        memory = SystemMetrics.get_memory_usage()
        cpu = SystemMetrics.get_cpu_usage()
        disk = SystemMetrics.get_disk_usage()
        
        # Check if resources are critically low
        resource_status = 'healthy'
        warnings = []
        
        if memory['percent'] > 90:
            resource_status = 'unhealthy'
            warnings.append('High memory usage')
        elif memory['percent'] > 80:
            warnings.append('Elevated memory usage')
        
        if disk['percent'] > 90:
            resource_status = 'unhealthy'
            warnings.append('High disk usage')
        elif disk['percent'] > 80:
            warnings.append('Elevated disk usage')
        
        if cpu['percent'] > 90:
            resource_status = 'unhealthy'
            warnings.append('High CPU usage')
        elif cpu['percent'] > 80:
            warnings.append('Elevated CPU usage')
        
        health_status['checks']['system_resources'] = {
            'status': resource_status,
            'memory_percent': memory['percent'],
            'cpu_percent': cpu['percent'],
            'disk_percent': disk['percent'],
            'warnings': warnings
        }
        
        if resource_status == 'unhealthy':
            health_status['status'] = 'unhealthy'
    
    except Exception as e:
        health_status['checks']['system_resources'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
        health_status['status'] = 'unhealthy'
    
    # Response time check
    response_time = round((time.time() - start_time) * 1000, 2)
    health_status['response_time_ms'] = response_time
    
    if response_time > 5000:  # 5 seconds
        health_status['status'] = 'unhealthy'
    
    # Log health check results
    logger.info(
        f"Health check completed: {health_status['status']}",
        extra={
            'health_status': health_status['status'],
            'response_time_ms': response_time,
            'checks': health_status['checks']
        }
    )
    
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return JsonResponse(health_status, status=status_code)


@never_cache
@require_http_methods(["GET"])
def metrics_endpoint(request):
    """
    Detailed metrics endpoint for monitoring systems.
    """
    # Check if user has permission to view metrics
    if not request.user.is_authenticated or request.user.role not in ['admin', 'headteacher']:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
    
    start_time = time.time()
    
    metrics = {
        'timestamp': timezone.now().isoformat(),
        'system': {},
        'database': {},
        'application': {},
        'cache': {}
    }
    
    # System metrics
    try:
        metrics['system'] = {
            'memory': SystemMetrics.get_memory_usage(),
            'cpu': SystemMetrics.get_cpu_usage(),
            'disk': SystemMetrics.get_disk_usage(),
            'network': SystemMetrics.get_network_stats()
        }
    except Exception as e:
        metrics['system'] = {'error': str(e)}
        logger.error(f"System metrics collection failed: {str(e)}")
    
    # Database metrics
    try:
        metrics['database'] = {
            'connection_info': DatabaseMetrics.get_connection_info(),
            'query_stats': DatabaseMetrics.get_query_stats()
        }
    except Exception as e:
        metrics['database'] = {'error': str(e)}
        logger.error(f"Database metrics collection failed: {str(e)}")
    
    # Application metrics
    try:
        metrics['application'] = {
            'users': ApplicationMetrics.get_user_stats(),
            'students': ApplicationMetrics.get_student_stats(),
            'environment': settings.ENVIRONMENT if hasattr(settings, 'ENVIRONMENT') else 'unknown'
        }
    except Exception as e:
        metrics['application'] = {'error': str(e)}
        logger.error(f"Application metrics collection failed: {str(e)}")
    
    # Cache metrics
    try:
        # Basic cache test
        cache_key = 'metrics_test'
        test_start = time.time()
        cache.set(cache_key, 'test_value', 10)
        cache.get(cache_key)
        cache.delete(cache_key)
        cache_response_time = round((time.time() - test_start) * 1000, 2)
        
        metrics['cache'] = {
            'status': 'healthy',
            'response_time_ms': cache_response_time
        }
    except Exception as e:
        metrics['cache'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
        logger.error(f"Cache metrics collection failed: {str(e)}")
    
    collection_time = round((time.time() - start_time) * 1000, 2)
    metrics['collection_time_ms'] = collection_time
    
    # Log metrics collection
    logger.info(
        f"Metrics collected successfully",
        extra={
            'collection_time_ms': collection_time,
            'user_id': request.user.id if request.user.is_authenticated else None
        }
    )
    
    return JsonResponse(metrics)


@never_cache
@require_http_methods(["GET"])
def readiness_check(request):
    """
    Readiness check for Kubernetes/container orchestration.
    Checks if the application is ready to serve traffic.
    """
    ready_status = {
        'ready': True,
        'timestamp': timezone.now().isoformat(),
        'checks': {}
    }
    
    # Database readiness
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        ready_status['checks']['database'] = {'status': 'ready'}
    except Exception as e:
        ready_status['checks']['database'] = {
            'status': 'not_ready',
            'error': str(e)
        }
        ready_status['ready'] = False
    
    # Cache readiness
    try:
        cache.set('readiness_test', 'ok', 5)
        cache.get('readiness_test')
        cache.delete('readiness_test')
        ready_status['checks']['cache'] = {'status': 'ready'}
    except Exception as e:
        ready_status['checks']['cache'] = {
            'status': 'not_ready',
            'error': str(e)
        }
        ready_status['ready'] = False
    
    # Settings validation
    try:
        required_settings = ['SECRET_KEY', 'DATABASE_HOST']
        for setting in required_settings:
            if not getattr(settings, setting.replace('_', ''), None):
                raise ValueError(f"Missing required setting: {setting}")
        
        ready_status['checks']['configuration'] = {'status': 'ready'}
    except Exception as e:
        ready_status['checks']['configuration'] = {
            'status': 'not_ready',
            'error': str(e)
        }
        ready_status['ready'] = False
    
    status_code = 200 if ready_status['ready'] else 503
    return JsonResponse(ready_status, status=status_code)


@never_cache
@require_http_methods(["GET"])
def liveness_check(request):
    """
    Liveness check for Kubernetes/container orchestration.
    Basic check to see if the application is alive.
    """
    return JsonResponse({
        'alive': True,
        'timestamp': timezone.now().isoformat(),
        'version': getattr(settings, 'VERSION', 'unknown')
    })