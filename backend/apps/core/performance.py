"""
Performance Optimization System for Mwalimu School Management System.
Database query optimization, N+1 query prevention, and performance monitoring.
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from functools import wraps
from contextlib import contextmanager
from django.db import models, connection, transaction
from django.db.models import Prefetch, Q
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.http import JsonResponse

logger = logging.getLogger('app.performance')


class QueryOptimizer:
    """Database query optimization utilities."""
    
    @staticmethod
    def optimize_queryset(queryset: models.QuerySet, 
                         select_related: List[str] = None,
                         prefetch_related: List[str] = None,
                         only_fields: List[str] = None,
                         defer_fields: List[str] = None) -> models.QuerySet:
        """Apply common query optimizations."""
        
        # Apply select_related for foreign keys
        if select_related:
            queryset = queryset.select_related(*select_related)
        
        # Apply prefetch_related for reverse foreign keys and many-to-many
        if prefetch_related:
            queryset = queryset.prefetch_related(*prefetch_related)
        
        # Load only specific fields
        if only_fields:
            queryset = queryset.only(*only_fields)
        
        # Defer loading of specific fields
        if defer_fields:
            queryset = queryset.defer(*defer_fields)
        
        return queryset
    
    @staticmethod
    def get_students_optimized(school_id: int = None, class_id: int = None) -> models.QuerySet:
        """Optimized query for students with related data."""
        from apps.students.models import Student
        
        queryset = Student.objects.select_related(
            'user',
            'school',
            'current_class'
        ).prefetch_related(
            'enrollments__academic_year',
            'grades__subject',
            'attendances'
        )
        
        if school_id:
            queryset = queryset.filter(school_id=school_id)
        
        if class_id:
            queryset = queryset.filter(current_class_id=class_id)
        
        return queryset
    
    @staticmethod
    def get_academic_performance_optimized(student_ids: List[int] = None) -> Dict:
        """Optimized aggregation for academic performance."""
        from apps.academics.models import Grade, Subject
        
        base_query = Grade.objects.select_related('subject', 'student')
        
        if student_ids:
            base_query = base_query.filter(student_id__in=student_ids)
        
        # Use aggregation to minimize database hits
        performance_data = base_query.values(
            'student_id',
            'subject__name',
            'academic_year'
        ).aggregate(
            avg_score=models.Avg('score'),
            max_score=models.Max('score'),
            min_score=models.Min('score'),
            grade_count=models.Count('id')
        )
        
        return performance_data
    
    @staticmethod
    def bulk_update_optimized(model_class, updates: List[Dict], batch_size: int = 1000):
        """Optimized bulk updates using bulk_update."""
        objects_to_update = []
        
        for update_data in updates:
            obj_id = update_data.pop('id')
            try:
                obj = model_class.objects.get(id=obj_id)
                for field, value in update_data.items():
                    setattr(obj, field, value)
                objects_to_update.append(obj)
            except model_class.DoesNotExist:
                logger.warning(f"Object not found for bulk update: {obj_id}")
        
        # Process in batches
        for i in range(0, len(objects_to_update), batch_size):
            batch = objects_to_update[i:i + batch_size]
            if batch:
                model_class.objects.bulk_update(
                    batch, 
                    fields=list(updates[0].keys()) if updates else []
                )
        
        logger.info(f"Bulk updated {len(objects_to_update)} {model_class.__name__} objects")


class PerformanceMonitor:
    """Monitor and track application performance metrics."""
    
    def __init__(self):
        self.query_tracker = QueryTracker()
        self.response_times = []
        self.slow_queries = []
    
    def track_response_time(self, request, response):
        """Track HTTP response times."""
        if hasattr(request, '_performance_start_time'):
            duration = time.time() - request._performance_start_time
            
            self.response_times.append({
                'path': request.path,
                'method': request.method,
                'duration': duration,
                'timestamp': datetime.now(),
                'user_id': request.user.id if request.user.is_authenticated else None
            })
            
            # Log slow responses
            if duration > getattr(settings, 'SLOW_RESPONSE_THRESHOLD', 2.0):
                logger.warning(f"Slow response: {request.method} {request.path} took {duration:.2f}s")
    
    def get_performance_report(self, hours: int = 24) -> Dict:
        """Generate performance report for specified period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        recent_responses = [
            r for r in self.response_times 
            if r['timestamp'] > cutoff_time
        ]
        
        if not recent_responses:
            return {'message': 'No performance data available'}
        
        durations = [r['duration'] for r in recent_responses]
        
        report = {
            'period_hours': hours,
            'total_requests': len(recent_responses),
            'avg_response_time': sum(durations) / len(durations),
            'max_response_time': max(durations),
            'min_response_time': min(durations),
            'slow_requests': len([d for d in durations if d > 2.0]),
            'query_stats': self.query_tracker.get_stats(),
            'top_slow_endpoints': self._get_slowest_endpoints(recent_responses)
        }
        
        return report
    
    def _get_slowest_endpoints(self, responses: List[Dict], limit: int = 10) -> List[Dict]:
        """Get slowest endpoints from responses."""
        endpoint_stats = {}
        
        for response in responses:
            path = response['path']
            duration = response['duration']
            
            if path not in endpoint_stats:
                endpoint_stats[path] = {
                    'path': path,
                    'count': 0,
                    'total_duration': 0,
                    'max_duration': 0
                }
            
            stats = endpoint_stats[path]
            stats['count'] += 1
            stats['total_duration'] += duration
            stats['max_duration'] = max(stats['max_duration'], duration)
        
        # Calculate average and sort
        for stats in endpoint_stats.values():
            stats['avg_duration'] = stats['total_duration'] / stats['count']
        
        sorted_endpoints = sorted(
            endpoint_stats.values(),
            key=lambda x: x['avg_duration'],
            reverse=True
        )
        
        return sorted_endpoints[:limit]


class QueryTracker:
    """Track database queries for optimization."""
    
    def __init__(self):
        self.queries = []
        self.duplicate_queries = {}
    
    def track_queries(self):
        """Context manager to track queries."""
        return QueryTrackingContext(self)
    
    def analyze_queries(self) -> Dict:
        """Analyze tracked queries for optimization opportunities."""
        if not self.queries:
            return {'message': 'No queries tracked'}
        
        total_queries = len(self.queries)
        total_time = sum(q['duration'] for q in self.queries)
        
        # Find duplicate queries
        query_signatures = {}
        for query in self.queries:
            signature = query['sql'][:100]  # Use first 100 chars as signature
            if signature not in query_signatures:
                query_signatures[signature] = []
            query_signatures[signature].append(query)
        
        duplicates = {k: v for k, v in query_signatures.items() if len(v) > 1}
        
        # Find slow queries
        slow_queries = [q for q in self.queries if q['duration'] > 0.1]  # > 100ms
        
        return {
            'total_queries': total_queries,
            'total_time': total_time,
            'avg_query_time': total_time / total_queries if total_queries > 0 else 0,
            'duplicate_query_groups': len(duplicates),
            'slow_queries': len(slow_queries),
            'slowest_queries': sorted(slow_queries, key=lambda x: x['duration'], reverse=True)[:5]
        }
    
    def get_stats(self) -> Dict:
        """Get query statistics."""
        return self.analyze_queries()


class QueryTrackingContext:
    """Context manager for tracking database queries."""
    
    def __init__(self, tracker: QueryTracker):
        self.tracker = tracker
        self.initial_query_count = 0
    
    def __enter__(self):
        self.initial_query_count = len(connection.queries)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        new_queries = connection.queries[self.initial_query_count:]
        
        for query in new_queries:
            self.tracker.queries.append({
                'sql': query['sql'],
                'duration': float(query['time']),
                'timestamp': datetime.now()
            })


def performance_monitor(track_queries: bool = False):
    """Decorator to monitor function performance."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            if track_queries:
                query_tracker = QueryTracker()
                with query_tracker.track_queries():
                    result = func(*args, **kwargs)
                
                # Log query analysis
                query_stats = query_tracker.analyze_queries()
                if query_stats.get('duplicate_query_groups', 0) > 0:
                    logger.warning(f"Function {func.__name__} has duplicate queries: {query_stats}")
            else:
                result = func(*args, **kwargs)
            
            duration = time.time() - start_time
            
            # Log slow functions
            if duration > 1.0:  # > 1 second
                logger.warning(f"Slow function: {func.__name__} took {duration:.2f}s")
            
            return result
            
        return wrapper
    return decorator


class DatabaseOptimizationMiddleware:
    """Middleware for database query optimization."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.performance_monitor = PerformanceMonitor()
    
    def __call__(self, request):
        # Start performance tracking
        request._performance_start_time = time.time()
        request._query_count_start = len(connection.queries)
        
        response = self.get_response(request)
        
        # Track performance metrics
        self.performance_monitor.track_response_time(request, response)
        
        # Check for N+1 queries
        query_count = len(connection.queries) - request._query_count_start
        if query_count > getattr(settings, 'MAX_QUERIES_PER_REQUEST', 50):
            logger.warning(f"High query count: {query_count} queries for {request.path}")
        
        # Add performance headers in debug mode
        if settings.DEBUG:
            response['X-Query-Count'] = str(query_count)
            response['X-Response-Time'] = f"{time.time() - request._performance_start_time:.3f}s"
        
        return response


@contextmanager
def optimized_bulk_operations():
    """Context manager for optimized bulk operations."""
    with transaction.atomic():
        # Disable auto-commit for better performance
        connection.cursor().execute('SET autocommit = 0')
        try:
            yield
        finally:
            connection.cursor().execute('SET autocommit = 1')


class CacheWarmupManager:
    """Manager for cache warming strategies."""
    
    @staticmethod
    def warm_student_caches(school_id: int = None):
        """Warm up frequently accessed student data."""
        logger.info("Warming student caches...")
        
        from apps.students.models import Student
        
        queryset = QueryOptimizer.get_students_optimized(school_id)
        
        # Cache student lists
        cache_key = f"students:school:{school_id}" if school_id else "students:all"
        student_data = list(queryset.values(
            'id', 'user__first_name', 'user__last_name', 
            'school__name', 'current_class__name'
        ))
        cache.set(cache_key, student_data, timeout=3600)  # 1 hour
        
        logger.info(f"Warmed cache for {len(student_data)} students")
    
    @staticmethod
    def warm_academic_caches(academic_year: str = None):
        """Warm up academic performance caches."""
        logger.info("Warming academic caches...")
        
        from apps.academics.models import Grade, Subject
        
        # Cache subject data
        subjects = list(Subject.objects.values('id', 'name', 'code'))
        cache.set('subjects:all', subjects, timeout=7200)  # 2 hours
        
        # Cache grade statistics by subject
        if academic_year:
            grade_stats = Grade.objects.filter(
                academic_year=academic_year
            ).values('subject_id').annotate(
                avg_grade=models.Avg('score'),
                count=models.Count('id')
            )
            cache.set(f'grade_stats:{academic_year}', list(grade_stats), timeout=3600)
        
        logger.info("Academic caches warmed up")
    
    @staticmethod
    def warm_school_caches():
        """Warm up school-related caches."""
        logger.info("Warming school caches...")
        
        from apps.schools.models import School, Class
        
        # Cache school data
        schools = list(School.objects.values('id', 'name', 'address'))
        cache.set('schools:all', schools, timeout=7200)
        
        # Cache class data by school
        for school in schools:
            classes = list(Class.objects.filter(
                school_id=school['id']
            ).values('id', 'name', 'grade_level'))
            cache.set(f'classes:school:{school["id"]}', classes, timeout=3600)
        
        logger.info("School caches warmed up")


# Global performance monitor instance
performance_monitor_instance = PerformanceMonitor()