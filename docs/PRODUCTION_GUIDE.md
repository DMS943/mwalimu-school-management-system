# Production Guide - Mwalimu School Management System

## Overview

This comprehensive production guide provides all necessary information for deploying, operating, and maintaining the Mwalimu School Management System in a production environment.

## 🚀 Quick Start

### Minimum Requirements

**Infrastructure**
- **CPU**: 4 cores minimum, 8 cores recommended
- **RAM**: 8GB minimum, 16GB recommended  
- **Storage**: 100GB SSD minimum, 500GB recommended
- **Network**: 100 Mbps minimum, 1 Gbps recommended

**Software Dependencies**
- Docker 20.10+ and Docker Compose 2.0+
- PostgreSQL 14+ (or managed database service)
- Redis 6.0+ (with Sentinel for HA)
- Nginx 1.20+ (or load balancer service)
- Python 3.11+ (for management tasks)

### Production Deployment Checklist

- [ ] **Infrastructure Setup**
  - [ ] Provision servers/cloud instances
  - [ ] Configure networking and security groups
  - [ ] Set up DNS records and SSL certificates
  - [ ] Configure monitoring and logging

- [ ] **Database Setup**
  - [ ] PostgreSQL instance configured with optimizations
  - [ ] Database users and permissions configured
  - [ ] Backup and recovery procedures tested
  - [ ] Connection pooling configured

- [ ] **Application Deployment**
  - [ ] Environment variables configured
  - [ ] Docker images built and pushed to registry
  - [ ] Load balancer and SSL termination configured
  - [ ] Application instances deployed and tested

- [ ] **Monitoring and Security**  
  - [ ] Monitoring dashboards configured
  - [ ] Alerting rules set up
  - [ ] Security hardening applied
  - [ ] Backup procedures automated

## 📋 System Architecture

### High-Level Architecture

```
                    ┌─────────────────┐
                    │   Load Balancer │ ← SSL Termination
                    │     (Nginx)     │
                    └─────────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐           ┌────▼────┐           ┌────▼────┐
   │  App    │           │  App    │           │  App    │
   │Instance │           │Instance │           │Instance │
   │   #1    │           │   #2    │           │   #3    │
   └────┬────┘           └────┬────┘           └────┬────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────▼─────────────────────┐
        │                                           │
   ┌────▼────┐              ┌─────────┐       ┌────▼────┐
   │PostgreSQL│              │  Redis  │       │ Monitoring│
   │Database │              │ Cluster │       │  Stack   │
   └─────────┘              └─────────┘       └─────────┘
```

### Component Overview

| Component | Purpose | Scaling Strategy |
|-----------|---------|------------------|
| **Load Balancer** | Traffic distribution, SSL termination | Horizontal (multiple instances) |
| **Application** | Django REST API backend | Horizontal (auto-scaling) |
| **Database** | PostgreSQL with read replicas | Vertical + Read replicas |
| **Cache** | Redis cluster for sessions/cache | Horizontal (cluster mode) |
| **Monitoring** | Prometheus + Grafana stack | Dedicated cluster |

## 🛠️ Deployment Procedures

### Initial Production Deployment

1. **Prepare Infrastructure**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd mwalimu-school-management-system
   
   # Configure environment
   cp .env.example.production .env.production
   # Edit .env.production with production values
   ```

2. **Database Setup**
   ```bash
   # Initialize production database
   python manage.py setup_production_db --initial-setup
   
   # Run migrations
   python manage.py migrate
   
   # Create superuser
   python manage.py createsuperuser
   
   # Load initial data
   python manage.py loaddata fixtures/initial_data.json
   ```

3. **Deploy Application**
   ```bash
   # Build and deploy using Docker Compose
   docker-compose -f docker-compose.prod.yml up -d
   
   # Or deploy to Kubernetes
   kubectl apply -f k8s/
   
   # Verify deployment
   ./scripts/deploy-production.sh --verify
   ```

4. **Post-Deployment Setup**
   ```bash
   # Warm caches
   python manage.py optimize_performance cache --warm
   
   # Set up monitoring
   python manage.py monitor_health --setup-alerts
   
   # Test backup procedures
   python manage.py disaster_recovery backup --tier local --full
   ```

### Rolling Updates

```bash
# 1. Backup current state
python manage.py disaster_recovery backup --tier local --full

# 2. Deploy new version with zero downtime
./scripts/deploy-production.sh --rolling-update --version v1.2.3

# 3. Verify deployment
curl -f https://yourschool.com/monitoring/health/

# 4. Run post-deployment tasks
python manage.py migrate --run-syncdb
python manage.py collectstatic --noinput
python manage.py optimize_performance cache --warm
```

### Rollback Procedures

```bash
# Quick rollback using Docker
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Database rollback (if needed)
python manage.py disaster_recovery recover --backup-id backup_20241215_143000

# Kubernetes rollback
kubectl rollout undo deployment/mwalimu-backend
```

## 🔧 Configuration Management

### Environment Configuration

**Production Environment Variables**
```bash
# Core Application
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=<64-character-secret-key>

# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/mwalimu_prod
DATABASE_CONN_MAX_AGE=300

# Cache and Sessions
REDIS_URL=redis://redis-cluster:6379/0
CACHE_WARMING_ENABLED=True

# Security
ALLOWED_HOSTS=yourschool.com,www.yourschool.com,api.yourschool.com
CORS_ALLOWED_ORIGINS=https://yourschool.com
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000

# Performance
CDN_ENABLED=True
CDN_DOMAIN=cdn.yourschool.com
ASSET_OPTIMIZATION_ENABLED=True

# Monitoring
SENTRY_DSN=<sentry-dsn>
ENABLE_MONITORING=True
```

### SSL Certificate Management

```bash
# Auto-renewal setup (already configured)
# Certificates auto-renew via Let's Encrypt

# Manual certificate renewal (if needed)
certbot renew --nginx --quiet

# Verify SSL configuration
./nginx/ssl/setup-ssl.sh --verify
```

### Database Configuration

```bash
# Production database optimization
python manage.py optimize_database optimize --all

# Connection pooling configuration
# See backend/config/production.py for settings

# Read replica setup (if using managed service)
# Configure DATABASES['read'] in settings
```

## 📊 Monitoring and Alerting

### Monitoring Dashboard

Access monitoring dashboards at:
- **System Metrics**: https://monitoring.yourschool.com/grafana
- **Application Performance**: https://yourschool.com/admin/performance/
- **Logs**: https://logs.yourschool.com/kibana

### Key Metrics to Monitor

**Application Metrics**
- Response time (95th percentile < 1000ms)
- Error rate (< 1%)
- Throughput (requests/second)
- Database query performance

**Infrastructure Metrics**
- CPU usage (< 80%)
- Memory usage (< 80%)
- Disk usage (< 85%)
- Network I/O

**Business Metrics**
- Active users
- Data integrity checks
- Backup success rates
- Security event rates

### Alert Configuration

**Critical Alerts** (Immediate Response Required)
- Application down (> 5 minutes)
- Database connectivity lost
- Disk space > 90%
- Memory usage > 95%
- Security breach detected

**Warning Alerts** (Response within 1 hour)
- High response times (> 2 seconds)
- Error rate > 2%
- Cache hit ratio < 70%
- Backup failures

**Information Alerts** (Daily Review)
- Performance degradation trends
- Capacity planning metrics
- Security scan results

## 🔒 Security Operations

### Security Monitoring

```bash
# Daily security audit
python manage.py security_audit --full-scan

# Check for vulnerabilities
python manage.py security_audit --check-dependencies

# Review access logs
grep "SECURITY_EVENT" /var/log/mwalimu/security.log
```

### Incident Response Procedures

**Security Incident Response**
1. **Detection**: Automated alerts or manual discovery
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threats and vulnerabilities
5. **Recovery**: Restore systems and data
6. **Documentation**: Record incident and lessons learned

**Data Breach Response**
1. **Immediate Actions** (< 1 hour)
   - Isolate affected systems
   - Preserve evidence
   - Notify incident response team

2. **Assessment** (< 4 hours)
   - Determine data types affected
   - Assess number of users impacted
   - Evaluate regulatory requirements

3. **Notification** (< 72 hours)
   - Notify regulatory authorities
   - Inform affected users
   - Update stakeholders

### Access Management

```bash
# User access audit
python manage.py security_audit --check-users

# Remove inactive users
python manage.py cleanup_inactive_users --days 90

# Password policy enforcement
python manage.py security_audit --check-passwords
```

## 🔄 Backup and Recovery Operations

### Automated Backup Schedule

**Daily Backups** (2:00 AM UTC)
- Full database backup
- Application file backup
- Configuration backup

**Weekly Backups** (Sunday 3:00 AM UTC)  
- Complete system backup
- Archive to long-term storage
- Backup validation tests

**Monthly Backups** (1st Sunday 4:00 AM UTC)
- Compliance archive backup
- Disaster recovery testing
- Backup retention cleanup

### Manual Backup Operations

```bash
# Create immediate backup
python manage.py disaster_recovery backup --tier local --full

# Backup specific components
python manage.py disaster_recovery backup --type database
python manage.py disaster_recovery backup --type media
python manage.py disaster_recovery backup --type config

# Validate backup integrity
python manage.py disaster_recovery validate --backup-id latest
```

### Recovery Procedures

**Database Recovery**
```bash
# List available backups
python manage.py disaster_recovery status --detailed

# Restore from specific backup
python manage.py disaster_recovery recover --backup-id backup_20241215_143000

# Point-in-time recovery
python manage.py disaster_recovery recover --point-in-time "2024-12-15 14:30:00"
```

**Complete System Recovery**
```bash
# Emergency recovery procedure
./scripts/automated_recovery.py --emergency-mode

# Manual system recovery
python manage.py disaster_recovery recover --backup-id latest --full-system
```

## ⚡ Performance Management

### Performance Monitoring

```bash
# Generate performance report
python manage.py optimize_performance monitor --report --hours 24

# Cache management
python manage.py optimize_performance cache --stats
python manage.py optimize_performance cache --warm

# Database optimization
python manage.py optimize_performance database --analyze
```

### Capacity Planning

**Traffic Growth Planning**
- Monitor user growth trends
- Plan for seasonal traffic spikes
- Resource utilization forecasting

**Storage Planning**
- Database growth monitoring
- Media file storage projections
- Backup storage requirements

**Performance Scaling**
- Horizontal scaling triggers
- Vertical scaling guidelines
- CDN optimization strategies

## 🚨 Troubleshooting Procedures

### Common Issues and Solutions

**Application Not Responding**
1. Check application logs: `docker-compose logs app`
2. Verify database connectivity: `python manage.py check --database`
3. Check system resources: `htop`, `free -h`, `df -h`
4. Restart application: `docker-compose restart app`

**High Response Times**
1. Check slow query log: `python manage.py optimize_performance database --analyze`
2. Verify cache hit rates: `python manage.py optimize_performance cache --stats`
3. Review system metrics in Grafana
4. Analyze application profiling data

**Database Issues**
1. Check connection pool: `python manage.py monitor_database status`
2. Analyze query performance: PostgreSQL slow query log
3. Check for blocking queries: `SELECT * FROM pg_stat_activity;`
4. Verify disk space: `df -h /var/lib/postgresql`

**SSL Certificate Issues**
1. Check certificate expiry: `./nginx/ssl/setup-ssl.sh --check`
2. Verify certificate chain: `openssl s_client -connect yourschool.com:443`
3. Reload Nginx configuration: `nginx -s reload`

### Emergency Procedures

**Complete System Failure**
1. Activate disaster recovery plan
2. Deploy to secondary infrastructure
3. Restore from latest backup
4. Update DNS to point to backup system
5. Notify users of service restoration

**Data Corruption**
1. Stop all write operations
2. Identify scope of corruption
3. Restore from backup before corruption
4. Validate data integrity
5. Resume normal operations

## 📅 Maintenance Schedules

### Daily Tasks (Automated)
- [ ] System health checks
- [ ] Backup verification
- [ ] Performance metrics collection
- [ ] Security log review
- [ ] Cache optimization

### Weekly Tasks
- [ ] Security audit and vulnerability scan
- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Performance optimization review
- [ ] Backup restoration test
- [ ] System update assessment

### Monthly Tasks
- [ ] Comprehensive system review
- [ ] Capacity planning analysis
- [ ] Security policy review
- [ ] Disaster recovery testing
- [ ] Documentation updates

### Quarterly Tasks
- [ ] Full security audit
- [ ] Performance baseline review
- [ ] Infrastructure optimization
- [ ] Compliance audit
- [ ] Business continuity testing

## 📞 Support and Escalation

### Support Tiers

**Level 1 Support** (Response: 15 minutes)
- Application restart procedures
- Basic troubleshooting
- Status page updates
- User communication

**Level 2 Support** (Response: 1 hour)
- System administration
- Database optimization
- Performance tuning
- Security incident response

**Level 3 Support** (Response: 4 hours)
- Architecture changes
- Complex troubleshooting
- Disaster recovery execution
- Vendor escalation

### Contact Information

**Emergency Contacts**
- Primary Administrator: [Contact Information]
- Database Administrator: [Contact Information]
- Security Officer: [Contact Information]
- Infrastructure Team: [Contact Information]

**Vendor Support**
- Cloud Provider Support: [Support Information]
- Database Service Support: [Support Information]
- Monitoring Service Support: [Support Information]

### Escalation Procedures

**Severity Levels**
- **Critical (P1)**: System down, data loss, security breach
- **High (P2)**: Major functionality impaired, performance degraded
- **Medium (P3)**: Minor functionality issues, planned maintenance
- **Low (P4)**: Enhancement requests, documentation updates

## 📚 Additional Resources

### Documentation Links
- [Environment Configuration Guide](ENVIRONMENT_CONFIGURATION.md)
- [Security Hardening Guide](SECURITY.md)
- [Monitoring and Logging Guide](MONITORING.md)
- [Database Optimization Guide](DATABASE_OPTIMIZATION.md)
- [Performance Optimization Guide](PERFORMANCE_OPTIMIZATION.md)
- [Disaster Recovery Guide](DISASTER_RECOVERY.md)
- [CI/CD Pipeline Guide](CI_CD_PIPELINE.md)

### Useful Commands Reference
```bash
# System health check
python manage.py monitor_health --full-check

# Performance optimization
python manage.py optimize_performance optimize-all

# Security audit
python manage.py security_audit --full-scan

# Backup operations
python manage.py disaster_recovery backup --tier offsite --full

# Database maintenance
python manage.py optimize_database optimize --all
```

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Review Schedule**: Monthly  
**Next Review**: January 2025