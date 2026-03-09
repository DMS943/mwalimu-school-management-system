from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from .models import SchoolSettings, Department, Class, Subject, Term, Schedule
from .serializers import SchoolSettingsSerializer, DepartmentSerializer, ClassSerializer, SubjectSerializer, TermSerializer, ScheduleSerializer

class SchoolSettingsViewSet(viewsets.ModelViewSet):
    queryset = SchoolSettings.objects.all()
    serializer_class = SchoolSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current school settings"""
        settings = SchoolSettings.objects.first()
        if settings:
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        return Response({'error': 'School settings not configured'}, status=404)

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Teachers only see their assigned classes
        if user.role == 'teacher':
            queryset = queryset.filter(class_teacher_user=user)
        
        grade_level = self.request.query_params.get('grade_level')
        if grade_level:
            queryset = queryset.filter(grade_level=grade_level)
        return queryset

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all()
    serializer_class = TermSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active term"""
        term = Term.objects.filter(is_active=True).first()
        if term:
            serializer = self.get_serializer(term)
            return Response(serializer.data)
        return Response({'error': 'No active term'}, status=404)

class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Teachers only see schedules for their classes or where they are the teacher
        if user.role == 'teacher':
            queryset = queryset.filter(
                models.Q(class_assigned__class_teacher_user=user) | 
                models.Q(teacher=user)
            ).distinct()
        
        # Filter by query parameters
        class_id = self.request.query_params.get('class_assigned')
        teacher_id = self.request.query_params.get('teacher')
        day = self.request.query_params.get('day_of_week')
        term_id = self.request.query_params.get('term')
        
        if class_id:
            queryset = queryset.filter(class_assigned=class_id)
        if teacher_id:
            queryset = queryset.filter(teacher=teacher_id)
        if day:
            queryset = queryset.filter(day_of_week=day)
        if term_id:
            queryset = queryset.filter(term=term_id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def my_schedule(self, request):
        """Get the current user's teaching schedule"""
        user = request.user
        
        if user.role != 'teacher':
            return Response({'error': 'Only teachers can view their schedule'}, status=403)
        
        # Get active term
        active_term = Term.objects.filter(is_active=True).first()
        
        schedules = Schedule.objects.filter(
            models.Q(class_assigned__class_teacher_user=user) | 
            models.Q(teacher=user)
        )
        
        if active_term:
            schedules = schedules.filter(term=active_term)
        
        schedules = schedules.select_related('class_assigned', 'subject', 'teacher', 'term').order_by('day_of_week', 'start_time')
        
        serializer = self.get_serializer(schedules, many=True)
        return Response(serializer.data)
