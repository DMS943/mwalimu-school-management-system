from rest_framework import serializers
from .models import Mark

class MarkSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Mark
        fields = '__all__'
        read_only_fields = ['grade']
    
    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}" if obj.student else None
