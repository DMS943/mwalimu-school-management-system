from rest_framework import serializers
from .models import SchoolSettings, Department, Class, Subject, Term, Schedule

class SchoolSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolSettings
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class ClassSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Class
        fields = '__all__'
    
    def get_student_count(self, obj):
        return obj.students.count()

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'

class TermSerializer(serializers.ModelSerializer):
    class Meta:
        model = Term
        fields = '__all__'

class ScheduleSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_assigned.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    term_name = serializers.CharField(source='term.name', read_only=True)
    
    class Meta:
        model = Schedule
        fields = '__all__'
    
    def get_teacher_name(self, obj):
        if obj.teacher:
            return f"{obj.teacher.first_name} {obj.teacher.last_name}" if obj.teacher.first_name else obj.teacher.username
        return None
