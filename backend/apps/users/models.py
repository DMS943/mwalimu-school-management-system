from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinLengthValidator
from apps.core.validators import safe_text_validator, username_validator


class User(AbstractUser):
    ROLE_CHOICES = [
        ('teacher', 'Teacher'),
        ('hod', 'Head of Department'),
        ('headteacher', 'Head Teacher'),
        ('admin', 'Admin'),
        ('parent', 'Parent'),
    ]
    
    # Override username field with custom validation
    username = models.CharField(
        max_length=30,
        unique=True,
        validators=[username_validator, MinLengthValidator(3)],
        help_text='Required. 30 characters or fewer. Letters, digits and ./-/_ only.',
        error_messages={
            'unique': "A user with that username already exists.",
        },
    )
    
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='teacher',
        validators=[safe_text_validator]
    )
    full_name = models.CharField(
        max_length=255,
        validators=[safe_text_validator]
    )
    department = models.ForeignKey(
        'schools.Department', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Security fields
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(auto_now_add=True)
    must_change_password = models.BooleanField(default=False)
    
    # Privacy fields
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['department']),
            models.Index(fields=['email']),
            models.Index(fields=['is_active']),
        ]
        
    def __str__(self):
        return f"{self.full_name} ({self.role})"
    
    def is_account_locked(self):
        """Check if account is currently locked."""
        from django.utils import timezone
        
        if self.account_locked_until:
            return timezone.now() < self.account_locked_until
        return False
    
    def lock_account(self, duration_minutes=30):
        """Lock account for specified duration."""
        from django.utils import timezone
        from datetime import timedelta
        
        self.account_locked_until = timezone.now() + timedelta(minutes=duration_minutes)
        self.save(update_fields=['account_locked_until'])
    
    def unlock_account(self):
        """Unlock account and reset failed attempts."""
        self.account_locked_until = None
        self.failed_login_attempts = 0
        self.save(update_fields=['account_locked_until', 'failed_login_attempts'])
    
    def increment_failed_login(self):
        """Increment failed login attempts and lock if threshold reached."""
        self.failed_login_attempts += 1
        
        # Lock account after 5 failed attempts
        if self.failed_login_attempts >= 5:
            self.lock_account()
        
        self.save(update_fields=['failed_login_attempts'])
    
    def reset_failed_login(self):
        """Reset failed login attempts on successful login."""
        if self.failed_login_attempts > 0:
            self.failed_login_attempts = 0
            self.save(update_fields=['failed_login_attempts'])
    
    def needs_password_change(self):
        """Check if user needs to change password."""
        from django.utils import timezone
        from datetime import timedelta
        
        if self.must_change_password:
            return True
        
        # Require password change every 90 days
        if self.password_changed_at:
            password_age = timezone.now() - self.password_changed_at
            return password_age > timedelta(days=90)
        
        return False
