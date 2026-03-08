from django.contrib import admin
from .models import SchoolSettings, Department, Class, Subject, Term

@admin.register(SchoolSettings)
class SchoolSettingsAdmin(admin.ModelAdmin):
    list_display = ['name', 'school_type', 'location', 'contact_email']
    
    def has_add_permission(self, request):
        # Only allow one settings instance
        return not SchoolSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion of settings
        return False

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'head_of_department']

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ['name', 'grade_level', 'class_teacher']
    list_filter = ['grade_level']
    ordering = ['grade_level', 'name']

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'department']
    list_filter = ['department']
    search_fields = ['name', 'code']

@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_active']
    list_filter = ['is_active']
    ordering = ['-start_date']
