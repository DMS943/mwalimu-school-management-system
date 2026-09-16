# CI/CD Pipeline Documentation

This document outlines the comprehensive CI/CD pipeline implemented for the Mwalimu School Management System, designed to ensure code quality, security, and reliable deployments.

## Table of Contents
1. [Pipeline Overview](#pipeline-overview)
2. [Stages and Jobs](#stages-and-jobs)
3. [Testing Strategy](#testing-strategy)
4. [Code Quality Checks](#code-quality-checks)
5. [Security Scanning](#security-scanning)
6. [Build and Deployment](#build-and-deployment)
7. [Monitoring and Validation](#monitoring-and-validation)
8. [Local Development](#local-development)
9. [Configuration Files](#configuration-files)
10. [Troubleshooting](#troubleshooting)

## Pipeline Overview

The CI/CD pipeline is implemented using GitLab CI/CD with comprehensive testing, quality checks, security scanning, and deployment automation. The pipeline supports both staging and production deployments with zero-downtime strategies.

### Pipeline Stages
1. **Validate** - Configuration and environment validation
2. **Test** - Unit tests, integration tests, and coverage analysis
3. **Quality** - Code quality, formatting, and complexity analysis
4. **Security** - Security scanning, dependency audits, and secrets detection
5. **Build** - Application building and Docker image creation
6. **Deploy** - Staging and production deployments
7. **Monitor** - Post-deployment health checks and performance validation

## Stages and Jobs

### 1. Validation Stage

#### validate-config
- **Purpose**: Validates CI configuration files and Python imports
- **Triggers**: Changes to `.gitlab-ci.yml`, config files, or environment files
- **Tools**: Python YAML parser, decouple validation

#### validate-environment  
- **Purpose**: Ensures all required environment variables are set
- **Checks**: SECRET_KEY, database credentials, external service configurations
- **Triggers**: Main branch and merge requests

### 2. Testing Stage

#### backend-unit-tests
- **Framework**: pytest with Django integration
- **Database**: PostgreSQL 15 (test instance)
- **Coverage**: Minimum 80% code coverage requirement
- **Features**:
  - Parallel test execution with pytest-xdist
  - Coverage reports in XML and terminal formats
  - JUnit XML output for CI integration
  - Database migrations verification
  - Django system checks

#### frontend-unit-tests
- **Framework**: Jest with React Testing Library
- **Features**:
  - Component unit tests
  - TypeScript type checking
  - ESLint code quality checks
  - Coverage reports in Cobertura format

#### integration-tests
- **Purpose**: End-to-end workflow testing
- **Services**: PostgreSQL + Redis test instances
- **Scope**: API workflows, data consistency, security workflows
- **Triggers**: Main branch and merge requests only

### 3. Quality Stage

#### code-quality-backend
- **Tools**:
  - **Black**: Code formatting validation (88 char line limit)
  - **isort**: Import sorting verification
  - **flake8**: PEP 8 compliance and Django-specific linting
  - **mypy**: Static type checking
  - **radon**: Cyclomatic complexity analysis
  - **bandit**: Security-focused static analysis

#### code-quality-frontend
- **Tools**:
  - **ESLint**: JavaScript/TypeScript linting
  - **Prettier**: Code formatting validation
  - **TypeScript**: Type checking
  - **npm audit**: Dependency vulnerability scanning

#### dependency-scan
- **Tools**:
  - **Safety**: Python package vulnerability database
  - **pip-audit**: Advanced Python dependency auditing
- **Output**: JSON reports for security tracking
- **Failure**: Allows failure to prevent blocking (alerts only)

### 4. Security Stage

#### security-audit
- **Purpose**: Application-level security validation
- **Database**: Isolated test instance for security checks
- **Command**: `python manage.py security_audit`
- **Output**: JSON security report

#### secrets-scan
- **Tool**: GitLeaks v8.18.0
- **Purpose**: Detect hardcoded secrets, API keys, and sensitive data
- **Scope**: Entire repository history
- **Output**: JSON report with findings

### 5. Build Stage

#### build-backend
- **Purpose**: Static file collection and deployment validation
- **Settings**: Production configuration validation
- **Output**: Collected static files for deployment
- **Triggers**: Main branch only

#### build-frontend
- **Purpose**: Production bundle creation
- **Validation**: Build size analysis and integrity checks
- **Output**: Optimized production bundle
- **Triggers**: Main branch only

#### build-docker-images
- **Registry**: GitLab Container Registry
- **Images**: Backend and frontend containers
- **Features**:
  - Multi-stage builds for optimization
  - Layer caching for faster builds
  - Security scanning integration
  - Tagged with commit SHA and latest

### 6. Deployment Stage

#### deploy-staging
- **Strategy**: SSH-based deployment to staging server
- **Process**:
  1. Code deployment via Git pull
  2. Dependency installation and updates
  3. Database migrations
  4. Static file collection
  5. Service restarts
  6. Health checks
- **Trigger**: Manual approval required
- **Environment**: `staging.yourschool.com`

#### deploy-production
- **Strategy**: Zero-downtime Docker deployment
- **Process**:
  1. Environment configuration creation
  2. Sequential container updates
  3. Health check validation (10 retries)
  4. Load balancer updates
  5. Final verification
- **Trigger**: Manual approval required
- **Environment**: `yourschool.com`

### 7. Monitoring Stage

#### post-deploy-monitoring
- **Wait Time**: 60 seconds for deployment stabilization
- **Endpoints Checked**:
  - `/monitoring/health/` - Application health
  - `/monitoring/ready/` - Readiness probe
  - `/monitoring/alive/` - Liveness probe
  - `/monitoring/metrics/` - System metrics
  - `/monitoring/database/` - Database health
- **Thresholds**:
  - Response time < 2 seconds
  - Database health score > 80
  - Zero failed endpoints

#### performance-test
- **Tool**: Apache Bench (ab)
- **Test**: 100 requests, 10 concurrent
- **Metrics**: Average response time, failed requests
- **Trigger**: Manual execution
- **Failure**: Non-blocking (reporting only)

## Testing Strategy

### Test Organization
```
backend/tests/
├── __init__.py
├── conftest.py          # Shared fixtures and configuration
├── test_users.py        # User authentication and security
├── test_monitoring.py   # Health checks and monitoring
└── integration/
    ├── __init__.py
    └── test_api_workflows.py  # End-to-end API testing
```

### Test Categories
- **Unit Tests**: Individual component testing with mocked dependencies
- **Integration Tests**: Cross-component workflow validation
- **Security Tests**: Authentication, authorization, and security features
- **Performance Tests**: Load testing and response time validation

### Coverage Requirements
- **Minimum**: 80% code coverage
- **Exclusions**: Migrations, test files, configuration files
- **Reporting**: Terminal output + XML for CI integration

## Code Quality Checks

### Python Code Quality
```bash
# Formatting
black --check --diff .

# Import sorting  
isort --check-only --diff .

# Linting
flake8 .

# Type checking
mypy apps/ --ignore-missing-imports

# Complexity analysis
radon cc apps/ --min B

# Security analysis
bandit -r apps/
```

### Configuration Files
- **pyproject.toml**: Black, isort, mypy, pytest configuration
- **.flake8**: Flake8 linting rules and exclusions
- **pytest.ini**: Test discovery and execution settings

## Security Scanning

### Vulnerability Detection
1. **Static Analysis**: Bandit scans for common security issues
2. **Dependency Scanning**: Safety and pip-audit check for known vulnerabilities
3. **Secrets Detection**: GitLeaks scans for hardcoded credentials
4. **Application Security**: Custom security audit command

### Security Reports
- **Format**: JSON output for automated processing
- **Storage**: Pipeline artifacts (1 week retention)
- **Integration**: Security dashboards and alerting systems

## Build and Deployment

### Docker Strategy
- **Multi-stage builds** for production optimization
- **Layer caching** for faster build times
- **Security scanning** integrated into build process
- **Registry management** with automatic cleanup

### Deployment Environments

#### Staging Environment
- **Purpose**: Pre-production validation
- **Access**: Internal team access only
- **Data**: Anonymized production data subset
- **Monitoring**: Full monitoring stack enabled

#### Production Environment
- **Strategy**: Blue-green deployment via Docker
- **Rollback**: Automatic rollback on health check failures
- **Monitoring**: Real-time health monitoring and alerting
- **Backup**: Automated backup verification before deployment

## Monitoring and Validation

### Health Check Endpoints
```bash
# Application health (comprehensive)
GET /monitoring/health/

# Kubernetes readiness probe
GET /monitoring/ready/

# Kubernetes liveness probe  
GET /monitoring/alive/

# System metrics (authenticated)
GET /monitoring/metrics/

# Database health (authenticated)
GET /monitoring/database/

# Prometheus metrics
GET /monitoring/prometheus/
```

### Performance Monitoring
- **Response Time**: < 2 seconds for health endpoints
- **Database Performance**: Health score > 80
- **System Resources**: CPU < 80%, Memory < 85%
- **Error Rates**: < 1% for critical endpoints

## Local Development

### Pre-commit Hooks
```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

### Development Tools
```bash
# Run tests locally
cd backend
pytest --cov=apps -v

# Code quality checks
black .
isort .
flake8 .
mypy apps/

# Security scan
bandit -r apps/
safety check
```

### IDE Integration
- **VS Code**: Python extension with linting and formatting
- **PyCharm**: Configured code style and inspection profiles
- **Pre-commit**: Automatic code quality on commit

## Configuration Files

### Pipeline Configuration
- **`.gitlab-ci.yml`**: Main CI/CD pipeline definition
- **`.github/workflows/ci.yml`**: GitHub Actions alternative
- **`.pre-commit-config.yaml`**: Pre-commit hooks configuration

### Code Quality
- **`backend/pyproject.toml`**: Python tooling configuration
- **`backend/.flake8`**: Flake8 linting rules
- **`backend/pytest.ini`**: Pytest test configuration

### Testing
- **`backend/config/testing.py`**: Test-specific Django settings
- **`backend/tests/conftest.py`**: Shared test fixtures
- **`backend/requirements-dev.txt`**: Development dependencies

## Troubleshooting

### Common Issues

#### Test Failures
1. **Database Connection**: Check PostgreSQL service in CI
2. **Environment Variables**: Verify all required variables are set
3. **Dependencies**: Check for version conflicts in requirements files
4. **Migrations**: Ensure migrations are committed and valid

#### Build Failures
1. **Static Files**: Check STATIC_ROOT and STATICFILES_DIRS
2. **Docker Images**: Verify Dockerfile syntax and build context
3. **Registry Access**: Check GitLab registry permissions
4. **Resource Limits**: Monitor CI runner resources

#### Deployment Issues
1. **Health Checks**: Review application logs and monitoring
2. **Environment Config**: Verify production environment variables
3. **Database Migrations**: Check migration status and conflicts
4. **Service Dependencies**: Ensure external services are available

#### Security Scan Failures
1. **False Positives**: Review and whitelist known safe patterns
2. **Dependency Updates**: Update packages with known vulnerabilities
3. **Secret Detection**: Remove or properly secure detected secrets
4. **Security Audit**: Address findings from custom security checks

### Debug Commands
```bash
# Local pipeline testing
gitlab-runner exec docker backend-unit-tests

# Database connection test
python manage.py dbshell

# Security audit manual run
python manage.py security_audit --verbose

# Health check validation
curl -v http://localhost:8000/monitoring/health/

# Container debugging
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml exec backend bash
```

### Performance Optimization
1. **Cache Usage**: Leverage pipeline caching for dependencies
2. **Parallel Execution**: Use pytest-xdist for faster tests
3. **Image Optimization**: Multi-stage Docker builds
4. **Resource Allocation**: Appropriate CI runner sizing

## Pipeline Metrics

### Key Performance Indicators
- **Pipeline Success Rate**: > 95%
- **Average Pipeline Duration**: < 15 minutes
- **Test Coverage**: > 80%
- **Security Scan Pass Rate**: 100%
- **Deployment Success Rate**: > 99%

### Monitoring and Alerting
- **Pipeline Failures**: Immediate Slack/email notifications
- **Security Issues**: High-priority alerts for security findings
- **Performance Degradation**: Automated alerts for slow pipelines
- **Deployment Monitoring**: Real-time deployment status tracking

This comprehensive CI/CD pipeline ensures high code quality, security, and reliable deployments for the Mwalimu School Management System, supporting both development velocity and production stability.