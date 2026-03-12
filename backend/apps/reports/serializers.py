from rest_framework import serializers
from .models import Report, ReportTemplate

class ReportSerializer(serializers.ModelSerializer):
    term_name = serializers.CharField(source='term.name', read_only=True)
    student_name = serializers.SerializerMethodField()
    class_name = serializers.CharField(source='student.class_assigned.name', read_only=True)
    
    class Meta:
        model = Report
        fields = '__all__'
    
    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}" if obj.student else None

class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = '__all__'
