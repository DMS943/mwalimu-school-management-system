#!/usr/bin/env python3
"""
Simple script to add sample marks for testing
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

from apps.academics.models import Mark
from apps.students.models import Student
from apps.schools.models import Subject, Term

def main():
    print("Adding sample marks for testing...")
    
    try:
        # Get the student (Mwansa Chanda)
        student = Student.objects.filter(student_number='LBS2024001').first()
        if not student:
            print("❌ Student LBS2024001 (Mwansa Chanda) not found")
            return
        
        print(f"✓ Found student: {student.first_name} {student.last_name}")
        
        # Get the first term
        term = Term.objects.first()
        if not term:
            print("❌ No terms found")
            return
        
        print(f"✓ Using term: {term.name}")
        
        # Get subjects
        subjects = Subject.objects.all()[:5]  # Get first 5 subjects
        if not subjects:
            print("❌ No subjects found")
            return
        
        print(f"✓ Found {subjects.count()} subjects")
        
        # Sample marks data
        marks_data = [
            (subjects[0], 85),  # First subject: 85%
            (subjects[1], 78),  # Second subject: 78%
            (subjects[2], 82),  # Third subject: 82%
            (subjects[3], 75),  # Fourth subject: 75%
            (subjects[4], 88),  # Fifth subject: 88%
        ]
        
        # Create marks
        created_count = 0
        for subject, mark_value in marks_data:
            mark, created = Mark.objects.get_or_create(
                student=student,
                subject=subject,
                term=term,
                defaults={'marks': mark_value}
            )
            if created:
                print(f"✓ Created mark: {subject.name} = {mark_value}% (Grade: {mark.grade})")
                created_count += 1
            else:
                print(f"- Mark already exists: {subject.name} = {mark.marks}%")
        
        print(f"\n✅ Successfully created {created_count} new marks!")
        
        # Verify marks
        student_marks = Mark.objects.filter(student=student)
        print(f"\nTotal marks for {student.first_name}: {student_marks.count()}")
        for mark in student_marks:
            print(f"  {mark.subject.name}: {mark.marks}% (Grade: {mark.grade})")
        
        # Calculate average
        if student_marks.exists():
            total = sum(float(mark.marks) for mark in student_marks)
            average = total / student_marks.count()
            print(f"\nAverage: {average:.1f}%")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()