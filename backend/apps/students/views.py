from rest_framework import viewsets, permissions
from .models import Student, StudentLinkCode, Attendance
from .serializers import StudentSerializer, StudentLinkCodeSerializer, AttendanceSerializer
from apps.schools.models import Class

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Teachers only see students in their assigned classes
        if user.role == 'teacher':
            teacher_classes = Class.objects.filter(class_teacher_user=user).values_list('id', flat=True)
            queryset = queryset.filter(class_assigned__in=teacher_classes)
        
        # Parents only see their own children
        elif user.role == 'parent':
            queryset = queryset.filter(parent_user=user)
        
        # Filter by class if provided
        class_assigned = self.request.query_params.get('class_assigned')
        if class_assigned:
            queryset = queryset.filter(class_assigned=class_assigned)
        
        return queryset

class StudentLinkCodeViewSet(viewsets.ModelViewSet):
    queryset = StudentLinkCode.objects.all()
    serializer_class = StudentLinkCodeSerializer
    permission_classes = [permissions.IsAuthenticated]

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Teachers only see attendance for students in their assigned classes
        if user.role == 'teacher':
            teacher_classes = Class.objects.filter(class_teacher_user=user).values_list('id', flat=True)
            queryset = queryset.filter(student__class_assigned__in=teacher_classes)
        
        # Parents only see attendance for their children
        elif user.role == 'parent':
            queryset = queryset.filter(student__parent_user=user)
        
        # Filter by query parameters
        student = self.request.query_params.get('student')
        date = self.request.query_params.get('date')
        
        if student:
            queryset = queryset.filter(student=student)
        if date:
            queryset = queryset.filter(date=date)
        
        return queryset
