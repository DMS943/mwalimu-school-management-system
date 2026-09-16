"""
Management command to optimize database performance through indexing and analysis.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, models
from django.apps import apps
from apps.core.database import DatabaseOptimizer, DatabaseQueryOptimizer
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Optimize database performance by adding indexes and analyzing queries'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--analyze-only',
            action='store_true',
            help='Only analyze database performance without making changes',
        )
        parser.add_argument(
            '--create-indexes',
            action='store_true',
            help='Create recommended indexes',
        )
        parser.add_argument(
            '--vacuum',
            action='store_true',
            help='Run VACUUM ANALYZE on all tables',
        )
        parser.add_argument(
            '--table',
            type=str,
            help='Specific table to optimize (optional)',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting database optimization...'))
        
        optimizer = DatabaseOptimizer()
        
        # Display current database statistics
        self.stdout.write('\n=== Current Database Statistics ===')
        stats = optimizer.get_database_stats()
        for key, value in stats.items():
            self.stdout.write(f'{key}: {value}')
        
        # Analyze missing indexes
        self.stdout.write('\n=== Index Analysis ===')
        recommendations = optimizer.analyze_missing_indexes()
        
        if not recommendations:
            self.stdout.write(self.style.SUCCESS('No immediate index optimizations needed.'))
        else:
            self.stdout.write(f'Found {len(recommendations)} optimization opportunities:')
            for rec in recommendations[:10]:  # Show top 10
                self.stdout.write(
                    f"Table: {rec['table']} - Sequential scans: {rec['sequential_scans']}, "
                    f"Reads: {rec['sequential_reads']}"
                )
        
        if options['analyze_only']:
            self.stdout.write(self.style.WARNING('Analysis complete. Use --create-indexes to apply optimizations.'))
            return
        
        # Create recommended indexes
        if options['create_indexes']:
            self.create_performance_indexes(options.get('table'))
        
        # Run VACUUM ANALYZE
        if options['vacuum']:
            self.vacuum_tables(options.get('table'))
        
        self.stdout.write(self.style.SUCCESS('Database optimization completed!'))
    
    def create_performance_indexes(self, specific_table=None):
        """Create performance-optimized indexes."""
        self.stdout.write('\n=== Creating Performance Indexes ===')
        
        with connection.cursor() as cursor:
            # Critical indexes for the school management system
            indexes = [
                # Users table indexes
                {
                    'table': 'users',
                    'name': 'idx_users_role_active',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active ON users(role, is_active);'
                },
                {
                    'table': 'users',
                    'name': 'idx_users_department_role',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_department_role ON users(department_id, role);'
                },
                {
                    'table': 'users',
                    'name': 'idx_users_last_login',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login DESC);'
                },
                
                # Students table indexes
                {
                    'table': 'students',
                    'name': 'idx_students_class_active',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_class_active ON students(class_assigned_id, is_active);'
                },
                {
                    'table': 'students',
                    'name': 'idx_students_name_search',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_name_search ON students(last_name, first_name);'
                },
                {
                    'table': 'students',
                    'name': 'idx_students_parent',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_parent ON students(parent_user_id);'
                },
                {
                    'table': 'students',
                    'name': 'idx_students_created_date',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_created_date ON students(created_at DESC);'
                },
                
                # Attendance table indexes
                {
                    'table': 'attendance',
                    'name': 'idx_attendance_date_student',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_date_student ON attendance(date DESC, student_id);'
                },
                {
                    'table': 'attendance',
                    'name': 'idx_attendance_status_date',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status_date ON attendance(status, date DESC);'
                },
                
                # Marks table indexes
                {
                    'table': 'marks',
                    'name': 'idx_marks_student_term',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marks_student_term ON marks(student_id, term_id);'
                },
                {
                    'table': 'marks',
                    'name': 'idx_marks_subject_term',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marks_subject_term ON marks(subject_id, term_id);'
                },
                {
                    'table': 'marks',
                    'name': 'idx_marks_grade',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marks_grade ON marks(grade);'
                },
                
                # Schedules table indexes
                {
                    'table': 'schedules',
                    'name': 'idx_schedules_class_day',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_class_day ON schedules(class_assigned_id, day_of_week);'
                },
                {
                    'table': 'schedules',
                    'name': 'idx_schedules_teacher_term',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_teacher_term ON schedules(teacher_id, term_id);'
                },
                {
                    'table': 'schedules',
                    'name': 'idx_schedules_time_range',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedules_time_range ON schedules(start_time, end_time);'
                },
                
                # Classes table indexes
                {
                    'table': 'classes',
                    'name': 'idx_classes_grade_dept',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_grade_dept ON classes(grade_level, department_id);'
                },
                {
                    'table': 'classes',
                    'name': 'idx_classes_teacher',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_teacher ON classes(class_teacher_user_id);'
                },
                
                # Terms table indexes
                {
                    'table': 'terms',
                    'name': 'idx_terms_active_dates',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_active_dates ON terms(is_active, start_date, end_date);'
                },
                
                # Subjects table indexes
                {
                    'table': 'subjects',
                    'name': 'idx_subjects_department',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subjects_department ON subjects(department_id);'
                },
                
                # Student link codes indexes
                {
                    'table': 'student_link_codes',
                    'name': 'idx_link_codes_active_expires',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_link_codes_active_expires ON student_link_codes(is_active, expires_at);'
                },
                {
                    'table': 'student_link_codes',
                    'name': 'idx_link_codes_student',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_link_codes_student ON student_link_codes(student_id);'
                },
                
                # Partial indexes for better performance
                {
                    'table': 'users',
                    'name': 'idx_users_active_only',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_only ON users(id) WHERE is_active = true;'
                },
                {
                    'table': 'students',
                    'name': 'idx_students_active_only',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_active_only ON students(id) WHERE is_active = true;'
                },
                {
                    'table': 'terms',
                    'name': 'idx_terms_active_only',
                    'sql': 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_terms_active_only ON terms(id) WHERE is_active = true;'
                },
            ]
            
            for index in indexes:
                if specific_table and index['table'] != specific_table:
                    continue
                
                try:
                    self.stdout.write(f"Creating index {index['name']} on {index['table']}...")
                    cursor.execute(index['sql'])
                    self.stdout.write(self.style.SUCCESS(f"✓ Created {index['name']}"))
                except Exception as e:
                    if 'already exists' in str(e):
                        self.stdout.write(self.style.WARNING(f"Index {index['name']} already exists"))
                    else:
                        self.stdout.write(self.style.ERROR(f"✗ Failed to create {index['name']}: {e}"))
    
    def vacuum_tables(self, specific_table=None):
        """Run VACUUM ANALYZE on tables."""
        self.stdout.write('\n=== Running VACUUM ANALYZE ===')
        
        # Get all table names from Django models
        table_names = []
        for model in apps.get_models():
            if not specific_table or model._meta.db_table == specific_table:
                table_names.append(model._meta.db_table)
        
        with connection.cursor() as cursor:
            for table_name in table_names:
                try:
                    self.stdout.write(f"Analyzing table {table_name}...")
                    cursor.execute(f'VACUUM ANALYZE "{table_name}";')
                    self.stdout.write(self.style.SUCCESS(f"✓ Analyzed {table_name}"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"✗ Failed to analyze {table_name}: {e}"))
        
        self.stdout.write(self.style.SUCCESS('VACUUM ANALYZE completed!'))