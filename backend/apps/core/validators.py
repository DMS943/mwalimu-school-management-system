"""
Custom validators for enhanced input validation and security.
"""
import re
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _


class NoSQLInjectionValidator:
    """Validator to prevent SQL injection attempts."""
    
    def __init__(self):
        self.sql_patterns = [
            r"(\bunion\b.*\bselect\b)|(\bselect\b.*\bunion\b)",
            r"(\bdrop\b\s+\btable\b)|(\bdelete\b\s+\bfrom\b)",
            r"(\binsert\b\s+\binto\b)|(\bupdate\b\s+\bset\b)",
            r"(\bexec\b\s*\()|(\bexecute\b\s*\()",
            r"(\bor\b\s+\d+\s*=\s*\d+)|(\band\b\s+\d+\s*=\s*\d+)",
            r"(\bor\b\s+.+\s*=\s*.+)|(\band\b\s+.+\s*=\s*.+)",
            r"['\"];?\s*--",
            r"['\"];?\s*/\*",
        ]
    
    def __call__(self, value):
        if not isinstance(value, str):
            return
        
        value_lower = value.lower()
        for pattern in self.sql_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                raise ValidationError(
                    _('Invalid input detected.'),
                    code='sql_injection'
                )


class NoXSSValidator:
    """Validator to prevent XSS attacks."""
    
    def __init__(self):
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
            r"<object[^>]*>.*?</object>",
            r"<embed[^>]*>.*?</embed>",
            r"<form[^>]*>.*?</form>",
            r"<input[^>]*>",
            r"<textarea[^>]*>.*?</textarea>",
            r"vbscript:",
            r"data:text/html",
        ]
    
    def __call__(self, value):
        if not isinstance(value, str):
            return
        
        value_lower = value.lower()
        for pattern in self.xss_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE | re.DOTALL):
                raise ValidationError(
                    _('Invalid HTML content detected.'),
                    code='xss_attempt'
                )


class StrongPasswordValidator:
    """Validator for strong password requirements."""
    
    def __init__(self, min_length=8):
        self.min_length = min_length
    
    def validate(self, password, user=None):
        if len(password) < self.min_length:
            raise ValidationError(
                _('Password must be at least %(min_length)d characters long.') % {'min_length': self.min_length},
                code='password_too_short',
            )
        
        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _('Password must contain at least one uppercase letter.'),
                code='password_no_upper',
            )
        
        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _('Password must contain at least one lowercase letter.'),
                code='password_no_lower',
            )
        
        # Check for at least one digit
        if not re.search(r'\d', password):
            raise ValidationError(
                _('Password must contain at least one digit.'),
                code='password_no_digit',
            )
        
        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                _('Password must contain at least one special character.'),
                code='password_no_special',
            )
    
    def get_help_text(self):
        return _(
            'Your password must contain at least %(min_length)d characters, '
            'including uppercase and lowercase letters, digits, and special characters.'
        ) % {'min_length': self.min_length}


class UsernameValidator(RegexValidator):
    """Validator for safe usernames."""
    
    def __init__(self):
        super().__init__(
            regex=r'^[a-zA-Z0-9._-]+$',
            message=_('Username can only contain letters, numbers, periods, hyphens, and underscores.'),
            code='invalid_username'
        )


class SafeTextValidator:
    """Validator for general text fields to prevent various attacks."""
    
    def __init__(self, max_length=1000):
        self.max_length = max_length
        self.no_sql_validator = NoSQLInjectionValidator()
        self.no_xss_validator = NoXSSValidator()
    
    def __call__(self, value):
        if not isinstance(value, str):
            return
        
        # Check length
        if len(value) > self.max_length:
            raise ValidationError(
                _('Text is too long. Maximum %(max_length)d characters allowed.') % {'max_length': self.max_length},
                code='text_too_long'
            )
        
        # Check for SQL injection
        self.no_sql_validator(value)
        
        # Check for XSS
        self.no_xss_validator(value)
        
        # Check for null bytes
        if '\x00' in value:
            raise ValidationError(
                _('Null bytes are not allowed.'),
                code='null_byte'
            )


class FileNameValidator:
    """Validator for uploaded file names."""
    
    def __init__(self):
        self.dangerous_extensions = [
            'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
            'php', 'asp', 'aspx', 'jsp', 'sh', 'py', 'rb', 'pl'
        ]
        self.allowed_extensions = [
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'txt', 'csv', 'zip', 'rar'
        ]
    
    def __call__(self, value):
        if not hasattr(value, 'name'):
            return
        
        filename = value.name.lower()
        
        # Check for dangerous file extensions
        for ext in self.dangerous_extensions:
            if filename.endswith('.' + ext):
                raise ValidationError(
                    _('File type not allowed: .%(ext)s') % {'ext': ext},
                    code='dangerous_file_type'
                )
        
        # Check for allowed extensions (if whitelist is used)
        if self.allowed_extensions:
            file_ext = filename.split('.')[-1] if '.' in filename else ''
            if file_ext not in self.allowed_extensions:
                raise ValidationError(
                    _('File type not allowed. Allowed types: %(types)s') % {
                        'types': ', '.join(self.allowed_extensions)
                    },
                    code='file_type_not_allowed'
                )
        
        # Check for dangerous file name patterns
        dangerous_patterns = [
            r'\.\./',  # Directory traversal
            r'^\.ht',  # Apache config files
            r'^web\.config$',  # IIS config
            r'^\.',  # Hidden files (optional - might be too strict)
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, filename):
                raise ValidationError(
                    _('Invalid file name pattern.'),
                    code='invalid_filename'
                )


# Common validator instances
safe_text_validator = SafeTextValidator()
username_validator = UsernameValidator()
filename_validator = FileNameValidator()
no_sql_injection = NoSQLInjectionValidator()
no_xss = NoXSSValidator()