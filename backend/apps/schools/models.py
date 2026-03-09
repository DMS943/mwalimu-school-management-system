from django.db import models

class SchoolSettings(models.Model):
    """Single school settings - only one record should exist"""
    SCHOOL_TYPE_CHOICES = [
        ('primary', 'Primary'),
        ('secondary', 'Secondary'),
    ]
    
    name = models.CharField(max_length=255)
    school_type = models.CharField(max_length=20, choices=SCHOOL_TYPE_CHOICES)
    location = models.CharField(max_length=255)
    address = models.TextField(null=True, blank=True)
    contact_email = models.EmailField(null=True, blank=True)
    contact_phone = models.CharField(max_length=20, null=True, blank=True)
    logo = models.ImageField(upload_to='school/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'school_settings'
        verbose_name = 'School Settings'
        verbose_name_plural = 'School Settings'
        
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Ensure only one settings record exists
        if not self.pk and SchoolSettings.objects.exists():
            raise ValueError('Only one SchoolSettings instance is allowed')
        return super().save(*args, **kwargs)


class Department(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    head_of_department = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_department')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'departments'
        
    def __str__(self):
        return self.name


class Class(models.Model):
    name = models.CharField(max_length=100)
    grade_level = models.IntegerField()
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    class_teacher = models.CharField(max_length=255, null=True, blank=True)
    class_teacher_user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='taught_classes', db_column='class_teacher_id')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'classes'
        verbose_name_plural = 'Classes'
        ordering = ['grade_level', 'name']
        
    def __str__(self):
        return f"{self.name} - Grade {self.grade_level}"


class Subject(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'subjects'
        ordering = ['name']
        
    def __str__(self):
        return f"{self.name} ({self.code})"


class Term(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'terms'
        ordering = ['-start_date']
        
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # If this term is being set as active, deactivate all others
        if self.is_active:
            Term.objects.filter(is_active=True).update(is_active=False)
        super().save(*args, **kwargs)


class Schedule(models.Model):
    DAYS_OF_WEEK = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    
    class_assigned = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='schedules')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    teacher = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='teaching_schedules')
    day_of_week = models.CharField(max_length=10, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room = models.CharField(max_length=50, null=True, blank=True)
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='schedules', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'schedules'
        ordering = ['day_of_week', 'start_time']
        unique_together = ['class_assigned', 'day_of_week', 'start_time', 'term']
        
    def __str__(self):
        return f"{self.class_assigned} - {self.subject} - {self.day_of_week} {self.start_time}"
