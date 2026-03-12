#!/usr/bin/env python3
"""
Create schedules table and add sample data
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

from django.db import connection

def main():
    print("Creating schedules table and adding sample data...")
    
    try:
        with connection.cursor() as cursor:
            # Create schedules table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schedules (
                    id SERIAL PRIMARY KEY,
                    class_assigned_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
                    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
                    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    room VARCHAR(50),
                    term_id INTEGER REFERENCES terms(id) ON DELETE CASCADE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(class_assigned_id, day_of_week, start_time, term_id)
                );
            """)
            print("✓ Created schedules table")
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON schedules(teacher_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_schedules_class ON schedules(class_assigned_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_schedules_day_time ON schedules(day_of_week, start_time);")
            print("✓ Created indexes")
            
            # Insert sample data
            cursor.execute("""
                INSERT INTO schedules (class_assigned_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, term_id) VALUES
                (1, 1, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'monday', '08:00:00', '09:00:00', 'Room 101', 1),
                (1, 2, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'monday', '09:00:00', '10:00:00', 'Room 102', 1),
                (1, 3, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'tuesday', '08:00:00', '09:00:00', 'Room 103', 1),
                (1, 1, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'wednesday', '10:00:00', '11:00:00', 'Room 101', 1),
                (1, 2, (SELECT id FROM users WHERE role = 'teacher' LIMIT 1), 'friday', '14:00:00', '15:00:00', 'Room 102', 1)
                ON CONFLICT (class_assigned_id, day_of_week, start_time, term_id) DO NOTHING;
            """)
            print("✓ Inserted sample schedule data")
            
            # Show results
            cursor.execute("""
                SELECT 
                    s.day_of_week,
                    s.start_time,
                    s.end_time,
                    sub.name as subject_name,
                    c.name as class_name,
                    s.room
                FROM schedules s
                JOIN subjects sub ON s.subject_id = sub.id
                JOIN classes c ON s.class_assigned_id = c.id
                ORDER BY s.day_of_week, s.start_time;
            """)
            
            results = cursor.fetchall()
            print(f"\n✅ Created {len(results)} schedule entries:")
            for row in results:
                day, start, end, subject, class_name, room = row
                print(f"  {day.title()}: {start}-{end} {subject} in {room} (Class: {class_name})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()