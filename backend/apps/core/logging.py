"""
Enhanced logging utilities for the School Management System.
"""
import logging
import json
import traceback
from datetime import datetime
from django.conf import settings
from django.utils import timezone


class SecurityEventLogger:
    """Logger for security-related events."""
    
    def __init__(self):
        self.logger = logging.getLogger('security')
    
    def log_login_attempt(self, username, success, ip_address, user_agent='', details=None):
        """Log login attempt."""
        event_data = {
            'event_type': 'login_attempt',
            'username': username,
            'success': success,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'timestamp': timezone.now().isoformat(),
            'details': details or {}
        }
        
        if success:
            self.logger.info(f"Successful login: {username}", extra=event_data)
        else:
            self.logger.warning(f"Failed login: {username}", extra=event_data)
    
    def log_permission_denied(self, user, resource, action, ip_address=''):
        """Log permission denied events."""
        event_data = {
            'event_type': 'permission_denied',
            'user_id': user.id if user and hasattr(user, 'id') else None,
            'username': user.username if user and hasattr(user, 'username') else 'Anonymous',
            'resource': resource,
            'action': action,
            'ip_address': ip_address,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.warning(f"Permission denied: {user} -> {resource}:{action}", extra=event_data)
    
    def log_suspicious_activity(self, event_type, description, user=None, ip_address='', details=None):
        """Log suspicious activity."""
        event_data = {
            'event_type': 'suspicious_activity',
            'activity_type': event_type,
            'description': description,
            'user_id': user.id if user and hasattr(user, 'id') else None,
            'username': user.username if user and hasattr(user, 'username') else 'Anonymous',
            'ip_address': ip_address,
            'timestamp': timezone.now().isoformat(),
            'details': details or {}
        }
        
        self.logger.error(f"Suspicious activity: {event_type} - {description}", extra=event_data)
    
    def log_account_lockout(self, username, ip_address='', reason='too_many_failed_attempts'):
        """Log account lockout events."""
        event_data = {
            'event_type': 'account_lockout',
            'username': username,
            'reason': reason,
            'ip_address': ip_address,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.warning(f"Account locked: {username} ({reason})", extra=event_data)
    
    def log_password_change(self, user, forced=False, ip_address=''):
        """Log password change events."""
        event_data = {
            'event_type': 'password_change',
            'user_id': user.id,
            'username': user.username,
            'forced': forced,
            'ip_address': ip_address,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.info(f"Password changed: {user.username} (forced={forced})", extra=event_data)


class ApplicationEventLogger:
    """Logger for application-specific events."""
    
    def __init__(self):
        self.logger = logging.getLogger('application')
    
    def log_user_creation(self, user, creator=None):
        """Log user creation events."""
        event_data = {
            'event_type': 'user_created',
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'creator_id': creator.id if creator else None,
            'creator_username': creator.username if creator else None,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.info(f"User created: {user.username} ({user.role})", extra=event_data)
    
    def log_user_deletion(self, user, deleter=None):
        """Log user deletion events."""
        event_data = {
            'event_type': 'user_deleted',
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'deleter_id': deleter.id if deleter else None,
            'deleter_username': deleter.username if deleter else None,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.warning(f"User deleted: {user.username}", extra=event_data)
    
    def log_role_change(self, user, old_role, new_role, changer=None):
        """Log role change events."""
        event_data = {
            'event_type': 'role_changed',
            'user_id': user.id,
            'username': user.username,
            'old_role': old_role,
            'new_role': new_role,
            'changer_id': changer.id if changer else None,
            'changer_username': changer.username if changer else None,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.warning(f"Role changed: {user.username} {old_role} -> {new_role}", extra=event_data)
    
    def log_data_export(self, user, data_type, record_count):
        """Log data export events."""
        event_data = {
            'event_type': 'data_export',
            'user_id': user.id,
            'username': user.username,
            'data_type': data_type,
            'record_count': record_count,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.info(f"Data export: {user.username} exported {record_count} {data_type} records", extra=event_data)
    
    def log_configuration_change(self, user, setting_name, old_value, new_value):
        """Log configuration changes."""
        event_data = {
            'event_type': 'configuration_change',
            'user_id': user.id,
            'username': user.username,
            'setting_name': setting_name,
            'old_value': str(old_value)[:100],  # Limit length for security
            'new_value': str(new_value)[:100],
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.warning(f"Configuration changed: {setting_name} by {user.username}", extra=event_data)


class PerformanceLogger:
    """Logger for performance monitoring."""
    
    def __init__(self):
        self.logger = logging.getLogger('performance')
    
    def log_slow_query(self, query, execution_time, params=None):
        """Log slow database queries."""
        event_data = {
            'event_type': 'slow_query',
            'query': query[:500],  # Limit query length
            'execution_time_ms': execution_time,
            'params': str(params)[:200] if params else None,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.warning(f"Slow query: {execution_time}ms", extra=event_data)
    
    def log_slow_request(self, request_path, method, execution_time, user=None, status_code=None):
        """Log slow HTTP requests."""
        event_data = {
            'event_type': 'slow_request',
            'path': request_path,
            'method': method,
            'execution_time_ms': execution_time,
            'status_code': status_code,
            'user_id': user.id if user and hasattr(user, 'id') else None,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.warning(f"Slow request: {method} {request_path} ({execution_time}ms)", extra=event_data)
    
    def log_cache_miss(self, cache_key, operation):
        """Log cache misses for optimization."""
        event_data = {
            'event_type': 'cache_miss',
            'cache_key': cache_key[:100],  # Limit key length
            'operation': operation,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.debug(f"Cache miss: {cache_key} ({operation})", extra=event_data)
    
    def log_memory_usage(self, component, memory_mb, threshold_mb=None):
        """Log high memory usage."""
        event_data = {
            'event_type': 'memory_usage',
            'component': component,
            'memory_mb': memory_mb,
            'threshold_mb': threshold_mb,
            'timestamp': timezone.now().isoformat()
        }
        
        if threshold_mb and memory_mb > threshold_mb:
            self.logger.warning(f"High memory usage: {component} ({memory_mb}MB)", extra=event_data)
        else:
            self.logger.debug(f"Memory usage: {component} ({memory_mb}MB)", extra=event_data)


class ErrorLogger:
    """Enhanced error logging with context."""
    
    def __init__(self):
        self.logger = logging.getLogger('errors')
    
    def log_exception(self, exception, request=None, user=None, extra_context=None):
        """Log exceptions with full context."""
        event_data = {
            'event_type': 'exception',
            'exception_type': type(exception).__name__,
            'exception_message': str(exception),
            'timestamp': timezone.now().isoformat(),
            'traceback': traceback.format_exc()
        }
        
        if request:
            event_data.update({
                'request_path': request.path,
                'request_method': request.method,
                'request_ip': self._get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            })
        
        if user and hasattr(user, 'id'):
            event_data.update({
                'user_id': user.id,
                'username': user.username if hasattr(user, 'username') else None
            })
        
        if extra_context:
            event_data['extra_context'] = extra_context
        
        self.logger.error(f"Exception: {type(exception).__name__}: {str(exception)}", extra=event_data, exc_info=True)
    
    def log_validation_error(self, field, value, error_message, user=None):
        """Log validation errors."""
        event_data = {
            'event_type': 'validation_error',
            'field': field,
            'value': str(value)[:100],  # Limit value length
            'error_message': error_message,
            'user_id': user.id if user and hasattr(user, 'id') else None,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.warning(f"Validation error: {field} - {error_message}", extra=event_data)
    
    def log_api_error(self, endpoint, method, status_code, error_details, user=None):
        """Log API errors."""
        event_data = {
            'event_type': 'api_error',
            'endpoint': endpoint,
            'method': method,
            'status_code': status_code,
            'error_details': error_details,
            'user_id': user.id if user and hasattr(user, 'id') else None,
            'timestamp': timezone.now().isoformat()
        }
        
        self.logger.error(f"API error: {method} {endpoint} ({status_code})", extra=event_data)
    
    def _get_client_ip(self, request):
        """Get client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class StructuredLogFormatter(logging.Formatter):
    """Custom log formatter for structured JSON logging."""
    
    def format(self, record):
        """Format log record as JSON."""
        log_entry = {
            'timestamp': datetime.utcfromtimestamp(record.created).isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add extra fields from the log record
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'lineno', 'funcName', 'created', 
                          'msecs', 'relativeCreated', 'thread', 'threadName', 
                          'processName', 'process', 'getMessage', 'exc_info', 'exc_text', 'stack_info']:
                log_entry[key] = value
        
        # Add exception information if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, default=str)


# Initialize loggers
security_logger = SecurityEventLogger()
app_logger = ApplicationEventLogger()
performance_logger = PerformanceLogger()
error_logger = ErrorLogger()