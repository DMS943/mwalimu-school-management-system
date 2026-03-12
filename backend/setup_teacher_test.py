#!/usr/bin/env python3
"""
Setup teacher user for testing reports
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

from apps.users.models import User
from apps.schools.models import Class, Term
from apps.students.models import Student
from apps.academics.models import Mark
from django.contrib.auth.hashers import make_password

def main():
    print("Setting up teacher user for testing...")
    
    try:
        # Create or get teacher user
        teacher, created = User.objects.get_or_create(
            username='teacher1',
            defaults={
                'email': 'teacher1@school.com',
                'password': make_password('teacher123'),
                'role': 'teacher',
                'first_name': 'John',
                'last_name': 'Teacher',
                'is_active': True,
            }
        )
        
        if created:
            print(f"✓ Created teacher user: {teacher.username}")
        else:
            print(f"✓ Teacher user exists: {teacher.username}")
        
        # Assign teacher to a class
        first_class = Class.objects.first()
        if first_class:
            first_class.class_teacher_user = teacher
            first_class.save()
            print(f"✓ Assigned teacher to class: {first_class.name}")
            
            # Check students in this class
            students = Student.objects.filter(class_assigned=first_class)
            print(f"✓ Students in class {first_class.name}: {students.count()}")
            
            # Check marks for students
            term = Term.objects.first()
            if term:
                for student in students[:3]:  # Check first 3 students
                    marks = Mark.objects.filter(student=student, term=term)
                    print(f"  - {student.first_name} {student.last_name}: {marks.count()} marks")
        
        print(f"\n✅ Teacher setup complete!")
        print(f"Login credentials:")
        print(f"Username: teacher1")
        print(f"Password: teacher123")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()