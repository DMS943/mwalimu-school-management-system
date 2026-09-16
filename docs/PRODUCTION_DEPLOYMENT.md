# Production Deployment with Load Balancing and SSL

This document provides comprehensive instructions for deploying the Mwalimu School Management System in production with load balancing, SSL certificates, and scalable infrastructure.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Deployment Options](#deployment-options)
3. [SSL Configuration](#ssl-configuration)
4. [Load Balancing](#load-balancing)
5. [Docker Compose Deployment](#docker-compose-deployment)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Security Considerations](#security-considerations)
9. [Performance Optimization](#performance-optimization)
10. [Maintenance and Updates](#maintenance-and-updates)

## Architecture Overview

The production deployment includes:

- **Load Balancer**: Nginx with SSL termination and multiple backend instances
- **Backend Services**: 3 Django/Gunicorn instances for high availability
- **Cache Layer**: Redis for session management and application caching
- **SSL/TLS**: Automated Let's Encrypt certificates with auto-renewal
- **Monitoring**: Prometheus, Grafana, and custom health checks
- **File Storage**: Persistent volumes for static files, media, and backups

### High-Level Architecture

```
Internet → Nginx Load Balancer → Backend Instances → Database (Supabase)
                ↓                      ↓
         SSL Termination         Redis Cache
                ↓                      ↓
         Static Files             Monitoring
```

## Deployment Options

### Option 1: Docker Compose (Recommended for smaller deployments)
- Easier setup and management
- Suitable for single-server deployments
- Built-in health checks and restart policies
- Resource limits and networking

### Option 2: Kubernetes (Recommended for enterprise/scalable deployments)
- Horizontal pod autoscaling
- Advanced networking and service mesh
- Built-in secrets management
- Rolling updates and rollbacks

## SSL Configuration

### Automated SSL with Let's Encrypt

The system includes automated SSL certificate management:

```bash
# Setup SSL certificates
cd nginx/ssl
chmod +x setup-ssl.sh

# Production certificates
./setup-ssl.sh production

# Staging/test certificates
./setup-ssl.sh staging
```

### SSL Features
- **Automatic Renewal**: Certificates auto-renew 30 days before expiration
- **Security Headers**: HSTS, CSP, and other security headers
- **Perfect Forward Secrecy**: Modern cipher suites and protocols
- **OCSP Stapling**: Improved certificate verification performance

### Manual SSL Configuration

For custom certificates:

```bash
# Copy certificates to nginx/ssl/
cp your-cert.pem nginx/ssl/fullchain.pem
cp your-key.pem nginx/ssl/privkey.pem

# Update nginx configuration with certificate paths
# Restart nginx container
```

## Load Balancing

### Nginx Configuration Features

- **Load Balancing Algorithm**: Least connections with session persistence
- **Health Checks**: Automatic backend health monitoring
- **Failover**: Automatic failover to backup instances
- **Rate Limiting**: API and authentication endpoint protection
- **Caching**: Static file caching and compression

### Backend Instance Configuration

```yaml
upstream backend_servers {
    least_conn;
    server backend_1:8000 weight=1 max_fails=3 fail_timeout=30s;
    server backend_2:8000 weight=1 max_fails=3 fail_timeout=30s;
    server backend_3:8000 weight=1 max_fails=3 fail_timeout=30s backup;
    
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}
```

## Docker Compose Deployment

### Prerequisites

1. **Docker & Docker Compose** installed
2. **Domain name** pointing to your server
3. **Environment variables** configured
4. **SSL certificates** (optional - can be auto-generated)

### Deployment Steps

```bash
# 1. Clone and configure
git clone <repository>
cd mwalimu-school-management-system
cp .env.example.production .env.production

# 2. Configure environment variables
vim .env.production  # Update with your values

# 3. Deploy with automation script
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh -m docker -e production -s

# 4. Verify deployment
curl -f https://yourschool.com/monitoring/health/
```

### Manual Docker Deployment

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml --env-file .env.production build
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Docker Resource Configuration

```yaml
# Resource limits per service
backend_1:
  deploy:
    resources:
      limits:
        memory: 1G
        cpus: '1.0'
      reservations:
        memory: 512M
        cpus: '0.5'

nginx:
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '0.5'
```

## Kubernetes Deployment

### Prerequisites

1. **Kubernetes cluster** (v1.20+)
2. **kubectl** configured
3. **Ingress controller** (nginx-ingress recommended)
4. **cert-manager** for SSL automation
5. **Storage classes** configured

### Deployment Steps

```bash
# 1. Configure kubectl context
kubectl config use-context your-production-cluster

# 2. Deploy with automation script
./scripts/deploy-production.sh -m kubernetes -e production

# 3. Verify deployment
kubectl get pods -n mwalimu-school
kubectl get ingress -n mwalimu-school
```

### Manual Kubernetes Deployment

```bash
# Apply manifests in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/persistent-volumes.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/nginx-deployment.yaml

# Check deployment status
kubectl rollout status deployment/backend-deployment -n mwalimu-school
kubectl rollout status deployment/nginx-deployment -n mwalimu-school
```

### Kubernetes Features

#### Horizontal Pod Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-deployment
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Rolling Updates
```bash
# Update image
kubectl set image deployment/backend-deployment backend=new-image:tag -n mwalimu-school

# Rollback if needed
kubectl rollout undo deployment/backend-deployment -n mwalimu-school
```

## Monitoring and Alerting

### Health Check Endpoints

- **Health**: `/monitoring/health/` - Comprehensive application health
- **Ready**: `/monitoring/ready/` - Kubernetes readiness probe
- **Alive**: `/monitoring/alive/` - Kubernetes liveness probe
- **Metrics**: `/monitoring/metrics/` - System and application metrics
- **Database**: `/monitoring/database/` - Database health and performance

### Prometheus Integration

```yaml
# Prometheus scrape configuration
scrape_configs:
  - job_name: 'school-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/monitoring/prometheus/'
```

### Alert Examples

```yaml
# High error rate alert
- alert: HighErrorRate
  expr: rate(django_http_responses_total{status=~"5.."}[5m]) > 0.1
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High Error Rate Detected"
    description: "Error rate is {{ $value | humanizePercentage }}"
```

### Grafana Dashboards

Key metrics to monitor:

1. **Application Metrics**
   - Request rate and response time
   - Error rates by endpoint
   - Database query performance
   - Active users and sessions

2. **Infrastructure Metrics**
   - CPU, memory, and disk usage
   - Network traffic
   - Container restarts
   - Load balancer metrics

3. **Business Metrics**
   - Student activity
   - Report generation
   - Authentication events
   - Data backup status

## Security Considerations

### Network Security

```yaml
# Network policies for pod isolation
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx
```

### Security Headers

```nginx
# Security headers in nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
```

### Secrets Management

- Use Kubernetes secrets or external secret managers
- Rotate secrets regularly
- Encrypt secrets at rest
- Limit secret access with RBAC

## Performance Optimization

### Database Optimization

```python
# Gunicorn configuration for production
workers = 4
worker_class = 'gevent'
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 5
```

### Caching Strategy

```python
# Redis configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/0',
        'OPTIONS': {
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            },
        }
    }
}
```

### Static File Optimization

```nginx
# Static file caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    gzip_static on;
}
```

## Maintenance and Updates

### Zero-Downtime Deployments

#### Docker Compose Strategy
1. Deploy new containers alongside existing ones
2. Health check new containers
3. Update load balancer configuration
4. Remove old containers

#### Kubernetes Strategy
1. Rolling update deployment
2. Readiness probes ensure traffic only goes to healthy pods
3. Automatic rollback on failure

### Database Migrations

```bash
# Run migrations during deployment
kubectl exec -n mwalimu-school deployment/backend-deployment -- \
    python manage.py migrate --noinput

# Backup before major migrations
kubectl exec -n mwalimu-school deployment/backend-deployment -- \
    python manage.py backup_database backup --compress
```

### Backup Procedures

```bash
# Automated daily backups
0 2 * * * /opt/scripts/backup_scheduler.py daily

# Manual backup
python manage.py backup_database backup --compress --s3-upload

# Restore from backup
python manage.py backup_database restore --file backup_20240315_120000.sql.gz
```

### Update Procedures

1. **Pre-deployment**
   - Create database backup
   - Run tests in staging environment
   - Review deployment plan

2. **Deployment**
   - Deploy to staging first
   - Run smoke tests
   - Deploy to production with zero-downtime strategy

3. **Post-deployment**
   - Verify health checks
   - Monitor error rates
   - Check business metrics

### Rollback Procedures

```bash
# Docker Compose rollback
docker-compose -f docker-compose.prod.yml down
# Restore from backup if needed
# Deploy previous version

# Kubernetes rollback
kubectl rollout undo deployment/backend-deployment -n mwalimu-school
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   openssl x509 -in /etc/letsencrypt/live/yourschool.com/cert.pem -text -noout
   
   # Renew certificate manually
   certbot renew --nginx
   ```

2. **Load Balancer Issues**
   ```bash
   # Check nginx configuration
   nginx -t
   
   # View nginx logs
   docker-compose -f docker-compose.prod.yml logs nginx
   ```

3. **Backend Health Issues**
   ```bash
   # Check application logs
   kubectl logs -n mwalimu-school deployment/backend-deployment
   
   # Run health check manually
   curl -f http://backend:8000/monitoring/health/
   ```

### Performance Issues

1. **High Response Times**
   - Check database query performance
   - Review application logs for slow operations
   - Monitor system resources

2. **High Error Rates**
   - Check application logs for exceptions
   - Verify database connectivity
   - Check external service dependencies

3. **Resource Exhaustion**
   - Monitor CPU and memory usage
   - Check for memory leaks
   - Review scaling configuration

## Support and Documentation

- **Health Dashboards**: Access via monitoring endpoints
- **Log Aggregation**: Centralized logging with structured JSON
- **Alert Notifications**: Slack, email, and PagerDuty integration
- **Documentation**: Runbooks and troubleshooting guides

This production deployment provides enterprise-grade reliability, security, and scalability for the Mwalimu School Management System.