# Troubleshooting Guide - Mwalimu School Management System

## Overview

This guide provides systematic troubleshooting procedures for common issues in the production environment.

## 🔍 Diagnostic Tools and Commands

### System Health Check Commands
```bash
# Comprehensive health check
python manage.py monitor_health --full-check

# Check specific components
python manage.py check --database default
python manage.py check --deploy --settings=config.production

# Performance diagnostics
python manage.py optimize_performance monitor --report --hours 1

# Security audit
python manage.py security_audit --quick-check
```

### System Resource Monitoring
```bash
# CPU and memory usage
htop
top -p $(pgrep -d',' python)

# Disk usage
df -h
du -sh /var/log/* | sort -hr

# Network connections
netstat -tulpn | grep :8000
ss -tulpn | grep :8000

# Process information
ps aux | grep python
ps aux | grep nginx
```

### Service Status Checks
```bash
# Docker services
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs --tail=50

# Kubernetes services
kubectl get pods -n mwalimu-prod
kubectl get services -n mwalimu-prod
kubectl describe pod <pod-name> -n mwalimu-prod

# System services
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
```

## 🚨 Common Issues and Solutions

### Application Won't Start

#### Symptoms
- Container fails to start
- Application exits immediately
- Health checks fail

#### Diagnostic Steps
1. **Check logs**
   ```bash
   # Docker logs
   docker-compose -f docker-compose.prod.yml logs app
   
   # Application logs
   tail -f /var/log/mwalimu/application.log
   
   # System logs
   journalctl -u mwalimu-app -f
   ```

2. **Check configuration**
   ```bash
   # Validate environment variables
   python manage.py validate_config
   
   # Check settings
   python manage.py diffsettings
   
   # Test database connection
   python manage.py dbshell
   ```

#### Common Causes and Solutions

**Missing Environment Variables**
```bash
# Check required variables
grep -E "^[A-Z_]+" .env.production

# Validate all required variables are set
python manage.py validate_config --env production
```

**Database Connection Issues**
```bash
# Test database connectivity
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1;"

# Check connection pool
python manage.py monitor_database --check-connections

# Reset database connections
docker-compose restart app
```

**Port Conflicts**
```bash
# Check if port is in use
netstat -tulpn | grep :8000
lsof -i :8000

# Kill conflicting processes
sudo kill -9 $(lsof -t -i:8000)
```

### Slow Performance

#### Symptoms
- High response times (>2 seconds)
- Timeouts on requests
- High server load

#### Diagnostic Steps
1. **Performance analysis**
   ```bash
   # Generate performance report
   python manage.py optimize_performance monitor --report --hours 1
   
   # Check slow queries
   python manage.py optimize_performance database --analyze
   
   # Cache statistics
   python manage.py optimize_performance cache --stats
   ```

2. **Resource monitoring**
   ```bash
   # System resources
   vmstat 1 5
   iostat -x 1 5
   
   # Application resources
   docker stats
   kubectl top pods -n mwalimu-prod
   ```

#### Performance Issues and Solutions

**High Database Load**
```bash
# Find slow queries
SELECT query, calls, total_time, mean_time, rows 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

# Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

# Optimize slow queries
python manage.py optimize_database optimize --analyze-slow
```

**Cache Issues**
```bash
# Check cache hit ratio
python manage.py optimize_performance cache --stats

# Clear problematic cache keys
python manage.py optimize_performance cache --clear --pattern "slow_*"

# Warm critical caches
python manage.py optimize_performance cache --warm
```

**High Memory Usage**
```bash
# Find memory-consuming processes
ps aux --sort=-%mem | head -10

# Check for memory leaks
python manage.py monitor_health --check-memory-leaks

# Restart high-memory processes
docker-compose restart app
kubectl rollout restart deployment/mwalimu-backend -n mwalimu-prod
```

### Database Issues

#### Connection Pool Exhaustion

**Symptoms**
- "too many connections" errors
- Connection timeouts
- High database load

**Diagnosis**
```bash
# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check connection by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

# Check application connections
python manage.py monitor_database --check-connections
```

**Solutions**
```bash
# Adjust connection pool settings
# In production.py:
DATABASES['default']['OPTIONS']['MAX_CONNS'] = 20

# Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '1 hour';

# Restart application to reset pool
docker-compose restart app
```

#### Slow Queries

**Diagnosis**
```bash
# Enable slow query logging (PostgreSQL)
ALTER SYSTEM SET log_min_duration_statement = 1000;  # 1 second
SELECT pg_reload_conf();

# Check slow query log
tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"

# Use Django's database query analysis
python manage.py optimize_performance database --analyze
```

**Solutions**
```bash
# Add missing indexes
python manage.py optimize_database optimize --add-indexes

# Update table statistics
ANALYZE table_name;

# Rewrite problematic queries
EXPLAIN ANALYZE SELECT ...;
```

#### Database Lock Issues

**Diagnosis**
```bash
# Check for blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

**Solutions**
```bash
# Kill blocking queries (carefully!)
SELECT pg_terminate_backend(blocking_pid);

# Reduce lock contention
# Use smaller transactions
# Add appropriate indexes
# Use SELECT FOR UPDATE SKIP LOCKED where appropriate
```

### Cache Problems

#### Redis Connection Issues

**Symptoms**
- Cache misses increase dramatically
- "Connection refused" errors
- Application falls back to database

**Diagnosis**
```bash
# Test Redis connection
redis-cli -h redis-host ping

# Check Redis status
redis-cli -h redis-host info server

# Check Redis logs
docker-compose logs redis
kubectl logs -f deployment/redis -n mwalimu-prod
```

**Solutions**
```bash
# Restart Redis service
docker-compose restart redis
kubectl rollout restart deployment/redis -n mwalimu-prod

# Check Redis configuration
redis-cli -h redis-host config get "*"

# Monitor Redis performance
redis-cli -h redis-host --latency-history
```

#### Cache Performance Issues

**Diagnosis**
```bash
# Cache hit/miss statistics
python manage.py optimize_performance cache --stats

# Redis memory usage
redis-cli -h redis-host info memory

# Cache key analysis
redis-cli -h redis-host --scan --pattern "*" | head -20
```

**Solutions**
```bash
# Clear problematic cache patterns
python manage.py optimize_performance cache --clear --pattern "expired_*"

# Optimize cache usage
# Review cache timeout settings
# Implement cache warming strategies
# Use cache versioning for cache busting

# Redis memory optimization
redis-cli -h redis-host config set maxmemory-policy allkeys-lru
```

### SSL/TLS Issues

#### Certificate Problems

**Symptoms**
- SSL certificate warnings in browser
- "Certificate expired" errors
- HTTPS connections fail

**Diagnosis**
```bash
# Check certificate expiration
./nginx/ssl/setup-ssl.sh --check

# Test SSL configuration
openssl s_client -connect yourschool.com:443 -servername yourschool.com

# Check certificate chain
curl -vI https://yourschool.com/
```

**Solutions**
```bash
# Renew certificates
certbot renew --nginx --force-renewal

# Verify certificate installation
nginx -t
systemctl reload nginx

# Check auto-renewal
systemctl status certbot.timer
```

#### SSL Configuration Issues

**Diagnosis**
```bash
# Test SSL configuration
./nginx/ssl/setup-ssl.sh --verify

# Check cipher suites
nmap --script ssl-cert,ssl-enum-ciphers -p 443 yourschool.com

# Validate HSTS headers
curl -I https://yourschool.com/ | grep -i strict
```

**Solutions**
```bash
# Update SSL configuration
# Edit nginx/nginx.conf
# Add modern cipher suites
# Enable HSTS headers
nginx -s reload
```

### Load Balancer Issues

#### Nginx Configuration Problems

**Symptoms**
- 502 Bad Gateway errors
- Uneven load distribution
- Connection timeouts

**Diagnosis**
```bash
# Check Nginx status
systemctl status nginx

# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Test upstream servers
curl -H "Host: yourschool.com" http://backend-1:8000/health/
```

**Solutions**
```bash
# Fix configuration errors
nginx -t
# Fix any reported errors

# Reload configuration
nginx -s reload

# Check upstream health
# Ensure all backend servers are healthy
# Update upstream configuration if needed
```

#### Health Check Failures

**Diagnosis**
```bash
# Test health check endpoints
curl -f http://backend-server:8000/monitoring/health/

# Check application logs for health check errors
grep "health" /var/log/mwalimu/application.log

# Verify health check configuration in Nginx
cat nginx/nginx.conf | grep -A 10 "health_check"
```

**Solutions**
```bash
# Fix failing health checks
python manage.py monitor_health --fix-issues

# Update health check configuration
# Adjust timeout and interval settings
# Add proper error handling

# Restart failing backend instances
docker-compose restart app
```

### File System Issues

#### Disk Space Problems

**Symptoms**
- "No space left on device" errors
- Application crashes
- Log rotation fails

**Diagnosis**
```bash
# Check disk usage
df -h
du -sh /var/log/* | sort -hr
du -sh /opt/mwalimu/* | sort -hr

# Find large files
find /var -size +100M -type f -exec ls -lh {} \;
```

**Solutions**
```bash
# Clean up log files
find /var/log -name "*.log" -mtime +30 -delete
journalctl --vacuum-time=30d

# Clean up temporary files
find /tmp -type f -mtime +7 -delete

# Clean up old backups
find /opt/backups -name "*.gz" -mtime +90 -delete

# Implement log rotation
logrotate -f /etc/logrotate.conf
```

#### Permission Issues

**Symptoms**
- "Permission denied" errors
- File upload failures
- Log writing failures

**Diagnosis**
```bash
# Check file permissions
ls -la /opt/mwalimu/
ls -la /var/log/mwalimu/

# Check process user
ps aux | grep python | head -1

# Check directory ownership
stat /opt/mwalimu/media/
```

**Solutions**
```bash
# Fix file permissions
chown -R mwalimu:mwalimu /opt/mwalimu/
chmod -R 755 /opt/mwalimu/
chmod -R 775 /opt/mwalimu/media/

# Fix log permissions
chown -R mwalimu:mwalimu /var/log/mwalimu/
chmod -R 644 /var/log/mwalimu/*.log
```

## 🔧 Network Troubleshooting

### Connectivity Issues

#### DNS Resolution Problems

**Diagnosis**
```bash
# Test DNS resolution
nslookup yourschool.com
dig yourschool.com
host yourschool.com

# Check local DNS cache
systemctl status systemd-resolved
resolvectl status
```

**Solutions**
```bash
# Flush DNS cache
systemctl flush-dns
resolvectl flush-caches

# Update DNS servers
# Edit /etc/systemd/resolved.conf
# Add DNS=8.8.8.8 8.8.4.4
systemctl restart systemd-resolved
```

#### Port Connectivity Issues

**Diagnosis**
```bash
# Test port connectivity
telnet target-host 5432
nc -zv target-host 5432

# Check local port binding
netstat -tulpn | grep :8000
ss -tulpn | grep :8000

# Test internal connectivity
curl -I http://localhost:8000/health/
```

**Solutions**
```bash
# Check firewall rules
ufw status
iptables -L

# Open required ports
ufw allow 8000/tcp
ufw allow 5432/tcp

# Check security groups (cloud environments)
# Ensure proper ingress/egress rules
```

### Load Balancer Connectivity

**Diagnosis**
```bash
# Test load balancer
curl -I https://yourschool.com/

# Test individual backends
curl -H "Host: yourschool.com" http://10.0.1.10:8000/health/
curl -H "Host: yourschool.com" http://10.0.1.11:8000/health/

# Check load balancer logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

**Solutions**
```bash
# Restart load balancer
systemctl restart nginx

# Update backend configuration
# Edit nginx/nginx.conf
# Update upstream server list
nginx -s reload

# Check backend health
docker-compose ps
kubectl get pods -n mwalimu-prod
```

## 🔐 Security Troubleshooting

### Authentication Issues

#### Login Failures

**Symptoms**
- Users cannot log in
- "Invalid credentials" errors
- Account lockouts

**Diagnosis**
```bash
# Check authentication logs
grep "LOGIN_FAILED" /var/log/mwalimu/security.log
grep "AUTH_" /var/log/mwalimu/application.log

# Check account status
python manage.py security_audit --check-users

# Test authentication
python manage.py shell
# from django.contrib.auth import authenticate
# user = authenticate(username='test', password='test')
```

**Solutions**
```bash
# Reset account lockouts
python manage.py security_audit --unlock-users

# Reset passwords
python manage.py changepassword username

# Check password policy
python manage.py security_audit --check-password-policy

# Verify authentication backend
# Check AUTHENTICATION_BACKENDS in settings
```

#### Permission Issues

**Diagnosis**
```bash
# Check user permissions
python manage.py show_user_permissions username

# Check group permissions
python manage.py show_group_permissions groupname

# Test authorization
python manage.py shell
# from django.contrib.auth.models import User
# user = User.objects.get(username='test')
# user.has_perm('app.permission_name')
```

**Solutions**
```bash
# Fix user permissions
python manage.py assign_permissions username permission_name

# Update group permissions
python manage.py update_group_permissions groupname

# Verify permission inheritance
python manage.py audit_permissions --verbose
```

### Security Scanning Issues

**Diagnosis**
```bash
# Run security audit
python manage.py security_audit --full-scan

# Check for vulnerabilities
safety check
pip-audit

# Check SSL/TLS configuration
./nginx/ssl/setup-ssl.sh --security-check
```

**Solutions**
```bash
# Update vulnerable packages
pip install --upgrade package-name

# Apply security patches
apt update && apt upgrade

# Update security configuration
python manage.py security_audit --apply-fixes
```

## 📊 Monitoring and Alerting Issues

### Missing Metrics

**Diagnosis**
```bash
# Check monitoring service status
systemctl status prometheus
systemctl status grafana-server

# Test metrics endpoints
curl http://localhost:8000/monitoring/metrics/

# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets
```

**Solutions**
```bash
# Restart monitoring services
systemctl restart prometheus
systemctl restart grafana-server

# Update monitoring configuration
# Check prometheus.yml
# Verify target configuration

# Reconfigure dashboards
# Import Grafana dashboards
# Update alert rules
```

### Alert Fatigue

**Diagnosis**
```bash
# Check alert frequency
grep "ALERT" /var/log/mwalimu/monitoring.log | wc -l

# Review alert rules
cat monitoring/alert_rules.yml

# Check notification channels
# Review email/Slack delivery logs
```

**Solutions**
```bash
# Tune alert thresholds
# Edit monitoring/alert_rules.yml
# Increase thresholds for noisy alerts
# Add alert suppression rules

# Implement alert escalation
# Set up different severity levels
# Configure escalation timers

# Group related alerts
# Use alert grouping in Alertmanager
# Reduce notification frequency
```

## 🚀 Performance Optimization Troubleshooting

### Query Performance Issues

**Diagnosis**
```bash
# Analyze slow queries
python manage.py optimize_performance database --analyze

# Check query execution plans
python manage.py dbshell
# EXPLAIN ANALYZE SELECT ...;

# Monitor query performance
python manage.py optimize_performance monitor --report --hours 1
```

**Solutions**
```bash
# Add database indexes
python manage.py optimize_database optimize --add-indexes

# Optimize query patterns
# Review N+1 query issues
# Add select_related/prefetch_related
# Use bulk operations

# Update database statistics
python manage.py optimize_database optimize --update-stats
```

### Cache Performance Issues

**Diagnosis**
```bash
# Check cache hit rates
python manage.py optimize_performance cache --stats

# Analyze cache patterns
redis-cli monitor | grep -E "(GET|SET|DEL)"

# Check cache memory usage
redis-cli info memory
```

**Solutions**
```bash
# Optimize cache strategies
# Implement cache warming
# Adjust cache timeouts
# Use cache versioning

# Scale cache infrastructure
# Add more Redis nodes
# Implement Redis clustering
# Increase memory allocation
```

---

**Last Updated**: December 2024  
**Document Version**: 1.0  
**Review Schedule**: Quarterly