# Performance Optimization Guide - Mwalimu School Management System

## Overview

This document provides comprehensive guidance on performance optimization strategies implemented in the Mwalimu School Management System, including caching, database optimization, CDN integration, and monitoring.

## Multi-Layer Caching Strategy

### Cache Layers

#### Layer 1: Django Cache (In-Memory)
- **Purpose**: Ultra-fast access for frequently used data
- **Timeout**: 5-15 minutes
- **Use Cases**: User sessions, template fragments, API responses
- **Configuration**: Local memory cache with Redis fallback

#### Layer 2: Redis Cache (Distributed)
- **Purpose**: Persistent, scalable caching across instances
- **Timeout**: 30 minutes to 24 hours
- **Use Cases**: Database query results, computed data, user preferences
- **Configuration**: Redis Cluster with Sentinel for high availability

#### Layer 3: Database Query Cache
- **Purpose**: Cached query results and aggregations
- **Timeout**: 30 minutes to 2 hours
- **Use Cases**: Complex database queries, reports, statistics
- **Configuration**: Dedicated Redis database with query invalidation

### Cache Implementation

```python
# Using the enhanced cache manager
from apps.core.caching import cache_manager

# Cache model method results
@cache_model_method(timeout=3600)
def get_student_statistics(self):
    return {
        'total_students': self.students.count(),
        'active_students': self.students.filter(is_active=True).count()
    }

# Cache query results
@cache_query_result(timeout=1800, key_prefix='student_performance')
def get_performance_data(student_id):
    return Grade.objects.filter(student_id=student_id).aggregate(
        avg_score=models.Avg('score')
    )
```

### Cache Warming Strategies

```bash
# Warm up critical caches
python manage.py optimize_performance cache --warm

# Warm specific data types
python manage.py optimize_performance cache --warm --type students
python manage.py optimize_performance cache --warm --type academics
```

## Database Query Optimization

### Optimized QuerySets

The system provides enhanced QuerySet classes with built-in optimizations:

```python
from apps.core.models import OptimizedModelManager

class Student(BaseModel):
    # Query optimization configurations
    LIST_SELECT_RELATED = ['user', 'school', 'current_class']
    LIST_PREFETCH_RELATED = ['enrollments', 'grades__subject']
    DETAIL_SELECT_RELATED = ['user', 'school', 'current_class', 'parent']
    DETAIL_PREFETCH_RELATED = ['enrollments__academic_year', 'grades', 'attendances']
    
    objects = OptimizedModelManager()
```

### N+1 Query Prevention

```python
# Automatic optimization for common patterns
students = Student.objects.get_optimized(
    select_related=['user', 'school'],
    prefetch_related=['grades__subject']
).filter(school_id=school_id)

# Bulk operations for better performance  
Student.objects.bulk_create_optimized(student_objects, batch_size=1000)
```

### Database Performance Monitoring

```bash
# Analyze slow queries
python manage.py optimize_performance database --analyze

# Run database optimization
python manage.py optimize_performance database --optimize

# Vacuum and analyze database
python manage.py optimize_performance database --vacuum
```

## CDN and Asset Optimization

### CDN Configuration

```python
# settings.py
CDN_ENABLED = True
CDN_DOMAIN = 'cdn.yourschool.com'
AWS_S3_CDN_BUCKET = 'school-assets-cdn'
ASSET_OPTIMIZATION_ENABLED = True
```

### Asset Optimization Pipeline

```bash
# Minify CSS and JavaScript
python manage.py optimize_performance assets --minify

# Optimize images for web
python manage.py optimize_performance assets --optimize-images

# Sync assets to CDN
python manage.py optimize_performance assets --sync-cdn

# Generate asset manifest with hashes
python manage.py optimize_performance assets --generate-manifest
```

### Template Optimization

```html
<!-- Load optimized assets -->
{% load performance_tags %}

<!-- Resource hints for better loading -->
{% resource_hints %}
{% preload_hints %}

<!-- Optimized static files with CDN -->
{% cached_static 'css/main.css' %}
{% cached_static 'js/app.js' %}

<!-- Lazy loading for images -->
<img data-src="{% optimized_image 'photo.jpg' width=300 %}" 
     alt="Photo" class="lazy">

<!-- Lazy loading script -->
{% lazy_load_script %}

<!-- Critical CSS inline -->
{% critical_css %}
```

## Performance Monitoring

### Real-Time Monitoring

The system provides comprehensive performance monitoring:

- **Response Time Tracking**: Monitor API and page response times
- **Database Query Analysis**: Identify slow and duplicate queries
- **Cache Performance**: Track hit/miss ratios and optimization opportunities
- **System Resources**: Monitor CPU, memory, and disk usage

### Performance Dashboard

Access the performance dashboard at `/admin/performance/` (admin users only):

- Real-time performance metrics
- Slow query analysis
- Cache statistics and management
- System resource monitoring
- Asset optimization status

### API Endpoints

```bash
# Get performance metrics
GET /api/performance/metrics/?hours=24

# Cache management operations
POST /api/performance/cache/
{
  "action": "clear_all"  // or "warm_cache", "clear_pattern"
}

# Query analysis
GET /api/performance/queries/

# Asset optimization
POST /api/performance/assets/
{
  "action": "minify_assets"  // or "optimize_images", "sync_cdn"
}
```

## Performance Optimization Commands

### Comprehensive Optimization

```bash
# Run all optimizations
python manage.py optimize_performance optimize-all

# Run specific optimizations
python manage.py optimize_performance optimize-all --exclude cache assets

# Individual optimization types
python manage.py optimize_performance cache --warm --clear
python manage.py optimize_performance database --optimize --analyze
python manage.py optimize_performance assets --minify --optimize-images
python manage.py optimize_performance monitor --report --hours 24
```

### Cache Management

```bash
# Cache operations
python manage.py optimize_performance cache --warm
python manage.py optimize_performance cache --clear
python manage.py optimize_performance cache --stats
python manage.py optimize_performance cache --pattern "student:*"
```

### Database Operations

```bash
# Database optimization
python manage.py optimize_performance database --analyze
python manage.py optimize_performance database --optimize
python manage.py optimize_performance database --vacuum
```

## Performance Best Practices

### Model Optimization

1. **Use Optimized Base Classes**
   ```python
   from apps.core.models import BaseModel, CachedCountMixin
   
   class School(BaseModel, CachedCountMixin):
       # Model implementation with built-in optimizations
   ```

2. **Define Query Optimization Hints**
   ```python
   class Student(BaseModel):
       LIST_SELECT_RELATED = ['user', 'school']
       LIST_PREFETCH_RELATED = ['enrollments']
       DETAIL_SELECT_RELATED = ['user', 'school', 'current_class']
   ```

3. **Use Bulk Operations**
   ```python
   # Efficient bulk updates
   bulk_update_with_cache_invalidation(Student, updates, batch_size=1000)
   
   # Optimized bulk creation
   Student.objects.bulk_create_optimized(students, batch_size=500)
   ```

### View Optimization

1. **Cache Expensive Operations**
   ```python
   from apps.core.performance import performance_monitor
   
   @performance_monitor(track_queries=True)
   def get_student_performance(request, student_id):
       # Method implementation with performance tracking
   ```

2. **Use Optimized Querysets**
   ```python
   def get_queryset(self):
       return Student.objects.prefetch_for_list_view()
   ```

### Template Optimization

1. **Fragment Caching**
   ```html
   {% load cache %}
   {% cache 3600 student_list user.id %}
       <!-- Expensive template content -->
   {% endcache %}
   ```

2. **Lazy Loading**
   ```html
   {% load performance_tags %}
   <img data-src="{{ student.photo.url }}" alt="{{ student.name }}" class="lazy">
   {% lazy_load_script %}
   ```

## Performance Metrics and Targets

### Response Time Targets

| Operation Type | Target (95th percentile) | Alert Threshold |
|----------------|--------------------------|-----------------|
| API Endpoints | < 500ms | > 1000ms |
| Page Loads | < 1000ms | > 2000ms |
| Database Queries | < 100ms | > 200ms |
| Cache Operations | < 10ms | > 50ms |

### Throughput Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Requests/Second | > 100 | < 50 |
| Cache Hit Ratio | > 80% | < 70% |
| Database Connections | < 20 active | > 40 active |
| Memory Usage | < 80% | > 90% |

### Database Performance

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Cache Hit Ratio | > 95% | < 90% |
| Index Usage | > 90% | < 80% |
| Lock Wait Time | < 10ms | > 100ms |
| Query Time | < 100ms avg | > 200ms avg |

## Troubleshooting Performance Issues

### Common Issues and Solutions

#### High Response Times
1. Check slow query log
2. Analyze cache hit ratios
3. Review database query optimization
4. Check system resources (CPU, memory)

#### Memory Issues
1. Review cache size and retention policies
2. Analyze memory leaks in application code
3. Optimize database connection pooling
4. Check for large object allocations

#### Database Performance
1. Run `EXPLAIN ANALYZE` on slow queries
2. Check index usage and optimization
3. Analyze table statistics and vacuum status
4. Review connection pool configuration

### Performance Debugging Tools

```bash
# Enable query tracking in development
export DJANGO_DEBUG=True
export ENABLE_QUERY_TRACKING=True

# Use Django extensions for shell analysis
python manage.py shell_plus --print-sql

# Run performance tests
python manage.py test apps.core.tests.test_performance
```

### Monitoring and Alerting

The system provides automated monitoring with configurable alerts:

- **Slow Response Alerts**: When response times exceed thresholds
- **High Resource Usage**: CPU, memory, or disk usage alerts
- **Cache Performance**: Low hit ratio or high miss rate alerts
- **Database Issues**: Slow queries or connection pool exhaustion

## Production Deployment Optimization

### Recommended Configuration

```bash
# Environment variables for production
CACHE_WARMING_ENABLED=True
QUERY_OPTIMIZATION_ENABLED=True
CDN_ENABLED=True
ASSET_OPTIMIZATION_ENABLED=True
COMPRESS_ENABLED=True
COMPRESS_OFFLINE=True

# Redis configuration
REDIS_URL=redis://redis-cluster:6379/0
REDIS_SENTINEL_HOSTS=host1:26379,host2:26379,host3:26379

# Database optimization
DATABASE_CONN_MAX_AGE=300
DATABASE_OPTIONS='{"CONN_MAX_AGE": 300, "MAX_CONNS": 20}'
```

### Infrastructure Recommendations

1. **Redis Cluster**: For distributed caching with high availability
2. **Database Read Replicas**: For read-heavy workloads
3. **CDN Integration**: AWS CloudFront or Cloudflare
4. **Load Balancing**: Nginx with multiple application instances
5. **Monitoring Stack**: Prometheus + Grafana for metrics visualization

## Continuous Performance Improvement

### Regular Maintenance Tasks

```bash
# Weekly performance review
python manage.py optimize_performance monitor --report --hours 168

# Monthly database optimization
python manage.py optimize_performance database --optimize --vacuum

# Quarterly cache analysis
python manage.py optimize_performance cache --stats --analyze
```

### Performance Testing

```bash
# Load testing with locust
locust -f tests/performance/locustfile.py --host=http://localhost:8000

# Database performance testing
python manage.py test apps.core.tests.test_database_performance

# Cache performance testing  
python manage.py test apps.core.tests.test_cache_performance
```

---

**Last Updated**: December 2024  
**Document Version**: 1.0  
**Review Schedule**: Monthly