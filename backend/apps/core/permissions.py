"""
Custom permissions for the School Management System.
"""
from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner of the object.
        return obj.owner == request.user


class IsTeacherOrHigher(permissions.BasePermission):
    """
    Permission class to allow access to teachers, HODs, headteachers, and admins.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['teacher', 'hod', 'headteacher', 'admin']


class IsHODOrHigher(permissions.BasePermission):
    """
    Permission class to allow access to HODs, headteachers, and admins.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['hod', 'headteacher', 'admin']


class IsHeadteacherOrAdmin(permissions.BasePermission):
    """
    Permission class to allow access to headteachers and admins only.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['headteacher', 'admin']


class IsAdminOnly(permissions.BasePermission):
    """
    Permission class to allow access to admins only.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role == 'admin'


class IsParentOrTeacher(permissions.BasePermission):
    """
    Permission class for parent-specific or teacher access.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in ['parent', 'teacher', 'hod', 'headteacher', 'admin']


class CanViewStudentData(permissions.BasePermission):
    """
    Permission to view student data based on role and relationships.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins and headteachers can view all student data
        if request.user.role in ['admin', 'headteacher']:
            return True
        
        # HODs can view students in their department
        if request.user.role == 'hod':
            return True
        
        # Teachers can view their students
        if request.user.role == 'teacher':
            return True
        
        # Parents can view their children's data
        if request.user.role == 'parent':
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins and headteachers have full access
        if request.user.role in ['admin', 'headteacher']:
            return True
        
        # HODs can access students in their department's classes
        if request.user.role == 'hod':
            # Check if student is in any class taught by the HOD's department
            from apps.students.models import Student
            if isinstance(obj, Student):
                return obj.classes.filter(department=request.user.department).exists()
        
        # Teachers can access their students
        if request.user.role == 'teacher':
            from apps.students.models import Student
            if isinstance(obj, Student):
                return obj.classes.filter(teacher=request.user).exists()
        
        # Parents can access their children
        if request.user.role == 'parent':
            from apps.students.models import Student
            if isinstance(obj, Student):
                return obj.parent == request.user
        
        return False


class CanManageUsers(permissions.BasePermission):
    """
    Permission to manage user accounts.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Only admins and headteachers can manage users
        return request.user.role in ['admin', 'headteacher']
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins can manage all users
        if request.user.role == 'admin':
            return True
        
        # Headteachers can manage teachers, HODs, and parents, but not other headteachers or admins
        if request.user.role == 'headteacher':
            return obj.role in ['teacher', 'hod', 'parent']
        
        return False


class CanManageClasses(permissions.BasePermission):
    """
    Permission to manage class information.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins, headteachers, and HODs can manage classes
        return request.user.role in ['admin', 'headteacher', 'hod']
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins and headteachers have full access
        if request.user.role in ['admin', 'headteacher']:
            return True
        
        # HODs can manage classes in their department
        if request.user.role == 'hod':
            return obj.department == request.user.department
        
        return False


class CanManageMarks(permissions.BasePermission):
    """
    Permission to manage academic marks.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Teachers and higher roles can manage marks
        return request.user.role in ['teacher', 'hod', 'headteacher', 'admin']
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins and headteachers have full access
        if request.user.role in ['admin', 'headteacher']:
            return True
        
        # HODs can manage marks in their department
        if request.user.role == 'hod':
            # Check if the marks are for a class in the HOD's department
            if hasattr(obj, 'student') and hasattr(obj.student, 'classes'):
                return obj.student.classes.filter(department=request.user.department).exists()
        
        # Teachers can manage marks for their classes
        if request.user.role == 'teacher':
            # Check if the teacher teaches the student's class
            if hasattr(obj, 'student') and hasattr(obj.student, 'classes'):
                return obj.student.classes.filter(teacher=request.user).exists()
        
        return False


class ReadOnlyForParents(permissions.BasePermission):
    """
    Permission that allows parents to only read data about their children.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Parents can only read data
        if request.user.role == 'parent':
            return request.method in permissions.SAFE_METHODS
        
        # Other roles have full access based on other permission classes
        return True


class IPWhitelistPermission(permissions.BasePermission):
    """
    Permission that allows access only from whitelisted IP addresses.
    """
    
    def __init__(self, allowed_ips=None):
        self.allowed_ips = allowed_ips or []
    
    def has_permission(self, request, view):
        from django.conf import settings
        
        # Skip IP check in development
        if settings.DEBUG:
            return True
        
        client_ip = self.get_client_ip(request)
        
        # Check against configured whitelist
        whitelist = getattr(settings, 'API_IP_WHITELIST', self.allowed_ips)
        if not whitelist:
            return True  # No whitelist configured, allow all
        
        return self.is_ip_allowed(client_ip, whitelist)
    
    def get_client_ip(self, request):
        """Get the client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_ip_allowed(self, client_ip, whitelist):
        """Check if IP is in whitelist (supports CIDR notation)."""
        import ipaddress
        
        try:
            client = ipaddress.ip_address(client_ip)
            for allowed in whitelist:
                try:
                    if '/' in allowed:
                        # CIDR notation
                        if client in ipaddress.ip_network(allowed, strict=False):
                            return True
                    else:
                        # Single IP
                        if client == ipaddress.ip_address(allowed):
                            return True
                except (ipaddress.AddressValueError, ValueError):
                    continue
        except ipaddress.AddressValueError:
            return False
        
        return False