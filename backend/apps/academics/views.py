from rest_framework import viewsets, permissions
from .models import Mark
from .serializers import MarkSerializer
from apps.schools.models import Class

class MarkViewSet(viewsets.ModelViewSet):
    queryset = Mark.objects.all()
    serializer_class = MarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Teachers only see marks for students in their assigned classes
        if user.role == 'teacher':
            teacher_classes = Class.objects.filter(class_teacher_user=user).values_list('id', flat=True)
            queryset = queryset.filter(student__class_assigned__in=teacher_classes)
        
        # Parents only see marks for their children
        elif user.role == 'parent':
            queryset = queryset.filter(student__parent_user=user)
        
        # Filter by query parameters
        student = self.request.query_params.get('student')
        subject = self.request.query_params.get('subject')
        term = self.request.query_params.get('term')
        
        if student:
            queryset = queryset.filter(student=student)
        if subject:
            queryset = queryset.filter(subject=subject)
        if term:
            queryset = queryset.filter(term=term)
        
        return queryset
