#!/usr/bin/env python3
"""
Create sample reports for testing
"""
import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.reports.models import Report
from apps.students.models import Student
from apps.schools.models import Term
from apps.academics.models import Mark
from django.db.models import Sum, Avg

def main():
    print("Creating sample reports for testing...")
    
    try:
        # Get students with marks
        students_with_marks = Student.objects.filter(marks__isnull=False).distinct()
        
        if not students_with_marks.exists():
            print("❌ No students with marks found")
            return
        
        # Get the first term
        term = Term.objects.first()
        if not term:
            print("❌ No terms found")
            return
        
        print(f"✓ Using term: {term.name}")
        
        created_count = 0
        
        for student in students_with_marks:
            # Get marks for this student in this term
            marks = Mark.objects.filter(student=student, term=term)
            
            if not marks.exists():
                continue
            
            # Calculate totals
            total_marks = marks.aggregate(total=Sum('marks'))['total'] or 0
            average = marks.aggregate(avg=Avg('marks'))['avg'] or 0
            
            # Calculate position in class
            if student.class_assigned:
                # Get all students in the same class with marks in this term
                class_students = Student.objects.filter(
                    class_assigned=student.class_assigned
                ).annotate(
                    total=Sum('marks__marks', filter=django.db.models.Q(marks__term=term))
                ).filter(total__isnull=False).order_by('-total')
                
                position = None
                class_size = class_students.count()
                
                for idx, s in enumerate(class_students, 1):
                    if s.id == student.id:
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
                student=student,
                term=term,
                defaults={
                    'total_marks': total_marks,
                    'average_percentage': average,
                    'overall_grade': overall_grade,
                    'position': position,
                    'class_size': class_size,
                    'teacher_comment': f'Good performance in {term.name}. Keep up the excellent work!',
                }
            )
            
            if created:
                print(f"✓ Created report for {student.first_name} {student.last_name}: {average:.1f}% ({overall_grade})")
                created_count += 1
            else:
                print(f"- Updated report for {student.first_name} {student.last_name}: {average:.1f}% ({overall_grade})")
        
        print(f"\n✅ Successfully created {created_count} new reports!")
        
        # Show all reports
        all_reports = Report.objects.all()
        print(f"\nTotal reports in database: {all_reports.count()}")
        for report in all_reports:
            print(f"  {report.student.first_name} {report.student.last_name} - {report.term.name}: {report.average_percentage:.1f}% ({report.overall_grade})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()