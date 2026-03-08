from django.db import models

class Report(models.Model):
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE, related_name='reports')
    term = models.ForeignKey('schools.Term', on_delete=models.CASCADE)
    total_marks = models.DecimalField(max_digits=8, decimal_places=2)
    average_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    overall_grade = models.CharField(max_length=5)
    position = models.IntegerField(null=True, blank=True)
    class_size = models.IntegerField(null=True, blank=True)
    teacher_comment = models.TextField(null=True, blank=True)
    headteacher_comment = models.TextField(null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reports'
        unique_together = ['student', 'term']
        ordering = ['-term__start_date', 'position']
        
    def __str__(self):
        return f"Report: {self.student} - {self.term}"


class ReportTemplate(models.Model):
    name = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    header_text = models.TextField(default='')
    show_position = models.BooleanField(default=True)
    show_attendance = models.BooleanField(default=True)
    show_behavior = models.BooleanField(default=False)
    show_grade_scale = models.BooleanField(default=True)
    grading_scale = models.JSONField(null=True, blank=True)
    custom_fields = models.JSONField(null=True, blank=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'report_templates'
        
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # If this template is being set as default, unset all others
        if self.is_default:
            ReportTemplate.objects.filter(is_default=True).update(is_default=False)
        super().save(*args, **kwargs)
