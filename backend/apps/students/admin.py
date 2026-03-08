from django.contrib import admin
from .models import Student, StudentLinkCode, Attendance

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['student_number', 'first_name', 'last_name', 'class_assigned', 'is_active']
    list_filter = ['class_assigned', 'gender', 'is_active']
    search_fields = ['student_number', 'first_name', 'last_name']
    ordering = ['last_name', 'first_name']

@admin.register(StudentLinkCode)
class StudentLinkCodeAdmin(admin.ModelAdmin):
    list_display = ['link_code', 'student', 'is_active', 'created_at', 'expires_at']
    list_filter = ['is_active']
    readonly_fields = ['link_code', 'created_at', 'used_at']

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['student', 'date', 'status']
    list_filter = ['status', 'date']
    date_hierarchy = 'date'
    ordering = ['-date']
