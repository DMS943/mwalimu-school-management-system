from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count, Q
from .models import Report, ReportTemplate
from .serializers import ReportSerializer, ReportTemplateSerializer
from apps.schools.models import Class
from apps.students.models import Student
from apps.academics.models import Mark

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Teachers only see reports for students in their assigned classes
        if user.role == 'teacher':
            teacher_classes = Class.objects.filter(class_teacher_user=user).values_list('id', flat=True)
            queryset = queryset.filter(student__class_assigned__in=teacher_classes)
        
        # Parents only see reports for their children
        elif user.role == 'parent':
            queryset = queryset.filter(student__parent_user=user)
        
        # Filter by query parameters
        student = self.request.query_params.get('student')
        term = self.request.query_params.get('term')
        
        if student:
            queryset = queryset.filter(student=student)
        if term:
            queryset = queryset.filter(term=term)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate report for a student in a specific term"""
        student_id = request.data.get('student_id')
        term_id = request.data.get('term_id')
        
        if not student_id or not term_id:
            return Response(
                {'error': 'student_id and term_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            student = Student.objects.get(id=student_id)
            
            # Check permissions
            if request.user.role == 'teacher':
                teacher_classes = Class.objects.filter(class_teacher_user=request.user).values_list('id', flat=True)
                if student.class_assigned_id not in teacher_classes:
                    return Response(
                        {'error': 'You do not have permission to generate reports for this student'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif request.user.role == 'parent':
                if student.parent_user != request.user:
                    return Response(
                        {'error': 'You can only view reports for your own children'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Get all marks for this student in this term
            marks = Mark.objects.filter(student_id=student_id, term_id=term_id)
            
            if not marks.exists():
                return Response(
                    {'error': 'No marks found for this student in this term'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Calculate totals
            total_marks = marks.aggregate(total=Sum('marks'))['total'] or 0
            average = marks.aggregate(avg=Avg('marks'))['avg'] or 0
            
            # Calculate position in class
            if student.class_assigned:
                # Get all students in the same class with marks in this term
                class_students = Student.objects.filter(
                    class_assigned=student.class_assigned
                ).annotate(
                    total=Sum('marks__marks', filter=Q(marks__term_id=term_id))
                ).filter(total__isnull=False).order_by('-total')
                
                position = None
                class_size = class_students.count()
                
                for idx, s in enumerate(class_students, 1):
                    if s.id == student_id:
                        position = idx
                        break
            else:
                position = None
                class_size = None
            
            # Determine overall grade
            if average >= 90:
                overall_grade = 'A+'
            elif average >= 80:
                overall_grade = 'A'
            elif average >= 70:
                overall_grade = 'B'
            elif average >= 60:
                overall_grade = 'C'
            elif average >= 50:
                overall_grade = 'D'
            else:
                overall_grade = 'F'
            
            # Create or update report
            report, created = Report.objects.update_or_create(
                student_id=student_id,
                term_id=term_id,
                defaults={
                    'total_marks': total_marks,
                    'average_percentage': average,
                    'overall_grade': overall_grade,
                    'position': position,
                    'class_size': class_size,
                }
            )
            
            serializer = self.get_serializer(report)
            return Response({
                'message': 'Report generated successfully',
                'report': serializer.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except Student.DoesNotExist:
            return Response(
                {'error': 'Student not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Preview report with all details including marks breakdown"""
        report = self.get_object()
        
        # Get all marks for this report
        marks = Mark.objects.filter(
            student=report.student,
            term=report.term
        ).select_related('subject')
        
        marks_data = [{
            'subject': mark.subject.name,
            'subject_code': mark.subject.code,
            'marks': float(mark.marks),
            'grade': mark.grade,
        } for mark in marks]
        
        # Get student details
        student = report.student
        student_data = {
            'id': student.id,
            'student_number': student.student_number,
            'first_name': student.first_name,
            'last_name': student.last_name,
            'class_name': student.class_assigned.name if student.class_assigned else None,
            'grade_level': student.class_assigned.grade_level if student.class_assigned else None,
        }
        
        # Get term details
        term_data = {
            'id': report.term.id,
            'name': report.term.name,
            'start_date': report.term.start_date,
            'end_date': report.term.end_date,
        }
        
        report_data = {
            'id': report.id,
            'student': student_data,
            'term': term_data,
            'marks': marks_data,
            'total_marks': float(report.total_marks),
            'average_percentage': float(report.average_percentage),
            'overall_grade': report.overall_grade,
            'position': report.position,
            'class_size': report.class_size,
            'teacher_comment': report.teacher_comment,
            'headteacher_comment': report.headteacher_comment,
            'generated_at': report.generated_at,
        }
        
        return Response(report_data)

class ReportTemplateViewSet(viewsets.ModelViewSet):
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get the default report template"""
        template = ReportTemplate.objects.filter(is_default=True).first()
        if template:
            serializer = self.get_serializer(template)
            return Response(serializer.data)
        return Response({'error': 'No default template found'}, status=status.HTTP_404_NOT_FOUND)
