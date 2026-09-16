# Monitoring and Observability Guide

This document provides comprehensive guidance on monitoring and observability for the Mwalimu School Management System, including logging, metrics, health checks, and alerting.

## Overview

The monitoring system provides:
- **Health Checks**: System health and readiness endpoints
- **Metrics Collection**: System, database, and application metrics
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Performance Monitoring**: Request timing and database query tracking
- **Security Event Logging**: Authentication and authorization events
- **Error Tracking**: Exception handling and error reporting

## Health Check Endpoints

### Available Endpoints

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/monitoring/health/` | Overall system health | Load balancer health checks |
| `/monitoring/ready/` | Readiness check | Kubernetes readiness probe |
| `/monitoring/alive/` | Liveness check | Kubernetes liveness probe |
| `/monitoring/metrics/` | Detailed metrics | Monitoring system integration |

### Health Check Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "response_time_ms": 45.23,
  "checks": {
    "database": {
      "status": "healthy",
      "active_connections": 5,
      "total_connections": 10
    },
    "cache": {
      "status": "healthy"
    },
    "system_resources": {
      "status": "healthy",
      "memory_percent": 65.4,
      "cpu_percent": 23.1,
      "disk_percent": 45.8,
      "warnings": []
    }
  }
}
```

### Status Codes

- **200**: System is healthy
- **503**: System is unhealthy (one or more components failing)

## Metrics Collection

### System Metrics

The system automatically collects:

#### Resource Metrics
- **Memory Usage**: Total, used, available, percentage
- **CPU Usage**: Percentage, load average, core count
- **Disk Usage**: Total, used, free, percentage
- **Network Statistics**: Bytes/packets sent/received

#### Database Metrics
- **Connection Pool**: Active and total connections
- **Query Performance**: Query execution times
- **Database Size**: Total size and table sizes
- **Connection Health**: Connection status and version

#### Application Metrics
- **User Statistics**: Total, active, recent logins, by role
- **Student Statistics**: Total and active students
- **Request Performance**: Response times and query counts
- **Error Rates**: HTTP error codes and exception counts

### Custom Metrics

You can add custom metrics using the monitoring utilities:

```python
from apps.core.logging import performance_logger, app_logger

# Log custom performance metric
performance_logger.log_slow_query(query, execution_time, params)

# Log application event
app_logger.log_user_creation(user, creator)
```

## Logging System

### Log Levels and Categories

#### Security Logs (`security` logger)
- **Authentication**: Login attempts, failures, lockouts
- **Authorization**: Permission denials, privilege escalations
- **Suspicious Activity**: Malicious input attempts, unusual patterns
- **Account Management**: Password changes, role changes

#### Performance Logs (`performance` logger)
- **Slow Requests**: Requests taking longer than threshold
- **Slow Queries**: Database queries exceeding time limits
- **Cache Misses**: Cache optimization opportunities
- **Memory Usage**: High memory usage warnings

#### Application Logs (`application` logger)
- **User Management**: User creation, deletion, role changes
- **Data Operations**: Exports, imports, bulk operations
- **Configuration**: Setting changes, system updates

#### Error Logs (`errors` logger)
- **Exceptions**: Unhandled exceptions with full context
- **Validation Errors**: Input validation failures
- **API Errors**: API endpoint errors with details

### Log Format

#### Development (Console)
```
INFO 2024-01-15 10:30:00 Request completed: GET /api/users/
```

#### Production (JSON)
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "logger": "performance",
  "message": "Request completed: GET /api/users/",
  "request_id": "abc123-def456-789",
  "method": "GET",
  "path": "/api/users/",
  "status_code": 200,
  "duration_ms": 45.6,
  "user_id": 123,
  "query_count": 3
}
```

### Log Correlation

All logs include correlation IDs to track requests across services:
- **Request ID**: Unique ID per HTTP request
- **User ID**: Authenticated user identifier
- **Session ID**: User session identifier

## Performance Monitoring

### Request Performance

The system automatically tracks:
- **Response Time**: Total request processing time
- **Database Queries**: Number and execution time of queries
- **Memory Usage**: Memory consumed per request
- **Cache Performance**: Hit/miss ratios and response times

### Thresholds

Default performance thresholds:
- **Slow Request**: > 1000ms
- **High Query Count**: > 50 queries per request
- **High Memory Usage**: > 100MB per request
- **Slow Database Query**: > 100ms

Configure thresholds via environment variables:
```env
SLOW_REQUEST_THRESHOLD_MS=1000
MAX_QUERIES_PER_REQUEST=50
MEMORY_THRESHOLD_MB=100
```

### Optimization Recommendations

Monitor these metrics for optimization:
1. **N+1 Query Problems**: High query counts for list endpoints
2. **Unoptimized Queries**: Slow individual queries
3. **Memory Leaks**: Consistently high memory usage
4. **Cache Misses**: Low cache hit ratios

## Management Commands

### Health Monitoring

```bash
# Basic health check
python manage.py monitor_health

# JSON output for monitoring systems
python manage.py monitor_health --output=json

# Prometheus metrics format
python manage.py monitor_health --output=prometheus

# Check specific component
python manage.py monitor_health --check=database

# Alert threshold checking (exit 1 if unhealthy)
python manage.py monitor_health --alert-thresholds
```

### Configuration Validation

```bash
# Validate configuration
python manage.py validate_config --environment=production

# Strict validation (fail on warnings)
python manage.py validate_config --strict
```

### Security Auditing

```bash
# Full security audit
python manage.py security_audit

# Specific security check
python manage.py security_audit --check=passwords

# Auto-fix issues where possible
python manage.py security_audit --fix
```

## Integration with External Monitoring

### Sentry Integration

Configure error tracking with Sentry:

```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1
RELEASE_VERSION=1.0.0
```

Sentry automatically captures:
- **Exceptions**: Unhandled errors with full context
- **Performance**: Request traces and database queries
- **Releases**: Deploy tracking and error attribution

### Prometheus Integration

Export metrics to Prometheus:

```bash
# Generate Prometheus metrics
python manage.py monitor_health --output=prometheus > /tmp/metrics.txt
```

Create a metrics endpoint in your monitoring setup:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'school-management'
    static_configs:
      - targets: ['your-app:8000']
    metrics_path: '/monitoring/metrics/'
    scrape_interval: 30s
```

### Grafana Dashboards

Recommended Grafana dashboard panels:

#### System Health
- Response time percentiles (p50, p95, p99)
- Error rate by endpoint
- System resource usage (CPU, memory, disk)
- Database connection pool status

#### Application Metrics
- Active users over time
- Request volume by endpoint
- Authentication success/failure rates
- Security events timeline

#### Performance Monitoring
- Slow request alerts
- Database query performance
- Cache hit/miss ratios
- Memory usage patterns

### Log Aggregation

#### ELK Stack Integration

Configure Logstash to parse JSON logs:

```yaml
# logstash.conf
input {
  file {
    path => "/app/logs/*.log"
    start_position => "beginning"
    codec => "json"
  }
}

filter {
  if [logger] == "security" {
    mutate { add_tag => ["security"] }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "school-management-%{+YYYY.MM.dd}"
  }
}
```

#### Splunk Integration

Configure Splunk to index JSON logs with proper source types:

```conf
# inputs.conf
[monitor:///app/logs/*.log]
index = school_management
sourcetype = django_json
```

## Alerting Rules

### Critical Alerts

Configure alerts for these conditions:

#### System Health
- Health check endpoint returning 503
- Memory usage > 90%
- Disk usage > 90%
- CPU usage > 90% for 5+ minutes

#### Database
- Database connection failures
- Query response time > 5 seconds
- Connection pool exhaustion

#### Application
- Error rate > 5% over 5 minutes
- Authentication failure rate > 20%
- Security events (suspicious activity)

#### Performance
- Response time > 5 seconds
- Request volume drop > 50%

### Warning Alerts

#### Resource Usage
- Memory usage > 80%
- Disk usage > 80%
- High query count per request

#### Security
- Failed login attempts spike
- Account lockout increases
- Unusual access patterns

### Alert Channels

Configure multiple alert channels:
1. **Email**: Critical system alerts
2. **Slack/Teams**: Development team notifications
3. **PagerDuty**: After-hours critical alerts
4. **SMS**: Production outages

## Monitoring Dashboard Setup

### Real-time Monitoring

Create dashboards showing:

#### Overview Dashboard
- System status (green/yellow/red indicators)
- Key metrics (response time, error rate, active users)
- Recent alerts and events
- System resource usage

#### Performance Dashboard
- Request response time trends
- Database query performance
- Error rates by endpoint
- Cache performance metrics

#### Security Dashboard
- Authentication events timeline
- Failed login attempt patterns
- Security alerts and incidents
- Account status overview

### Custom Metrics

Add application-specific metrics:

```python
from apps.core.monitoring import ApplicationMetrics

class CustomMetrics(ApplicationMetrics):
    @staticmethod
    def get_enrollment_stats():
        """Track student enrollment metrics."""
        from apps.students.models import Student
        return {
            'new_enrollments_today': Student.objects.filter(
                created_at__date=timezone.now().date()
            ).count(),
            'enrollment_by_grade': dict(
                Student.objects.values_list('grade__name')
                .annotate(count=models.Count('id'))
            )
        }
```

## Troubleshooting

### Common Issues

#### High Response Times
1. Check database query performance
2. Review cache hit ratios  
3. Examine memory usage patterns
4. Look for N+1 query problems

#### Memory Usage Issues
1. Monitor request memory consumption
2. Check for memory leaks in long-running processes
3. Review cache configuration and limits
4. Examine file upload handling

#### Database Connection Issues
1. Check connection pool configuration
2. Monitor connection leaks
3. Review query optimization
4. Examine database server health

#### Cache Problems
1. Verify Redis connectivity
2. Check cache key patterns
3. Monitor cache memory usage
4. Review cache expiration strategies

### Debugging Commands

```bash
# Check system resources
python manage.py monitor_health --check=system

# Database performance
python manage.py monitor_health --check=database

# Application metrics
python manage.py monitor_health --check=application

# Security audit
python manage.py security_audit --check=all

# Configuration validation
python manage.py validate_config --strict
```

### Log Analysis

#### Find Performance Issues
```bash
# Slow requests
grep "slow_request" /app/logs/django.log

# High memory usage
grep "High memory usage" /app/logs/django.log

# Database issues
grep "database" /app/logs/django_error.log
```

#### Security Analysis
```bash
# Failed login attempts
grep "Failed login" /app/logs/django.log

# Suspicious activity
grep "suspicious_activity" /app/logs/django.log

# Permission denials
grep "Permission denied" /app/logs/django.log
```

## Best Practices

### Monitoring Strategy
1. **Start Simple**: Begin with basic health checks and key metrics
2. **Add Gradually**: Expand monitoring based on actual issues
3. **Focus on User Impact**: Monitor user-facing metrics first
4. **Automate Responses**: Set up automated alerts and responses

### Performance Optimization
1. **Monitor First**: Establish baseline metrics before optimizing
2. **Fix Biggest Issues**: Address highest-impact performance problems
3. **Measure Results**: Verify optimization effectiveness
4. **Continuous Monitoring**: Keep monitoring post-optimization

### Security Monitoring
1. **Log Everything**: Comprehensive security event logging
2. **Set Thresholds**: Appropriate alerting thresholds
3. **Investigate Quickly**: Rapid response to security alerts
4. **Regular Reviews**: Periodic security monitoring reviews

### Maintenance
1. **Regular Updates**: Keep monitoring tools updated
2. **Review Thresholds**: Adjust alerting thresholds as needed
3. **Clean Old Data**: Archive or purge old monitoring data
4. **Test Regularly**: Verify monitoring and alerting functionality