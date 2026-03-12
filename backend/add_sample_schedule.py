#!/usr/bin/env python3
"""
Simple script to add sample schedule for testing
"""
import os
import sys
import django
from pathlib import Path
from datetime import time

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.schools.models import Schedule, Class, Subject, Term
from apps.users.models import User

def main():
    print("Adding sample schedule for testing...")
    
    try:
        # Get a teacher user
        teacher = User.objects.filter(role='teacher').first()
        if not teacher:
            print("❌ No teacher users found")
            return
        
        print(f"✓ Found teacher: {teacher.username}")
        
        # Get a class
        class_obj = Class.objects.first()
        if not class_obj:
            print("❌ No classes found")
            return
        
        print(f"✓ Found class: {class_obj.name}")
        
        # Get subjects
        subjects = Subject.objects.all()[:3]  # Get first 3 subjects
        if not subjects:
            print("❌ No subjects found")
            return
        
        print(f"✓ Found {subjects.count()} subjects")
        
        # Get term
        term = Term.objects.first()
        if not term:
            print("❌ No terms found")
            return
        
        print(f"✓ Using term: {term.name}")
        
        # Sample schedule data
        schedule_data = [
            ('monday', time(8, 0), time(9, 0), subjects[0], 'Room 101'),
            ('monday', time(9, 0), time(10, 0), subjects[1], 'Room 102'),
            ('tuesday', time(8, 0), time(9, 0), subjects[2], 'Room 103'),
            ('wednesday', time(10, 0), time(11, 0), subjects[0], 'Room 101'),
            ('friday', time(14, 0), time(15, 0), subjects[1], 'Room 102'),
        ]
        
        # Create schedule entries
        created_count = 0
        for day, start_time, end_time, subject, room in schedule_data:
            schedule, created = Schedule.objects.get_or_create(
                class_assigned=class_obj,
                subject=subject,
                day_of_week=day,
                start_time=start_time,
                term=term,
                defaults={
                    'teacher': teacher,
                    'end_time': end_time,
                    'room': room,
                }
            )
            if created:
                print(f"✓ Created schedule: {day.title()} {start_time}-{end_time} {subject.name} in {room}")
                created_count += 1
            else:
                print(f"- Schedule already exists: {day.title()} {start_time} {subject.name}")
        
        print(f"\n✅ Successfully created {created_count} new schedule entries!")
        
        # Verify schedules
        teacher_schedules = Schedule.objects.filter(teacher=teacher)
        print(f"\nTotal schedules for {teacher.username}: {teacher_schedules.count()}")
        for schedule in teacher_schedules:
            print(f"  {schedule.day_of_week.title()}: {schedule.start_time}-{schedule.end_time} {schedule.subject.name}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()