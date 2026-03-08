from django.contrib import admin
from .models import Mark

@admin.register(Mark)
class MarkAdmin(admin.ModelAdmin):
    list_display = ['student', 'subject', 'term', 'marks', 'grade']
    list_filter = ['term', 'subject', 'grade']
    search_fields = ['student__first_name', 'student__last_name']
