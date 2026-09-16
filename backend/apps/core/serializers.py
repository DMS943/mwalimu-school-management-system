"""
Base serializers with security enhancements.
"""
from rest_framework import serializers
from .validators import safe_text_validator, no_sql_injection, no_xss, username_validator


class SecureModelSerializer(serializers.ModelSerializer):
    """
    Base serializer with security validations applied to all text fields.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Apply security validators to text fields
        for field_name, field in self.fields.items():
            if isinstance(field, (serializers.CharField, serializers.TextField)):
                # Add security validators
                field.validators.extend([no_sql_injection, no_xss])
                
                # Apply safe text validator for longer text fields
                if isinstance(field, serializers.TextField) or (
                    hasattr(field, 'max_length') and field.max_length and field.max_length > 100
                ):
                    field.validators.append(safe_text_validator)
    
    def validate(self, attrs):
        """Additional validation for the entire serializer."""
        attrs = super().validate(attrs)
        
        # Remove any potential null bytes from all string fields
        for key, value in attrs.items():
            if isinstance(value, str):
                attrs[key] = value.replace('\x00', '')
        
        return attrs


class SecureUsernameField(serializers.CharField):
    """
    Secure username field with validation.
    """
    
    def __init__(self, **kwargs):
        kwargs.setdefault('min_length', 3)
        kwargs.setdefault('max_length', 30)
        kwargs.setdefault('validators', []).append(username_validator)
        super().__init__(**kwargs)


class SecureEmailField(serializers.EmailField):
    """
    Secure email field with additional validation.
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Add custom email validation if needed
    
    def validate(self, value):
        value = super().validate(value)
        
        # Additional email security checks
        if value:
            # Check for suspicious email patterns
            suspicious_patterns = ['+', 'test', 'admin', 'root', 'system']
            email_local = value.split('@')[0].lower()
            
            # This is optional - you might want to allow some of these
            # for email in suspicious_patterns:
            #     if email in email_local:
            #         raise serializers.ValidationError("Suspicious email pattern detected.")
        
        return value


class SecurePasswordField(serializers.CharField):
    """
    Secure password field with strength validation.
    """
    
    def __init__(self, **kwargs):
        kwargs.setdefault('write_only', True)
        kwargs.setdefault('min_length', 8)
        kwargs.setdefault('max_length', 128)
        kwargs.setdefault('style', {'input_type': 'password'})
        super().__init__(**kwargs)
    
    def validate(self, value):
        value = super().validate(value)
        
        # Import here to avoid circular imports
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        
        return value


class SecureFileField(serializers.FileField):
    """
    Secure file field with validation.
    """
    
    def __init__(self, **kwargs):
        from .validators import filename_validator
        kwargs.setdefault('validators', []).append(filename_validator)
        super().__init__(**kwargs)
    
    def validate(self, value):
        value = super().validate(value)
        
        if value:
            # Check file size (default 5MB limit)
            max_size = getattr(self, 'max_size', 5 * 1024 * 1024)
            if value.size > max_size:
                raise serializers.ValidationError(
                    f"File size cannot exceed {max_size // (1024*1024)}MB."
                )
            
            # Additional file validation can be added here
            # e.g., virus scanning, content type validation
        
        return value


class HoneyPotField(serializers.CharField):
    """
    Honeypot field to catch bots. This field should remain empty.
    """
    
    def __init__(self, **kwargs):
        kwargs.setdefault('required', False)
        kwargs.setdefault('allow_blank', True)
        kwargs.setdefault('write_only', True)
        super().__init__(**kwargs)
    
    def validate(self, value):
        if value:  # If honeypot field is filled, it's likely a bot
            raise serializers.ValidationError("Bot detected.")
        return value


class TimestampValidationMixin:
    """
    Mixin to validate timestamp fields against replay attacks.
    """
    
    def validate_timestamp(self, value):
        """Validate timestamp is within acceptable range."""
        from django.utils import timezone
        from datetime import timedelta
        
        if not value:
            return value
        
        now = timezone.now()
        
        # Allow timestamps within the last 5 minutes and next 1 minute
        min_time = now - timedelta(minutes=5)
        max_time = now + timedelta(minutes=1)
        
        if value < min_time:
            raise serializers.ValidationError("Timestamp is too old.")
        
        if value > max_time:
            raise serializers.ValidationError("Timestamp is in the future.")
        
        return value


class CSRFValidationMixin:
    """
    Mixin to add CSRF token validation for sensitive operations.
    """
    
    csrf_token = serializers.CharField(write_only=True, required=False)
    
    def validate_csrf_token(self, value):
        """Validate CSRF token for sensitive operations."""
        request = self.context.get('request')
        
        if request and hasattr(request, 'META'):
            # Get CSRF token from cookie or header
            csrf_cookie = request.META.get('CSRF_COOKIE')
            csrf_header = request.META.get('HTTP_X_CSRFTOKEN')
            
            expected_token = csrf_cookie or csrf_header
            
            if expected_token and value != expected_token:
                raise serializers.ValidationError("Invalid CSRF token.")
        
        return value