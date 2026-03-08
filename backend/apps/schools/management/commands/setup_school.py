from django.core.management.base import BaseCommand
from apps.schools.models import SchoolSettings, Department, Class, Subject, Term
from datetime import date, timedelta

class Command(BaseCommand):
    help = 'Setup initial school data'

    def add_arguments(self, parser):
        parser.add_argument('--name', type=str, help='School name', required=True)
        parser.add_argument('--type', type=str, choices=['primary', 'secondary'], default='secondary')
        parser.add_argument('--location', type=str, help='School location', required=True)

    def handle(self, *args, **options):
        # Create school settings
        if SchoolSettings.objects.exists():
            self.stdout.write(self.style.WARNING('School settings already exist. Skipping...'))
        else:
            settings = SchoolSettings.objects.create(
                name=options['name'],
                school_type=options['type'],
                location=options['location']
            )
            self.stdout.write(self.style.SUCCESS(f'Created school: {settings.name}'))

        # Create departments
        departments_data = [
            {'name': 'Mathematics', 'description': 'Mathematics Department'},
            {'name': 'Sciences', 'description': 'Science Department'},
            {'name': 'Languages', 'description': 'Languages Department'},
            {'name': 'Social Studies', 'description': 'Social Studies Department'},
        ]

        for dept_data in departments_data:
            dept, created = Department.objects.get_or_create(
                name=dept_data['name'],
                defaults={'description': dept_data['description']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created department: {dept.name}'))

        # Create classes (grades 8-12 for secondary)
        if options['type'] == 'secondary':
            grades = range(8, 13)
        else:
            grades = range(1, 8)

        for grade in grades:
            class_obj, created = Class.objects.get_or_create(
                name=f'Grade {grade}',
                grade_level=grade
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created class: {class_obj.name}'))

        # Create subjects
        subjects_data = [
            {'name': 'Mathematics', 'code': 'MATH'},
            {'name': 'English', 'code': 'ENG'},
            {'name': 'Science', 'code': 'SCI'},
            {'name': 'Social Studies', 'code': 'SS'},
            {'name': 'Physical Education', 'code': 'PE'},
        ]

        if options['type'] == 'secondary':
            subjects_data.extend([
                {'name': 'Physics', 'code': 'PHY'},
                {'name': 'Chemistry', 'code': 'CHEM'},
                {'name': 'Biology', 'code': 'BIO'},
                {'name': 'History', 'code': 'HIST'},
                {'name': 'Geography', 'code': 'GEO'},
            ])

        for subj_data in subjects_data:
            subj, created = Subject.objects.get_or_create(
                code=subj_data['code'],
                defaults={'name': subj_data['name']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created subject: {subj.name}'))

        # Create current term
        today = date.today()
        term_start = today.replace(month=1, day=1)
        term_end = today.replace(month=4, day=30)
        
        term, created = Term.objects.get_or_create(
            name='Term 1 2024',
            defaults={
                'start_date': term_start,
                'end_date': term_end,
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created term: {term.name}'))

        self.stdout.write(self.style.SUCCESS('\nSchool setup complete!'))
        self.stdout.write('Next steps:')
        self.stdout.write('1. Create a superuser: python manage.py createsuperuser')
        self.stdout.write('2. Run the server: python manage.py runserver')
        self.stdout.write('3. Access admin panel: http://localhost:8000/admin/')
