"""
Secure serializers for user management.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User
from apps.core.serializers import (
    SecureModelSerializer, 
    SecureUsernameField, 
    SecureEmailField, 
    SecurePasswordField,
    HoneyPotField,
    TimestampValidationMixin
)


class UserSerializer(SecureModelSerializer):
    """Secure user serializer for general use."""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role', 
            'department', 'is_active', 'created_at', 'last_login',
            'email_verified', 'phone_verified'
        ]
        read_only_fields = ['id', 'created_at', 'last_login', 'email_verified', 'phone_verified']


class UserCreateSerializer(SecureModelSerializer, TimestampValidationMixin):
    """Secure serializer for creating users."""
    
    username = SecureUsernameField()
    email = SecureEmailField()
    password = SecurePasswordField()
    password_confirm = SecurePasswordField()
    honeypot = HoneyPotField()
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm', 
            'full_name', 'role', 'department', 'honeypot'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'password_confirm': {'write_only': True},
        }
    
    def validate(self, attrs):
        attrs = super().validate(attrs)
        
        # Remove honeypot field from attrs
        attrs.pop('honeypot', None)
        
        # Check password confirmation
        password = attrs.get('password')
        password_confirm = attrs.pop('password_confirm', None)
        
        if password != password_confirm:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        
        return attrs
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(SecureModelSerializer):
    """Secure serializer for updating users."""
    
    username = SecureUsernameField(read_only=True)  # Username should not be changeable
    email = SecureEmailField()
    
    class Meta:
        model = User
        fields = ['email', 'full_name', 'department']


class PasswordChangeSerializer(serializers.Serializer):
    """Secure password change serializer."""
    
    old_password = SecurePasswordField()
    new_password = SecurePasswordField()
    new_password_confirm = SecurePasswordField()
    
    def validate_old_password(self, value):
        """Validate old password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value
    
    def validate(self, attrs):
        """Validate password change data."""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                'new_password_confirm': 'New passwords do not match.'
            })
        
        # Check if new password is different from old password
        old_password = attrs.get('old_password')
        if new_password == old_password:
            raise serializers.ValidationError({
                'new_password': 'New password must be different from old password.'
            })
        
        return attrs
    
    def save(self):
        """Save new password."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.must_change_password = False
        user.password_changed_at = timezone.now()
        user.save(update_fields=['password', 'must_change_password', 'password_changed_at'])
        return user


class LoginSerializer(serializers.Serializer, TimestampValidationMixin):
    """Secure login serializer with enhanced security."""
    
    username = SecureUsernameField()
    password = SecurePasswordField()
    honeypot = HoneyPotField()
    
    def validate(self, attrs):
        attrs = super().validate(attrs)
        
        # Remove honeypot field
        attrs.pop('honeypot', None)
        
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            # Get user object first to check account status
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                # Don't reveal that user doesn't exist
                raise serializers.ValidationError('Invalid credentials.')
            
            # Check if account is locked
            if user.is_account_locked():
                raise serializers.ValidationError(
                    'Account is temporarily locked due to multiple failed login attempts.'
                )
            
            # Check if account is active
            if not user.is_active:
                raise serializers.ValidationError('Account is disabled.')
            
            # Authenticate user
            user = authenticate(
                request=self.context.get('request'),
                username=username,
                password=password
            )
            
            if not user:
                # Increment failed login attempts for existing user
                try:
                    failed_user = User.objects.get(username=username)
                    failed_user.increment_failed_login()
                except User.DoesNotExist:
                    pass
                
                raise serializers.ValidationError('Invalid credentials.')
            
            # Reset failed login attempts on successful authentication
            user.reset_failed_login()
            
            # Check if password change is required
            if user.needs_password_change():
                raise serializers.ValidationError({
                    'password_change_required': True,
                    'message': 'Password change required.'
                })
            
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include username and password.')
        
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Secure password reset request serializer."""
    
    email = SecureEmailField()
    honeypot = HoneyPotField()
    
    def validate(self, attrs):
        attrs = super().validate(attrs)
        
        # Remove honeypot field
        attrs.pop('honeypot', None)
        
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Secure password reset confirmation serializer."""
    
    token = serializers.CharField(max_length=100)
    new_password = SecurePasswordField()
    new_password_confirm = SecurePasswordField()
    
    def validate(self, attrs):
        """Validate password reset data."""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        if new_password != new_password_confirm:
            raise serializers.ValidationError({
                'new_password_confirm': 'Passwords do not match.'
            })
        
        return attrs


class ParentSignupSerializer(UserCreateSerializer):
    """Secure parent signup serializer."""
    
    student_identifier = serializers.CharField(
        max_length=100,
        help_text="Student ID or full name"
    )
    
    class Meta(UserCreateSerializer.Meta):
        fields = UserCreateSerializer.Meta.fields + ['student_identifier']
    
    def validate_role(self, value):
        """Ensure role is parent for parent signup."""
        if value != 'parent':
            raise serializers.ValidationError('Role must be parent for parent signup.')
        return value
    
    def validate_student_identifier(self, value):
        """Validate that student exists."""
        from apps.students.models import Student
        from django.db.models import Q
        
        # Try to find student by ID or name
        try:
            student = Student.objects.get(
                Q(student_id=value) | Q(full_name__iexact=value)
            )
            return value
        except Student.DoesNotExist:
            raise serializers.ValidationError('Student not found.')
        except Student.MultipleObjectsReturned:
            raise serializers.ValidationError(
                'Multiple students found. Please use student ID instead.'
            )
    
    def create(self, validated_data):
        """Create parent user and link to student."""
        from apps.students.models import Student
        from django.db.models import Q
        
        student_identifier = validated_data.pop('student_identifier')
        
        # Create user
        user = super().create(validated_data)
        
        # Link to student
        try:
            student = Student.objects.get(
                Q(student_id=student_identifier) | Q(full_name__iexact=student_identifier)
            )
            student.parent = user
            student.save(update_fields=['parent'])
        except Student.DoesNotExist:
            # This shouldn't happen due to validation, but handle gracefully
            user.delete()
            raise serializers.ValidationError('Student not found.')
        
        return user