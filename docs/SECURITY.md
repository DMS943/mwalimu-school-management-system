# Security Documentation

This document outlines the security measures implemented in the Mwalimu School Management System to protect against common web application vulnerabilities and ensure data protection.

## Security Features Overview

### 1. Authentication & Authorization Security

#### Enhanced User Model
- **Account Locking**: Automatic account lockout after 5 failed login attempts
- **Password Aging**: Forced password change every 90 days
- **Strong Password Requirements**: Minimum 8 characters with uppercase, lowercase, digits, and special characters
- **Login Attempt Tracking**: Failed login attempts are tracked and logged
- **Role-Based Access Control**: Granular permissions based on user roles

#### JWT Token Security
- **Short-lived Access Tokens**: 1-hour expiration in production
- **Token Rotation**: Refresh tokens are rotated on use
- **Token Blacklisting**: Revoked tokens are blacklisted
- **Secure Token Storage**: Tokens include user identification and expiration

### 2. Input Validation & Sanitization

#### Custom Validators
- **SQL Injection Prevention**: Pattern matching for common SQL injection attempts
- **XSS Prevention**: HTML/JavaScript content validation
- **Safe Text Validation**: General text field sanitization
- **Username Validation**: Alphanumeric characters with limited special characters
- **File Upload Validation**: File type and name validation

#### Middleware Protection
- **Input Validation Middleware**: Automatic request body and parameter validation
- **Honeypot Fields**: Bot detection in forms
- **CSRF Protection**: Cross-site request forgery prevention
- **Request Size Limits**: Maximum request size enforcement

### 3. Rate Limiting & DDoS Protection

#### Rate Limiting Rules
- **Login Attempts**: 5 attempts per 5 minutes per user, 10 per hour per IP
- **API Requests**: 100/hour for anonymous, 1000/hour for authenticated users
- **Password Reset**: 3 requests per hour per IP
- **User Registration**: 5 registrations per hour per IP

#### Implementation
- **Redis-based Counting**: Efficient rate limit storage
- **IP-based Limiting**: Protection against distributed attacks
- **User-based Limiting**: Per-user rate limiting for authenticated requests
- **Graceful Degradation**: Rate limit information in responses

### 4. Security Headers & HTTPS

#### HTTP Security Headers
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **X-Content-Type-Options**: Prevents MIME sniffing attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Browser XSS protection
- **Referrer Policy**: Controls referrer information
- **Permissions Policy**: Disables dangerous browser features

#### HTTPS Configuration
- **SSL Redirect**: Automatic HTTPS redirection in production
- **HSTS**: HTTP Strict Transport Security with 1-year max-age
- **Secure Cookies**: Session and CSRF cookies marked as secure
- **HSTS Preload**: Eligible for browser HSTS preload lists

### 5. Logging & Monitoring

#### Security Event Logging
- **Authentication Events**: Login/logout, failed attempts, account lockouts
- **Authorization Events**: Permission denials, privilege escalations
- **Input Validation**: Malicious input attempts, validation failures
- **Rate Limiting**: Rate limit violations and patterns
- **Administrative Actions**: User management, permission changes

#### Log Format & Storage
- **Structured Logging**: JSON format for easy parsing
- **Log Rotation**: Automatic log file rotation (50MB max, 5 backups)
- **Secure Storage**: Logs stored with appropriate file permissions
- **Correlation IDs**: Request tracking across services

### 6. File Upload Security

#### File Validation
- **Extension Whitelist**: Only allowed file types accepted
- **MIME Type Validation**: Content type verification
- **File Size Limits**: Maximum 5MB per file
- **Filename Sanitization**: Dangerous filename pattern prevention
- **Virus Scanning**: Ready for integration with antivirus solutions

#### Storage Security
- **Separate Storage**: Media files stored outside web root
- **Access Controls**: Proper file permissions and access restrictions
- **URL Security**: No direct file system access through URLs

### 7. Database Security

#### Connection Security
- **SSL Connections**: Encrypted database connections in production
- **Connection Pooling**: Efficient connection management
- **Connection Timeouts**: Automatic connection timeout handling
- **Credential Management**: Secure database credential storage

#### Query Security
- **ORM Usage**: Django ORM prevents most SQL injection
- **Parameterized Queries**: All database queries are parameterized
- **Input Validation**: All inputs validated before database operations
- **Transaction Management**: Proper transaction handling and rollback

### 8. Session Security

#### Session Configuration
- **Secure Session Cookies**: HTTPOnly and Secure flags set
- **Session Timeout**: 24-hour session expiration
- **Session Regeneration**: New session ID on login
- **Cross-Origin Protection**: SameSite cookie attribute

#### Cache-based Sessions
- **Redis Storage**: Sessions stored in Redis for scalability
- **Encryption**: Session data encrypted in storage
- **Expiration**: Automatic session cleanup

### 9. Error Handling & Information Disclosure

#### Secure Error Handling
- **Generic Error Messages**: No sensitive information in error responses
- **Detailed Logging**: Full error details logged securely
- **Custom Exception Handler**: Consistent error response format
- **Debug Mode Protection**: Debug information disabled in production

#### Information Disclosure Prevention
- **Server Header Removal**: Web server information hidden
- **Version Information**: Framework versions not exposed
- **Path Information**: File system paths not revealed in errors
- **Database Errors**: Database schema information protected

### 10. API Security

#### Authentication
- **JWT Bearer Tokens**: Secure API authentication
- **Token Expiration**: Short-lived access tokens
- **Refresh Token Rotation**: Secure token refresh mechanism
- **Role-based Authorization**: API endpoints protected by user roles

#### Request/Response Security
- **Content Type validation**: Strict content type enforcement
- **Response Headers**: Security headers on all API responses
- **CORS Configuration**: Properly configured cross-origin requests
- **API Rate Limiting**: Per-endpoint rate limiting

## Security Configuration

### Environment Variables

#### Production Security Settings
```env
# SSL/HTTPS
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000

# IP Whitelisting (optional)
ADMIN_IP_WHITELIST=192.168.1.0/24,10.0.0.0/8
API_IP_WHITELIST=

# Monitoring
SENTRY_DSN=your-sentry-dsn
SENTRY_TRACES_SAMPLE_RATE=0.1
```

#### Development Security Settings
```env
# Relaxed settings for development
SECURE_SSL_REDIRECT=False
SECURE_HSTS_SECONDS=0
ENABLE_DEBUG_TOOLBAR=False
```

### Middleware Configuration

The security middleware stack is automatically configured based on environment:

1. **SecurityHeadersMiddleware**: Adds security headers
2. **RateLimitMiddleware**: Implements rate limiting
3. **InputValidationMiddleware**: Validates and sanitizes input
4. **IPWhitelistMiddleware**: IP-based access control
5. **RequestLoggingMiddleware**: Security event logging

### Password Policy

#### Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one digit
- At least one special character
- Cannot be similar to username or personal information
- Cannot be a commonly used password

#### Enforcement
- Password strength validation on creation/change
- Password aging (90-day expiration)
- Password history prevention (coming soon)
- Forced password change for compromised accounts

## Security Monitoring

### Key Metrics to Monitor

1. **Authentication Failures**: Failed login attempts and patterns
2. **Rate Limit Violations**: Unusual request patterns
3. **Input Validation Failures**: Potential attack attempts
4. **Account Lockouts**: Suspicious account activity
5. **Permission Denials**: Unauthorized access attempts
6. **Error Rates**: Unusual error patterns

### Alerting Setup

Configure alerts for:
- Multiple failed logins from same IP
- SQL injection or XSS attempts
- Rate limit violations
- Account lockout spikes
- Permission escalation attempts

### Log Analysis

Search for these patterns in logs:
```bash
# Failed authentication attempts
grep "Failed login attempt" /path/to/logs/

# Malicious input detection
grep "Malicious content detected" /path/to/logs/

# Rate limit violations
grep "Rate limit exceeded" /path/to/logs/

# Permission denials
grep "Permission denied" /path/to/logs/
```

## Security Testing

### Regular Security Checks

1. **Dependency Scanning**: Regular updates and vulnerability scanning
2. **Code Analysis**: Static analysis for security issues
3. **Penetration Testing**: Regular security assessments
4. **Configuration Review**: Security configuration audits

### Security Tools Integration

- **Bandit**: Python security linting
- **Safety**: Dependency vulnerability scanning  
- **OWASP ZAP**: Web application security testing
- **Semgrep**: Static analysis security scanning

### Testing Commands

```bash
# Run security linting
bandit -r backend/

# Check for vulnerable dependencies
safety check

# Validate configuration
python manage.py validate_config --environment=production --strict

# Run security-focused tests
python manage.py test apps.core.tests.SecurityTests
```

## Incident Response

### Security Incident Types

1. **Authentication Bypass**: Unauthorized access to accounts
2. **Data Breach**: Unauthorized access to sensitive data
3. **Injection Attacks**: SQL injection or XSS attempts
4. **DDoS Attacks**: Service disruption attempts
5. **Privilege Escalation**: Unauthorized permission elevation

### Response Procedures

1. **Immediate Response**: 
   - Lock affected accounts
   - Block malicious IPs
   - Review logs for extent of breach

2. **Investigation**:
   - Analyze attack vectors
   - Determine data exposure
   - Document incident timeline

3. **Containment**:
   - Patch vulnerabilities
   - Update security configurations
   - Notify affected users if required

4. **Recovery**:
   - Restore services
   - Monitor for further attacks
   - Implement additional protections

## Compliance & Privacy

### Data Protection

- **Data Minimization**: Only collect necessary data
- **Encryption**: Sensitive data encrypted at rest and in transit
- **Access Controls**: Strict access controls on personal data
- **Data Retention**: Automatic cleanup of old data
- **Audit Trails**: Complete audit logs for data access

### Privacy Controls

- **User Consent**: Clear consent for data collection
- **Data Export**: Users can export their data
- **Data Deletion**: Users can request data deletion
- **Privacy Policy**: Clear privacy policy and data usage

## Security Updates

### Keeping Security Current

1. **Regular Updates**: Keep all dependencies updated
2. **Security Patches**: Apply security patches promptly  
3. **Configuration Review**: Regular security configuration audits
4. **Monitoring Updates**: Keep monitoring and alerting current

### Update Schedule

- **Critical Security Updates**: Applied immediately
- **Regular Updates**: Monthly security update cycle
- **Configuration Review**: Quarterly security configuration review
- **Penetration Testing**: Annual third-party security assessment

---

For security questions or to report security issues, please contact the security team following our responsible disclosure policy.