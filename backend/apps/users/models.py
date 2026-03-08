from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('teacher', 'Teacher'),
        ('hod', 'Head of Department'),
        ('headteacher', 'Head Teacher'),
        ('admin', 'Admin'),
        ('parent', 'Parent'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='teacher')
    full_name = models.CharField(max_length=255)
    department = models.ForeignKey('schools.Department', on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'users'
        
    def __str__(self):
        return f"{self.full_name} ({self.role})"
