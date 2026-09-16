"""
Performance monitoring views for Mwalimu School Management System.
Provides performance dashboards, metrics, and optimization insights.
"""

import json
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from django.core.cache import cache
from django.db import connection
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from apps.core.performance import performance_monitor_instance, QueryTracker
from apps.core.caching import cache_manager
from apps.core.cdn_optimization import cdn_manager, asset_optimizer
import psutil
import logging

logger = logging.getLogger('app.performance_views')


@method_decorator(staff_member_required, name='dispatch')
class PerformanceDashboardView(LoginRequiredMixin, TemplateView):
    """
    Main performance monitoring dashboard.
    """
    template_name = 'admin/performance_dashboard.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Get performance metrics
        performance_report = performance_monitor_instance.get_performance_report(24)
        
        # Get system metrics
        system_metrics = self.get_system_metrics()
        
        # Get cache statistics
        cache_stats = cache_manager.cache_stats
        
        # Get database statistics
        db_stats = self.get_database_stats()
        
        context.update({
            'performance_report': performance_report,
            'system_metrics': system_metrics,
            'cache_stats': cache_stats,
            'db_stats': db_stats,
            'slow_query_threshold': getattr(settings, 'SLOW_QUERY_THRESHOLD', 0.1),
            'slow_response_threshold': getattr(settings, 'SLOW_RESPONSE_THRESHOLD', 2.0),
        })
        
        return context
    
    def get_system_metrics(self):
        """Get current system resource metrics."""
        try:
            return {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_usage': psutil.disk_usage('/').percent,
                'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None,
                'process_count': len(psutil.pids()),
            }
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return {}
    
    def get_database_stats(self):
        """Get database performance statistics."""
        try:
            with connection.cursor() as cursor:
                # Get database size
                cursor.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;
                """)
                db_size = cursor.fetchone()[0]
                
                # Get connection count
                cursor.execute("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE state = 'active';
                """)
                active_connections = cursor.fetchone()[0]
                
                # Get cache hit ratio
                cursor.execute("""
                    SELECT 
                        sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) as cache_hit_ratio
                    FROM pg_stat_database 
                    WHERE datname = current_database();
                """)
                result = cursor.fetchone()
                cache_hit_ratio = round(result[0], 2) if result and result[0] else 0
                
                return {
                    'database_size': db_size,
                    'active_connections': active_connections,
                    'cache_hit_ratio': cache_hit_ratio,
                    'total_queries': len(connection.queries) if settings.DEBUG else 'N/A'
                }
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {}


class PerformanceAPIView(APIView):
    """
    API endpoint for performance metrics.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get comprehensive performance data."""
        hours = int(request.GET.get('hours', 24))
        
        # Get performance report
        report = performance_monitor_instance.get_performance_report(hours)
        
        # Add real-time metrics
        report['realtime'] = {
            'timestamp': datetime.now().isoformat(),
            'cache_stats': cache_manager.cache_stats,
            'system_resources': self.get_system_resources(),
        }
        
        return Response(report)
    
    def get_system_resources(self):
        """Get current system resource usage."""
        try:
            return {
                'cpu_percent': psutil.cpu_percent(),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_usage': psutil.disk_usage('/').percent,
            }
        except Exception as e:
            logger.error(f"Failed to get system resources: {e}")
            return {}


class CacheManagementAPIView(APIView):
    """
    API endpoint for cache management operations.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get cache statistics and information."""
        stats = cache_manager.cache_stats.copy()
        
        # Add cache size information
        try:
            # This would vary depending on cache backend
            cache_info = cache.get_stats() if hasattr(cache, 'get_stats') else {}
            stats.update(cache_info)
        except Exception as e:
            logger.error(f"Failed to get cache info: {e}")
        
        return Response({
            'statistics': stats,
            'cache_keys_sample': self.get_cache_keys_sample()
        })
    
    def post(self, request):
        """Perform cache operations."""
        action = request.data.get('action')
        
        if action == 'clear_all':
            cache.clear()
            return Response({'message': 'All caches cleared successfully'})
        
        elif action == 'warm_cache':
            from apps.core.performance import CacheWarmupManager
            
            # Warm up different cache types
            CacheWarmupManager.warm_student_caches()
            CacheWarmupManager.warm_academic_caches()
            CacheWarmupManager.warm_school_caches()
            
            return Response({'message': 'Cache warming completed'})
        
        elif action == 'clear_pattern':
            pattern = request.data.get('pattern')
            if pattern:
                cleared_count = cache_manager.clear_pattern(pattern)
                return Response({
                    'message': f'Cleared {cleared_count} keys matching pattern: {pattern}'
                })
            else:
                return Response({'error': 'Pattern is required'}, status=400)
        
        return Response({'error': 'Invalid action'}, status=400)
    
    def get_cache_keys_sample(self, limit=10):
        """Get a sample of cache keys for debugging."""
        # This would depend on the cache backend implementation
        # For Redis, you could use the SCAN command
        try:
            if hasattr(cache_manager.redis_client, 'scan_iter'):
                keys = []
                for key in cache_manager.redis_client.scan_iter(count=limit):
                    keys.append(key)
                    if len(keys) >= limit:
                        break
                return keys
        except Exception as e:
            logger.error(f"Failed to get cache keys sample: {e}")
        
        return []


class QueryAnalysisAPIView(APIView):
    """
    API endpoint for database query analysis.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get query performance analysis."""
        try:
            with connection.cursor() as cursor:
                # Get slow queries (requires pg_stat_statements extension)
                cursor.execute("""
                    SELECT 
                        query,
                        calls,
                        total_time,
                        mean_time,
                        rows,
                        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
                    FROM pg_stat_statements 
                    WHERE calls > 5
                    ORDER BY mean_time DESC 
                    LIMIT 20;
                """)
                
                slow_queries = []
                for row in cursor.fetchall():
                    slow_queries.append({
                        'query': row[0][:200] + '...' if len(row[0]) > 200 else row[0],
                        'calls': row[1],
                        'total_time': round(row[2], 2),
                        'mean_time': round(row[3], 2),
                        'rows': row[4],
                        'cache_hit_percent': round(row[5] or 0, 2)
                    })
                
                # Get index usage statistics
                cursor.execute("""
                    SELECT 
                        schemaname,
                        tablename,
                        idx_tup_read,
                        idx_tup_fetch,
                        idx_scan
                    FROM pg_stat_user_tables 
                    WHERE idx_scan > 0
                    ORDER BY idx_scan DESC
                    LIMIT 10;
                """)
                
                index_stats = []
                for row in cursor.fetchall():
                    index_stats.append({
                        'schema': row[0],
                        'table': row[1],
                        'tuples_read': row[2],
                        'tuples_fetched': row[3],
                        'index_scans': row[4]
                    })
                
                return Response({
                    'slow_queries': slow_queries,
                    'index_statistics': index_stats,
                    'query_count': len(connection.queries) if settings.DEBUG else 'Debug mode required'
                })
                
        except Exception as e:
            logger.error(f"Query analysis failed: {e}")
            return Response({
                'error': 'Query analysis failed. Ensure pg_stat_statements extension is enabled.',
                'details': str(e)
            }, status=500)


class AssetOptimizationAPIView(APIView):
    """
    API endpoint for asset optimization operations.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get asset optimization status."""
        return Response({
            'cdn_enabled': cdn_manager.cdn_enabled,
            'cdn_domain': cdn_manager.cdn_domain,
            'asset_optimization_enabled': getattr(settings, 'ASSET_OPTIMIZATION_ENABLED', False),
            'compress_enabled': getattr(settings, 'COMPRESS_ENABLED', False),
        })
    
    def post(self, request):
        """Perform asset optimization operations."""
        action = request.data.get('action')
        
        if action == 'minify_assets':
            result = asset_optimizer.minify_css_js()
            return Response({
                'message': 'Asset minification completed',
                'result': result
            })
        
        elif action == 'optimize_images':
            result = asset_optimizer.optimize_images()
            return Response({
                'message': 'Image optimization completed',
                'result': result
            })
        
        elif action == 'sync_cdn':
            result = cdn_manager.sync_static_files()
            return Response({
                'message': 'CDN sync completed',
                'result': result
            })
        
        elif action == 'generate_manifest':
            manifest = asset_optimizer.generate_asset_manifest()
            return Response({
                'message': 'Asset manifest generated',
                'manifest_entries': len(manifest)
            })
        
        return Response({'error': 'Invalid action'}, status=400)


# Utility functions for performance monitoring
def get_performance_summary():
    """Get a quick performance summary for admin dashboard."""
    try:
        summary = {
            'status': 'healthy',
            'issues': [],
            'recommendations': []
        }
        
        # Check response times
        report = performance_monitor_instance.get_performance_report(1)  # Last hour
        if report.get('avg_response_time', 0) > 2.0:
            summary['status'] = 'warning'
            summary['issues'].append('High average response time')
        
        # Check cache hit ratio
        cache_stats = cache_manager.cache_stats
        if cache_stats['hits'] + cache_stats['misses'] > 0:
            hit_ratio = cache_stats['hits'] / (cache_stats['hits'] + cache_stats['misses'])
            if hit_ratio < 0.8:  # Less than 80% hit rate
                summary['status'] = 'warning'
                summary['issues'].append('Low cache hit ratio')
                summary['recommendations'].append('Consider cache warming or optimization')
        
        # Check system resources
        try:
            memory_percent = psutil.virtual_memory().percent
            cpu_percent = psutil.cpu_percent()
            
            if memory_percent > 90:
                summary['status'] = 'critical'
                summary['issues'].append('High memory usage')
            elif memory_percent > 80:
                summary['status'] = 'warning'
                summary['issues'].append('Elevated memory usage')
            
            if cpu_percent > 90:
                summary['status'] = 'critical'
                summary['issues'].append('High CPU usage')
        except Exception:
            pass  # psutil not available
        
        return summary
        
    except Exception as e:
        logger.error(f"Failed to generate performance summary: {e}")
        return {
            'status': 'unknown',
            'issues': ['Unable to generate performance summary'],
            'recommendations': ['Check system health manually']
        }