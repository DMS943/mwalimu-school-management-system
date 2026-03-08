from django.contrib import admin
from .models import Report, ReportTemplate

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['student', 'term', 'total_marks', 'average_percentage', 'position']
    list_filter = ['term']
    search_fields = ['student__first_name', 'student__last_name']
    ordering = ['-term__start_date', 'position']

@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_default', 'created_at']
    list_filter = ['is_default']
