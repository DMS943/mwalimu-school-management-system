"""
Integration tests for complete API workflows.
"""
import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestStudentManagementWorkflow:
    """Test complete student management workflow."""
    
    def test_student_enrollment_workflow(self, admin_client, school_data):
        """Test complete student enrollment process."""
        # Step 1: Create student
        student_data = {
            'student_number': 'STU2024001',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'date_of_birth': '2008-03-15',
            'gender': 'F',
            'class_assigned': school_data['class'].id,
            'guardian_name': 'John Smith',
            'guardian_phone': '+1234567890',
            'guardian_email': 'john.smith@example.com'
        }
        
        url = reverse('student-list')
        response = admin_client.post(url, student_data)
        assert response.status_code == status.HTTP_201_CREATED
        student_id = response.data['id']
        
        # Step 2: Mark attendance
        from datetime import date
        attendance_data = {
            'student': student_id,
            'date': date.today().isoformat(),
            'status': 'present',
            'notes': 'On time'
        }
        
        attendance_url = reverse('attendance-list')
        response = admin_client.post(attendance_url, attendance_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Step 3: Record marks
        marks_data = {
            'student': student_id,
            'subject': school_data['subject'].id,
            'term': school_data['term'].id,
            'marks': 87.5
        }
        
        marks_url = reverse('mark-list')
        response = admin_client.post(marks_url, marks_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Step 4: Verify student record
        student_detail_url = reverse('student-detail', kwargs={'pk': student_id})
        response = admin_client.get(student_detail_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['student_number'] == 'STU2024001'


@pytest.mark.django_db
class TestAcademicReportingWorkflow:
    """Test academic reporting workflow."""
    
    def test_generate_term_report(self, authenticated_client, school_data, student_data, marks_data):
        """Test generating term report for student."""
        # Get student's term report
        url = reverse('reports-term-report')
        params = {
            'student_id': student_data.id,
            'term_id': school_data['term'].id
        }
        
        response = authenticated_client.get(url, params)
        assert response.status_code == status.HTTP_200_OK
        
        # Verify report structure
        assert 'student' in response.data
        assert 'term' in response.data
        assert 'subjects' in response.data
        assert 'overall_grade' in response.data
    
    def test_class_performance_summary(self, authenticated_client, school_data):
        """Test class performance summary."""
        url = reverse('reports-class-performance')
        params = {
            'class_id': school_data['class'].id,
            'term_id': school_data['term'].id
        }
        
        response = authenticated_client.get(url, params)
        assert response.status_code == status.HTTP_200_OK
        
        # Verify summary structure
        assert 'class_info' in response.data
        assert 'term_info' in response.data
        assert 'performance_stats' in response.data


@pytest.mark.django_db
class TestSecurityWorkflow:
    """Test security-related workflows."""
    
    def test_password_reset_workflow(self, api_client, teacher_user):
        """Test password reset workflow."""
        # Step 1: Request password reset
        url = reverse('password-reset')
        data = {'email': teacher_user.email}
        
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        
        # In tests, we'd normally check email was sent
        # For now, just verify the endpoint works
        
    def test_account_lockout_and_unlock(self, api_client, teacher_user):
        """Test account lockout and unlock workflow."""
        login_url = reverse('token_obtain_pair')
        
        # Trigger account lockout with failed logins
        for i in range(6):
            response = api_client.post(login_url, {
                'username': teacher_user.username,
                'password': 'wrongpassword'
            })
        
        teacher_user.refresh_from_db()
        assert teacher_user.is_account_locked()
        
        # Test unlock (admin would do this)
        teacher_user.unlock_account()
        assert not teacher_user.is_account_locked()


@pytest.mark.django_db
class TestDataConsistencyWorkflow:
    """Test data consistency across operations."""
    
    def test_cascade_deletions(self, admin_client, school_data, student_data, marks_data):
        """Test that related data is handled properly on deletion."""
        # Delete student should handle related records appropriately
        student_url = reverse('student-detail', kwargs={'pk': student_data.id})
        
        # First, verify student exists with related data
        response = admin_client.get(student_url)
        assert response.status_code == status.HTTP_200_OK
        
        # Delete student
        response = admin_client.delete(student_url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify student is deleted
        response = admin_client.get(student_url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_term_activation_consistency(self, admin_client, school_data):
        """Test that only one term can be active at a time."""
        from apps.schools.models import Term
        
        # Create another term
        term_data = {
            'name': 'Term 2 2024',
            'start_date': '2024-05-01',
            'end_date': '2024-08-15',
            'is_active': True
        }
        
        url = reverse('term-list')
        response = admin_client.post(url, term_data)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify only one term is active
        active_terms = Term.objects.filter(is_active=True)
        assert active_terms.count() == 1
        assert active_terms.first().name == 'Term 2 2024'