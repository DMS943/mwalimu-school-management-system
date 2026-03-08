from rest_framework import serializers
from .models import Student, StudentLinkCode, Attendance

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

class StudentLinkCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentLinkCode
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'
        read_only_fields = ['recorded_by']
