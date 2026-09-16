# Operational Runbooks - Mwalimu School Management System

## Overview

This document contains step-by-step operational procedures for common production tasks and incident response scenarios.

## 🚨 Emergency Procedures

### System Down - Complete Outage

**Symptoms**: Application completely unavailable, 5xx errors
**Response Time**: Immediate (< 5 minutes)

#### Step-by-Step Response

1. **Initial Assessment** (0-2 minutes)
   ```bash
   # Check application status
   curl -I https://yourschool.com/monitoring/health/
   
   # Check infrastructure
   docker-compose -f docker-compose.prod.yml ps
   kubectl get pods -n mwalimu-prod
   ```

2. **Quick Recovery Attempts** (2-5 minutes)
   ```bash
   # Restart application services
   docker-compose -f docker-compose.prod.yml restart app
   
   # Or for Kubernetes
   kubectl rollout restart deployment/mwalimu-backend -n mwalimu-prod
   
   # Check logs for errors
   docker-compose logs --tail=100 app
   kubectl logs -f deployment/mwalimu-backend -n mwalimu-prod
   ```

3. **If Quick Recovery Fails** (5-15 minutes)
   ```bash
   # Check system resources
   htop
   df -h
   free -m
   
   # Check database connectivity
   python manage.py check --database default
   
   # Check Redis connectivity
   redis-cli -h redis-host ping
   ```

4. **Escalation** (15+ minutes)
   - Notify incident response team
   - Activate disaster recovery procedures
   - Update status page
   - Prepare for rollback if necessary

### Database Connectivity Issues

**Symptoms**: Database connection errors, timeout errors
**Response Time**: < 10 minutes

#### Troubleshooting Steps

1. **Check Database Status**
   ```bash
   # Test database connection
   python manage.py dbshell
   
   # Check active connections
   python manage.py monitor_database status
   
   # PostgreSQL specific checks
   psql -h db-host -U username -d database_name -c "SELECT version();"
   ```

2. **Connection Pool Issues**
   ```bash
   # Check connection pool status
   python manage.py monitor_database --check-connections
   
   # Reset connection pool
   docker-compose restart app
   
   # Check for long-running queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
   ```

3. **Database Recovery**
   ```bash
   # If database is corrupted
   python manage.py disaster_recovery recover --backup-id latest
   
   # Restart database service (if self-managed)
   sudo systemctl restart postgresql
   ```

### High Load / Performance Issues

**Symptoms**: Slow responses (>5 seconds), high CPU/memory usage
**Response Time**: < 15 minutes

#### Performance Recovery Steps

1. **Immediate Actions**
   ```bash
   # Check system resources
   top
   iostat -x 1 5
   
   # Scale application horizontally
   docker-compose -f docker-compose.prod.yml up -d --scale app=5
   
   # Or for Kubernetes
   kubectl scale deployment mwalimu-backend --replicas=5 -n mwalimu-prod
   ```

2. **Cache Optimization**
   ```bash
   # Warm critical caches
   python manage.py optimize_performance cache --warm
   
   # Clear problematic cache patterns
   python manage.py optimize_performance cache --clear --pattern "slow_*"
   
   # Check cache hit ratios
   python manage.py optimize_performance cache --stats
   ```

3. **Database Optimization**
   ```bash
   # Identify slow queries
   python manage.py optimize_performance database --analyze
   
   # Kill long-running queries
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'active' AND query_start < now() - interval '10 minutes';
   ```

## 🔄 Deployment Procedures

### Standard Deployment

**When**: Regular feature releases, bug fixes
**Frequency**: Weekly or bi-weekly

#### Pre-Deployment Checklist

- [ ] Code review completed
- [ ] Tests passing in CI/CD
- [ ] Staging environment tested
- [ ] Database migration plan reviewed
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

#### Deployment Steps

1. **Backup Current State**
   ```bash
   # Create backup before deployment
   python manage.py disaster_recovery backup --tier local --full
   
   # Tag current state
   git tag -a v1.2.3-pre-deploy -m "Pre-deployment backup"
   ```

2. **Deploy New Version**
   ```bash
   # Pull latest code
   git fetch origin
   git checkout v1.2.3
   
   # Run deployment script
   ./scripts/deploy-production.sh --version v1.2.3 --rolling-update
   ```

3. **Post-Deployment Verification**
   ```bash
   # Check application health
   curl -f https://yourschool.com/monitoring/health/
   
   # Run database migrations
   python manage.py migrate --check
   
   # Warm caches
   python manage.py optimize_performance cache --warm
   
   # Verify key functionality
   python manage.py test --tag=smoke_test
   ```

### Hotfix Deployment

**When**: Critical bugs, security issues
**Timeline**: Within 2 hours of issue identification

#### Hotfix Steps

1. **Emergency Preparation**
   ```bash
   # Create hotfix branch
   git checkout -b hotfix/critical-security-fix main
   
   # Make minimal necessary changes
   # Commit and push
   ```

2. **Fast-Track Deployment**
   ```bash
   # Skip normal approval process (with proper authorization)
   ./scripts/deploy-production.sh --hotfix --version hotfix-001
   
   # Monitor closely
   tail -f /var/log/mwalimu/application.log
   ```

3. **Post-Hotfix Actions**
   - Monitor system for 30 minutes
   - Update incident documentation
   - Schedule proper fix for next release

## 🛠️ Maintenance Procedures

### Weekly Maintenance Window

**Schedule**: Sundays 2:00 AM - 4:00 AM UTC
**Duration**: 2 hours maximum

#### Maintenance Checklist

1. **Pre-Maintenance** (30 minutes before)
   ```bash
   # Notify users of upcoming maintenance
   python manage.py send_maintenance_notification
   
   # Create backup
   python manage.py disaster_recovery backup --tier regional --full
   
   # Enable maintenance mode
   echo "maintenance" > /var/www/maintenance_mode
   ```

2. **System Updates** (30 minutes)
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Update Docker images
   docker-compose -f docker-compose.prod.yml pull
   
   # Restart services with new images
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Database Maintenance** (45 minutes)
   ```bash
   # Run database optimization
   python manage.py optimize_database optimize --all
   
   # Vacuum and analyze
   python manage.py optimize_database vacuum --analyze
   
   # Update statistics
   python manage.py optimize_database --update-stats
   ```

4. **Performance Optimization** (30 minutes)
   ```bash
   # Clear old cache entries
   python manage.py optimize_performance cache --cleanup
   
   # Optimize assets
   python manage.py optimize_performance assets --minify --optimize-images
   
   # Warm critical caches
   python manage.py optimize_performance cache --warm
   ```

5. **Post-Maintenance** (15 minutes)
   ```bash
   # Disable maintenance mode
   rm /var/www/maintenance_mode
   
   # Verify system health
   python manage.py monitor_health --full-check
   
   # Send completion notification
   python manage.py send_maintenance_complete_notification
   ```

### Monthly Security Maintenance

**Schedule**: First Sunday of each month
**Duration**: 3 hours

#### Security Maintenance Tasks

1. **Security Scanning**
   ```bash
   # Run comprehensive security audit
   python manage.py security_audit --full-scan
   
   # Check for dependency vulnerabilities
   safety check
   pip-audit
   
   # Update security configurations
   python manage.py security_audit --update-configs
   ```

2. **Access Review**
   ```bash
   # Review user accounts
   python manage.py security_audit --check-users
   
   # Remove inactive users
   python manage.py cleanup_inactive_users --days 90
   
   # Review admin access logs
   grep "ADMIN_LOGIN" /var/log/mwalimu/security.log | tail -100
   ```

3. **Certificate Management**
   ```bash
   # Check SSL certificate status
   ./nginx/ssl/setup-ssl.sh --check
   
   # Renew certificates if needed
   certbot renew --nginx
   
   # Verify SSL configuration
   ./nginx/ssl/setup-ssl.sh --verify
   ```

## 📊 Monitoring and Alerting Procedures

### Daily Health Checks

**Schedule**: Every day at 9:00 AM local time
**Duration**: 15 minutes

#### Health Check Steps

1. **System Overview**
   ```bash
   # Generate daily health report
   python manage.py monitor_health --daily-report
   
   # Check system resources
   python manage.py monitor_health --check-resources
   
   # Verify backup status
   python manage.py disaster_recovery status --last-24h
   ```

2. **Performance Review**
   ```bash
   # Generate performance report
   python manage.py optimize_performance monitor --report --hours 24
   
   # Check slow queries
   python manage.py optimize_performance database --analyze
   
   # Review cache performance
   python manage.py optimize_performance cache --stats
   ```

3. **Security Review**
   ```bash
   # Check security events
   python manage.py security_audit --daily-check
   
   # Review failed login attempts
   grep "LOGIN_FAILED" /var/log/mwalimu/security.log | tail -20
   
   # Check for suspicious activity
   python manage.py security_audit --check-anomalies
   ```

### Alert Response Procedures

#### Critical Alert Response (< 15 minutes)

**Application Down**
1. Acknowledge alert in monitoring system
2. Follow "System Down" emergency procedure
3. Update status page
4. Notify stakeholders if outage > 15 minutes

**Database Issues**
1. Check database connectivity and performance
2. Review recent changes and deployments
3. Consider failover to read replica if available
4. Engage database administrator if needed

**Security Alert**
1. Isolate affected systems immediately
2. Preserve logs and evidence
3. Assess impact and scope
4. Follow security incident response procedure

#### Warning Alert Response (< 1 hour)

**High Resource Usage**
1. Identify resource bottleneck
2. Scale resources if auto-scaling unavailable
3. Investigate root cause
4. Plan capacity upgrades if needed

**Performance Degradation**
1. Analyze performance metrics
2. Check for slow queries or cache issues
3. Optimize immediate bottlenecks
4. Schedule deeper investigation

**Backup Failure**
1. Investigate backup failure cause
2. Attempt manual backup
3. Verify backup integrity
4. Fix underlying issues

## 🔐 Security Incident Response

### Incident Classification

**Level 1 - Critical**
- Data breach or unauthorized access to sensitive data
- System compromise or malware detection
- Service disruption due to security incident

**Level 2 - High**
- Attempted unauthorized access
- Vulnerability exploitation attempts
- Security policy violations

**Level 3 - Medium**
- Security misconfigurations
- Failed security scans
- Suspicious but unconfirmed activity

### Response Procedures

#### Level 1 Incident Response (< 30 minutes)

1. **Immediate Containment**
   ```bash
   # Isolate affected systems
   iptables -A INPUT -s suspicious_ip -j DROP
   
   # Disable compromised accounts
   python manage.py security_audit --disable-user suspicious_user
   
   # Enable enhanced logging
   python manage.py security_audit --enable-forensic-mode
   ```

2. **Evidence Preservation**
   ```bash
   # Preserve system state
   tar -czf /tmp/forensic_$(date +%Y%m%d_%H%M%S).tar.gz /var/log/
   
   # Memory dump (if required)
   dd if=/dev/mem of=/tmp/memory_dump_$(date +%Y%m%d_%H%M%S).bin
   
   # Network capture
   tcpdump -w /tmp/network_capture_$(date +%Y%m%d_%H%M%S).pcap
   ```

3. **Notification**
   - Security team (immediate)
   - Management (within 1 hour)
   - Legal team (within 4 hours)
   - Regulatory authorities (within 72 hours if required)

## 📋 Change Management

### Standard Change Process

**Timeline**: 5-10 business days
**Approval Required**: Yes

#### Change Request Steps

1. **Planning Phase**
   - Create change request ticket
   - Define scope and impact
   - Develop implementation plan
   - Identify rollback procedures

2. **Approval Phase**
   - Technical review
   - Security review
   - Management approval
   - Schedule maintenance window

3. **Implementation Phase**
   - Follow deployment procedures
   - Monitor system during change
   - Verify success criteria
   - Document results

### Emergency Change Process

**Timeline**: 2-4 hours
**Approval Required**: Post-implementation

#### Emergency Change Steps

1. **Authorization**
   - Get verbal approval from authorized manager
   - Document business justification
   - Assess risk vs. impact of not changing

2. **Implementation**
   - Follow emergency deployment procedures
   - Monitor system closely
   - Document all actions taken

3. **Post-Implementation**
   - Submit formal change request
   - Conduct post-change review
   - Update procedures if needed

## 🔧 Troubleshooting Reference

### Common Error Patterns

#### Database Connection Errors
```
Error: FATAL: too many connections for role
Solution: Check connection pool configuration, restart application
Command: python manage.py monitor_database --check-connections
```

#### Cache Connection Errors
```
Error: Redis connection failed
Solution: Check Redis service, verify network connectivity
Command: redis-cli -h redis-host ping
```

#### SSL Certificate Errors
```
Error: Certificate expired or invalid
Solution: Renew SSL certificate, update configuration
Command: ./nginx/ssl/setup-ssl.sh --renew
```

### Performance Issues

#### High Memory Usage
```bash
# Find memory-consuming processes
ps aux --sort=-%mem | head -10

# Check for memory leaks
python manage.py monitor_health --check-memory-leaks

# Restart high-memory processes
docker-compose restart app
```

#### Slow Database Queries
```bash
# Identify slow queries
python manage.py optimize_performance database --analyze

# Check for blocking queries
SELECT * FROM pg_stat_activity WHERE state = 'active' AND waiting = true;

# Optimize specific queries
EXPLAIN ANALYZE SELECT * FROM problematic_query;
```

### Network Issues

#### Load Balancer Problems
```bash
# Check Nginx status
systemctl status nginx

# Test upstream servers
nginx -t
curl -H "Host: yourschool.com" http://backend-server:8000/health/

# Reload configuration
nginx -s reload
```

#### DNS Resolution Issues
```bash
# Check DNS resolution
nslookup yourschool.com
dig yourschool.com

# Check local DNS cache
systemctl status systemd-resolved
systemctl flush-dns
```

## 📞 Escalation Matrix

### Response Times by Severity

| Severity | Initial Response | Status Update | Resolution Target |
|----------|------------------|---------------|-------------------|
| Critical | 15 minutes | 30 minutes | 4 hours |
| High | 1 hour | 2 hours | 24 hours |
| Medium | 4 hours | 8 hours | 72 hours |
| Low | 24 hours | Weekly | 2 weeks |

### Contact Escalation Path

1. **Level 1**: On-call engineer
2. **Level 2**: Senior system administrator
3. **Level 3**: Infrastructure manager
4. **Level 4**: CTO/Technical director

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Review Schedule**: Quarterly