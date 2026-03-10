from rest_framework import serializers
from .models import Student, StudentLinkCode, Attendance

class StudentSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='class_assigned.name', read_only=True)
    
    class Meta:
        model = Student
        fields = '__all__'

class StudentLinkCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentLinkCode
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['recorded_by']
    
    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}" if obj.student else None
