"""
Pytest configuration and shared fixtures for the test suite.
"""
import pytest
from django.test import Client
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker):
    """Set up the test database."""
    with django_db_blocker.unblock():
        # Load initial data if needed
        pass


@pytest.fixture
def client():
    """Django test client."""
    return Client()


@pytest.fixture
def api_client():
    """DRF API client."""
    return APIClient()


@pytest.fixture
def user_factory():
    """Factory for creating test users."""
    def create_user(**kwargs):
        defaults = {
            'username': 'testuser',
            'email': 'test@example.com',
            'full_name': 'Test User',
            'role': 'teacher',
            'is_active': True,
        }
        defaults.update(kwargs)
        return User.objects.create_user(**defaults)
    return create_user


@pytest.fixture
def admin_user(user_factory):
    """Create an admin user."""
    return user_factory(
        username='admin',
        email='admin@school.com',
        role='admin',
        is_staff=True,
        is_superuser=True
    )


@pytest.fixture
def teacher_user(user_factory):
    """Create a teacher user."""
    return user_factory(
        username='teacher',
        email='teacher@school.com',
        role='teacher'
    )


@pytest.fixture
def student_user(user_factory):
    """Create a student user (parent account)."""
    return user_factory(
        username='parent',
        email='parent@school.com',
        role='parent'
    )


@pytest.fixture
def authenticated_client(api_client, teacher_user):
    """API client with authenticated teacher user."""
    refresh = RefreshToken.for_user(teacher_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = teacher_user
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """API client with authenticated admin user."""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = admin_user
    return api_client


@pytest.fixture
def school_data():
    """Sample school data."""
    from apps.schools.models import SchoolSettings, Department, Class, Subject, Term
    
    # Create school settings
    school = SchoolSettings.objects.create(
        name="Test School",
        school_type="secondary",
        location="Test City",
        contact_email="test@school.com",
        contact_phone="+1234567890"
    )
    
    # Create department
    department = Department.objects.create(
        name="Mathematics",
        description="Mathematics Department"
    )
    
    # Create class
    class_obj = Class.objects.create(
        name="Form 1A",
        grade_level=9,
        department=department
    )
    
    # Create subject
    subject = Subject.objects.create(
        name="Mathematics",
        code="MATH101",
        department=department
    )
    
    # Create term
    term = Term.objects.create(
        name="Term 1 2024",
        start_date="2024-01-15",
        end_date="2024-04-15",
        is_active=True
    )
    
    return {
        'school': school,
        'department': department,
        'class': class_obj,
        'subject': subject,
        'term': term
    }


@pytest.fixture
def student_data(school_data):
    """Sample student data."""
    from apps.students.models import Student
    
    student = Student.objects.create(
        student_number="STU001",
        first_name="John",
        last_name="Doe",
        date_of_birth="2008-05-15",
        gender="M",
        class_assigned=school_data['class']
    )
    
    return student


@pytest.fixture
def attendance_data(student_data):
    """Sample attendance data."""
    from apps.students.models import Attendance
    from datetime import date
    
    attendance = Attendance.objects.create(
        student=student_data,
        date=date.today(),
        status="present"
    )
    
    return attendance


@pytest.fixture
def marks_data(student_data, school_data):
    """Sample marks data."""
    from apps.academics.models import Mark
    
    mark = Mark.objects.create(
        student=student_data,
        subject=school_data['subject'],
        term=school_data['term'],
        marks=85.5
    )
    
    return mark