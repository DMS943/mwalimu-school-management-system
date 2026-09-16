# Environment Configuration Guide

This guide explains how to properly configure the Mwalimu School Management System for different environments.

## Overview

The application uses environment-specific configuration files to manage settings across development, staging, and production environments. This ensures security, maintainability, and proper separation of concerns.

## Configuration Structure

```
backend/config/
├── base.py          # Common settings shared across all environments
├── development.py   # Development-specific settings
├── staging.py       # Staging environment settings
├── production.py    # Production environment settings
└── settings.py      # Main settings file that loads environment-specific config
```

## Environment Files

### 1. Base Configuration (`base.py`)
Contains shared settings for all environments:
- Django core configuration
- Database settings (structure)
- REST Framework configuration with security defaults
- JWT authentication settings
- Logging framework setup
- Cache configuration structure

### 2. Development Configuration (`development.py`)
Optimized for local development:
- `DEBUG = True`
- Permissive CORS settings
- Console email backend
- Local memory cache
- Extended JWT token lifetime for convenience
- Optional debug toolbar and profiling tools

### 3. Staging Configuration (`staging.py`)
Mirrors production but with relaxed settings for testing:
- `DEBUG = False` (can be overridden)
- Production-like security with testing flexibility
- Optional debug tools for troubleshooting
- Longer JWT tokens for easier testing
- More verbose logging

### 4. Production Configuration (`production.py`)
Hardened for production deployment:
- `DEBUG = False`
- Full security headers and SSL enforcement
- Error reporting with Sentry integration
- Redis caching with connection pooling
- Structured JSON logging
- Rate limiting and security middleware

## Environment Variables

### Core Settings (All Environments)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ENVIRONMENT` | Environment type | `development` | No |
| `SECRET_KEY` | Django secret key | None | Yes |
| `DATABASE_NAME` | Database name | None | Yes |
| `DATABASE_USER` | Database user | None | Yes |
| `DATABASE_PASSWORD` | Database password | None | Yes* |
| `DATABASE_HOST` | Database host | `localhost` | Yes |
| `DATABASE_PORT` | Database port | `5432` | No |

*Required for staging and production

### Security Settings (Production/Staging)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ALLOWED_HOSTS` | Allowed hostnames | None | Yes |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | None | Yes |
| `SECURE_SSL_REDIRECT` | Force SSL redirect | `True` | No |
| `SECURE_HSTS_SECONDS` | HSTS max age | `31536000` | No |

### JWT Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_ACCESS_TOKEN_HOURS` | Access token lifetime (hours) | `1` | No |
| `JWT_REFRESH_TOKEN_DAYS` | Refresh token lifetime (days) | `7` | No |

### Email Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `EMAIL_BACKEND` | Email backend class | Console | No |
| `EMAIL_HOST` | SMTP host | None | No |
| `EMAIL_PORT` | SMTP port | `587` | No |
| `EMAIL_USE_TLS` | Use TLS | `True` | No |
| `EMAIL_HOST_USER` | SMTP username | None | No |
| `EMAIL_HOST_PASSWORD` | SMTP password | None | No |
| `DEFAULT_FROM_EMAIL` | Default sender | `noreply@school.com` | No |

### Monitoring Settings (Production)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SENTRY_DSN` | Sentry error tracking DSN | None | No |
| `SENTRY_TRACES_SAMPLE_RATE` | Sentry sampling rate | `0.1` | No |
| `RELEASE_VERSION` | Application version | `unknown` | No |

### Cache Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection URL | `redis://127.0.0.1:6379/1` | No |

## Setup Instructions

### 1. Development Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your development settings:
   ```env
   ENVIRONMENT=development
   SECRET_KEY=your-development-secret-key
   DATABASE_NAME=school_management_dev
   DATABASE_USER=postgres
   DATABASE_PASSWORD=your-dev-password
   DATABASE_HOST=localhost
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements-dev.txt
   ```

4. Validate configuration:
   ```bash
   python manage.py validate_config --environment=development
   ```

### 2. Staging Setup

1. Copy the staging template:
   ```bash
   cp .env.example.staging .env.staging
   ```

2. Update staging-specific values:
   ```env
   ENVIRONMENT=staging
   SECRET_KEY=your-staging-secret-key
   DATABASE_HOST=your-staging-db-host
   ALLOWED_HOSTS=staging.yourdomain.com
   CORS_ALLOWED_ORIGINS=https://staging.yourdomain.com
   ```

3. Deploy with staging configuration:
   ```bash
   docker-compose -f docker-compose.staging.yml --env-file .env.staging up -d
   ```

4. Validate staging configuration:
   ```bash
   docker-compose -f docker-compose.staging.yml exec backend python manage.py validate_config --environment=staging
   ```

### 3. Production Setup

1. Copy the production template:
   ```bash
   cp .env.example.production .env.production
   ```

2. **IMPORTANT**: Update all production values:
   ```env
   ENVIRONMENT=production
   SECRET_KEY=your-very-secure-production-secret-key-minimum-50-characters
   DATABASE_PASSWORD=your-secure-production-password
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   CORS_ALLOWED_ORIGINS=https://yourdomain.com
   SENTRY_DSN=your-sentry-dsn
   EMAIL_HOST=smtp.yourprovider.com
   EMAIL_HOST_USER=your-email@yourdomain.com
   EMAIL_HOST_PASSWORD=your-email-password
   ```

3. Deploy to production:
   ```bash
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

4. Validate production configuration:
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend python manage.py validate_config --environment=production --strict
   ```

## Configuration Validation

The system includes a management command to validate environment configuration:

```bash
# Validate development config
python manage.py validate_config

# Validate production config with strict checking
python manage.py validate_config --environment=production --strict

# Validate staging config
python manage.py validate_config --environment=staging
```

### Validation Checks

The validation command checks:
- ✅ Required environment variables are set
- ✅ Database connectivity
- ✅ Cache connectivity (if configured)
- ✅ Security settings for production
- ✅ Secret key strength
- ✅ SSL and HSTS configuration
- ✅ Email backend configuration
- ⚠️  Configuration warnings and recommendations

## Security Considerations

### Development Security
- Use different secret keys for each environment
- Never commit `.env` files to version control
- Use local databases, not production data
- Enable debug toolbar only on trusted networks

### Production Security
- Use a cryptographically strong SECRET_KEY (50+ characters)
- Enable all security headers and SSL redirects
- Use environment variables, never hardcode secrets
- Configure proper CORS origins
- Enable HSTS with long max-age
- Use secure session and CSRF cookies
- Configure proper database SSL connections
- Set up error monitoring with Sentry

### Secrets Management
- Store secrets in environment variables
- Use container orchestration secrets (Docker Swarm, Kubernetes)
- Consider using external secret management (HashiCorp Vault, AWS Secrets Manager)
- Rotate secrets regularly
- Never log or expose secrets in error messages

## Troubleshooting

### Common Issues

1. **Import Error on Settings**
   ```
   Solution: Ensure ENVIRONMENT variable is set correctly
   ```

2. **Database Connection Failed**
   ```
   Solution: Check DATABASE_* variables and network connectivity
   ```

3. **Secret Key Not Set**
   ```
   Solution: Generate a new secret key and set in environment
   ```

4. **CORS Errors in Production**
   ```
   Solution: Add your frontend domain to CORS_ALLOWED_ORIGINS
   ```

5. **SSL Redirect Issues**
   ```
   Solution: Set SECURE_SSL_REDIRECT=False temporarily or configure proper SSL
   ```

### Generating Secret Keys

```python
# Generate a new Django secret key
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

### Configuration Testing

```bash
# Test database connection
python manage.py dbshell

# Test cache connection
python manage.py shell -c "from django.core.cache import cache; print(cache.get('test', 'Cache working'))"

# Run configuration checks
python manage.py check --deploy

# Validate environment
python manage.py validate_config --strict
```

## Best Practices

1. **Environment Separation**
   - Use completely separate databases for each environment
   - Never use production data in development/staging
   - Keep environment configurations in separate files

2. **Secret Management**
   - Use different secrets for each environment
   - Store secrets in environment variables
   - Never commit secrets to version control
   - Rotate secrets regularly

3. **Configuration Management**
   - Validate configuration before deployment
   - Document all environment variables
   - Use configuration templates for new deployments
   - Test configuration changes in staging first

4. **Monitoring and Logging**
   - Configure appropriate logging for each environment
   - Set up error monitoring in production
   - Monitor configuration drift
   - Alert on configuration validation failures

5. **Security**
   - Enable all security features in production
   - Use HTTPS everywhere in production
   - Configure proper CORS policies
   - Regular security audits of configuration