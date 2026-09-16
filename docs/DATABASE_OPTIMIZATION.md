# Database Optimization and Backup Strategy

This document outlines the comprehensive database optimization and backup strategy implemented for the Mwalimu School Management System.

## Table of Contents
1. [Database Optimization](#database-optimization)
2. [Backup Strategy](#backup-strategy)
3. [Monitoring](#monitoring)
4. [Management Commands](#management-commands)
5. [Automation](#automation)
6. [Performance Tuning](#performance-tuning)
7. [Troubleshooting](#troubleshooting)

## Database Optimization

### Connection Pooling

The system implements environment-specific connection pooling:

#### Production Settings
- **Connection Age**: 600 seconds (10 minutes)
- **Health Checks**: Enabled
- **Statement Timeout**: 30 seconds
- **Max Connections**: 200
- **Effective Cache Size**: 2GB

#### Staging Settings
- **Connection Age**: 300 seconds (5 minutes)
- **Max Connections**: 100
- **Effective Cache Size**: 1GB

#### Development Settings
- **Connection Age**: 60 seconds
- **No Statement Timeout**: For debugging
- **Query Logging**: All queries logged

### Database Indexes

The system automatically creates optimized indexes for:

#### Critical Performance Indexes
- **Users**: Role + Active status, Department + Role combinations
- **Students**: Class + Active status, Name search, Parent relationships
- **Attendance**: Date + Student, Status + Date combinations
- **Marks**: Student + Term, Subject + Term, Grade filtering
- **Schedules**: Class + Day, Teacher + Term, Time ranges

#### Partial Indexes
- Active-only records for Users, Students, and Terms
- Reduces index size and improves performance for common queries

### Query Optimization

#### Slow Query Detection
- Queries slower than 1 second in production are logged
- Queries slower than 500ms in staging are logged
- All queries logged in development

#### Query Analysis Tools
- Built-in EXPLAIN ANALYZE functionality
- Automatic detection of missing indexes
- Sequential scan analysis and recommendations

## Backup Strategy

### Backup Types

#### 1. Daily Automated Backups
- **Schedule**: 2:00 AM daily
- **Format**: Compressed PostgreSQL custom format
- **Retention**: 30 days (configurable)
- **Location**: `/opt/backups` (configurable)
- **S3 Upload**: Optional for off-site storage

#### 2. Weekly Maintenance
- **Schedule**: Sunday 3:00 AM
- **Tasks**: 
  - Cleanup old backups
  - Verify backup integrity
  - Generate maintenance reports

#### 3. Monthly Optimization
- **Schedule**: 1st of month, 4:00 AM
- **Tasks**:
  - Run VACUUM ANALYZE
  - Create new indexes if recommended
  - Generate performance reports

### Backup Features

#### Compression
- Automatic gzip compression
- Reduces backup size by 70-80%
- Maintains data integrity

#### Verification
- Regular integrity checks
- Corruption detection
- Automated alerts on failures

#### Off-site Storage
- Optional S3 integration
- Encrypted transfers
- Organized by date hierarchy

## Monitoring

### Health Checks

#### Database Health Endpoint
```
GET /monitoring/database/
```

Returns comprehensive health metrics:
- Connection statistics
- Cache hit ratios
- Slow query counts
- Index recommendations
- Overall health score (0-100)

#### System Metrics
```
GET /monitoring/metrics/
```

Provides system-level metrics:
- CPU usage
- Memory utilization
- Disk space
- Database connections

### Performance Monitoring

#### Real-time Monitoring
```bash
python manage.py monitor_database --watch --interval 30
```

#### Prometheus Integration
```
GET /monitoring/prometheus/
```

Exports metrics in Prometheus format for external monitoring systems.

### Alerting

#### Health Score Thresholds
- **90-100**: Healthy (Green)
- **70-89**: Warning (Yellow)  
- **0-69**: Critical (Red)

#### Alert Conditions
- Cache hit ratio < 95%
- Active slow queries > 10
- Connection utilization > 75%
- Multiple index recommendations

## Management Commands

### Database Optimization
```bash
# Analyze database performance
python manage.py optimize_database --analyze-only

# Create recommended indexes
python manage.py optimize_database --create-indexes

# Run VACUUM ANALYZE
python manage.py optimize_database --vacuum

# Full optimization (indexes + vacuum)
python manage.py optimize_database --create-indexes --vacuum
```

### Backup Management
```bash
# Create backup
python manage.py backup_database backup --compress

# Create backup with S3 upload
python manage.py backup_database backup --compress --s3-upload

# List available backups
python manage.py backup_database list

# Restore from backup
python manage.py backup_database restore --file backup_school_20240315_120000.sql.gz

# Cleanup old backups
python manage.py backup_database cleanup --retention-days 30

# Verify backup integrity
python manage.py backup_database verify
```

### Performance Monitoring
```bash
# Single performance report
python manage.py monitor_database

# Continuous monitoring
python manage.py monitor_database --watch --interval 30

# JSON output
python manage.py monitor_database --output json

# Save to file
python manage.py monitor_database --output file --file db_report.json
```

## Automation

### Cron Jobs

The system includes automated cron job configurations:

```bash
# Install cron jobs
crontab scripts/crontab_backup

# View current cron jobs
crontab -l
```

#### Scheduled Tasks
- **Daily 2:00 AM**: Database backup
- **Sunday 3:00 AM**: Weekly cleanup and verification
- **Monthly 1st 4:00 AM**: Database optimization
- **Every 15 min (8-6 PM)**: Health monitoring during business hours

### Backup Scheduler

Automated Python script for backup operations:

```bash
# Daily backup
python scripts/backup_scheduler.py daily

# Weekly maintenance
python scripts/backup_scheduler.py weekly

# Monthly optimization
python scripts/backup_scheduler.py monthly

# Verify backups
python scripts/backup_scheduler.py verify
```

## Performance Tuning

### PostgreSQL Configuration

#### Optimized Settings
- `effective_cache_size`: 2GB (production)
- `maintenance_work_mem`: 256MB
- `checkpoint_completion_target`: 0.9
- `wal_buffers`: 16MB
- `default_statistics_target`: 100

#### Query Planning
- Enhanced statistics collection
- Better join optimization
- Improved index usage

### Django Optimizations

#### ORM Best Practices
- Use `select_related()` for foreign keys
- Use `prefetch_related()` for reverse foreign keys
- Implement database-level constraints
- Use bulk operations for large datasets

#### Caching Strategy
- Redis for session storage
- Query result caching
- Template fragment caching

## Troubleshooting

### Common Issues

#### Slow Queries
1. Check slow query log: `python manage.py monitor_database`
2. Analyze query plan: Use built-in EXPLAIN functionality
3. Add indexes if recommended
4. Optimize ORM queries

#### Connection Issues
1. Check connection pool settings
2. Monitor active connections
3. Adjust `CONN_MAX_AGE` if needed
4. Review connection timeout settings

#### Backup Failures
1. Check disk space in backup directory
2. Verify database connectivity
3. Review backup logs: `/var/log/cron-backup.log`
4. Test backup integrity: `python manage.py backup_database verify`

#### Performance Degradation
1. Run health check: `GET /monitoring/database/`
2. Check for missing indexes
3. Run VACUUM ANALYZE: `python manage.py optimize_database --vacuum`
4. Monitor system resources

### Emergency Procedures

#### Database Recovery
1. Stop application services
2. Identify last good backup
3. Restore database: `python manage.py backup_database restore --file <backup>`
4. Verify data integrity
5. Restart services
6. Monitor for issues

#### Performance Emergency
1. Identify slow queries immediately
2. Add emergency indexes if needed
3. Scale database connections
4. Implement query caching
5. Review and optimize critical queries

### Monitoring and Alerts

#### Log Locations
- **Application Logs**: `/var/log/django/`
- **Backup Logs**: `/var/log/cron-backup.log`
- **Monitoring Logs**: `/var/log/cron-monitoring.log`
- **Database Health Reports**: `/var/log/db_health_*.json`

#### Key Metrics to Monitor
- Database health score
- Cache hit ratio
- Connection utilization  
- Query execution time
- Backup success rate
- Disk usage trends

## Configuration Reference

### Environment Variables
```bash
# Backup Configuration
BACKUP_DIR=/opt/backups
BACKUP_S3_ENABLED=False
BACKUP_RETENTION_DAYS=30
S3_BACKUP_BUCKET=your-backup-bucket

# AWS Configuration (if S3 enabled)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1
```

### Database Connection Settings
```python
# Production
CONN_MAX_AGE = 600
CONN_HEALTH_CHECKS = True
OPTIONS = {
    'statement_timeout': 30000,
    'max_connections': 200,
    'effective_cache_size': '2GB'
}

# Staging  
CONN_MAX_AGE = 300
OPTIONS = {
    'statement_timeout': 30000,
    'max_connections': 100,
    'effective_cache_size': '1GB'
}
```

This comprehensive database optimization and backup strategy ensures high performance, reliability, and data safety for the Mwalimu School Management System in production environments.