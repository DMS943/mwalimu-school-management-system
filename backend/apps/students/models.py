from django.db import models
import random
import string

class Student(models.Model):
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]
    
    student_number = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    guardian_name = models.CharField(max_length=255, null=True, blank=True)
    guardian_phone = models.CharField(max_length=20, null=True, blank=True)
    guardian_email = models.EmailField(null=True, blank=True)
    class_assigned = models.ForeignKey('schools.Class', on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    parent_user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'students'
        ordering = ['last_name', 'first_name']
        
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.student_number})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class StudentLinkCode(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='link_codes')
    link_code = models.CharField(max_length=20, unique=True)
    created_by = models.ForeignKey('users.User', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    used_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='used_link_codes')
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'student_link_codes'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.link_code} - {self.student}"
    
    @staticmethod
    def generate_code():
        """Generate a unique 8-character link code"""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not StudentLinkCode.objects.filter(link_code=code).exists():
                return code


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    notes = models.TextField(null=True, blank=True)
    recorded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'attendance'
        unique_together = ['student', 'date']
        ordering = ['-date', 'student__last_name']
        
    def __str__(self):
        return f"{self.student} - {self.date} - {self.status}"
