from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.cache import cache
import logging

from .models import User
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, PasswordChangeSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, ParentSignupSerializer
)
from apps.core.permissions import (
    IsTeacherOrHigher, IsAdminOnly, CanManageUsers, 
    IsOwnerOrReadOnly, IPWhitelistPermission
)

logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ModelViewSet):
    """Secure user management viewset."""
    
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_queryset(self):
        """Filter users based on user role."""
        user = self.request.user
        
        if user.role == 'admin':
            return User.objects.all()
        elif user.role == 'headteacher':
            # Headteachers can manage teachers, HODs, and parents
            return User.objects.filter(role__in=['teacher', 'hod', 'parent'])
        else:
            # Other roles can only see themselves
            return User.objects.filter(id=user.id)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get current user profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        """Change user password."""
        serializer = PasswordChangeSerializer(
            data=request.data, 
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Log password change
            logger.info(
                f"Password changed for user {request.user.username}",
                extra={
                    'user_id': request.user.id,
                    'ip': request.META.get('REMOTE_ADDR'),
                }
            )
            
            return Response({
                'success': True,
                'message': 'Password changed successfully.'
            })
        
        return Response(
            {
                'error': True,
                'message': 'Password change failed.',
                'details': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(
        detail=True, 
        methods=['post'], 
        permission_classes=[permissions.IsAuthenticated, IsAdminOnly]
    )
    def lock_account(self, request, pk=None):
        """Lock user account (admin only)."""
        user = self.get_object()
        duration = request.data.get('duration_minutes', 30)
        
        user.lock_account(duration)
        
        logger.warning(
            f"Account locked by admin: {user.username}",
            extra={
                'locked_user_id': user.id,
                'admin_user_id': request.user.id,
                'duration_minutes': duration,
            }
        )
        
        return Response({
            'success': True,
            'message': f'Account locked for {duration} minutes.'
        })
    
    @action(
        detail=True, 
        methods=['post'], 
        permission_classes=[permissions.IsAuthenticated, IsAdminOnly]
    )
    def unlock_account(self, request, pk=None):
        """Unlock user account (admin only)."""
        user = self.get_object()
        user.unlock_account()
        
        logger.info(
            f"Account unlocked by admin: {user.username}",
            extra={
                'unlocked_user_id': user.id,
                'admin_user_id': request.user.id,
            }
        )
        
        return Response({
            'success': True,
            'message': 'Account unlocked successfully.'
        })
    
    @action(
        detail=True, 
        methods=['post'], 
        permission_classes=[permissions.IsAuthenticated, IsAdminOnly]
    )
    def force_password_change(self, request, pk=None):
        """Force user to change password on next login."""
        user = self.get_object()
        user.must_change_password = True
        user.save(update_fields=['must_change_password'])
        
        logger.info(
            f"Forced password change for user: {user.username}",
            extra={
                'target_user_id': user.id,
                'admin_user_id': request.user.id,
            }
        )
        
        return Response({
            'success': True,
            'message': 'User will be required to change password on next login.'
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Enhanced secure login view."""
    
    # Rate limiting check
    client_ip = get_client_ip(request)
    rate_limit_key = f"login_attempts:{client_ip}"
    attempts = cache.get(rate_limit_key, 0)
    
    if attempts >= 10:  # 10 attempts per hour from same IP
        logger.warning(
            f"Login rate limit exceeded from IP: {client_ip}",
            extra={'ip': client_ip}
        )
        return Response(
            {
                'error': True,
                'message': 'Too many login attempts. Please try again later.',
                'status_code': 429
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    serializer = LoginSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Reset rate limiting on successful login
        cache.delete(rate_limit_key)
        
        # Log successful login
        logger.info(
            f"Successful login: {user.username}",
            extra={
                'user_id': user.id,
                'ip': client_ip,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            }
        )
        
        # Serialize user data
        user_serializer = UserSerializer(user)
        
        return Response({
            'success': True,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user_serializer.data
        })
    
    # Increment rate limiting on failed login
    cache.set(rate_limit_key, attempts + 1, 3600)  # 1 hour timeout
    
    # Log failed login attempt
    username = request.data.get('username', '')
    logger.warning(
        f"Failed login attempt for username: {username}",
        extra={
            'username': username,
            'ip': client_ip,
            'errors': serializer.errors,
        }
    )
    
    return Response(
        {
            'error': True,
            'message': 'Login failed.',
            'details': serializer.errors
        },
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def parent_signup_view(request):
    """Enhanced secure parent signup view."""
    
    # Rate limiting for signups
    client_ip = get_client_ip(request)
    rate_limit_key = f"signup_attempts:{client_ip}"
    attempts = cache.get(rate_limit_key, 0)
    
    if attempts >= 5:  # 5 signup attempts per hour from same IP
        return Response(
            {
                'error': True,
                'message': 'Too many signup attempts. Please try again later.',
                'status_code': 429
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    serializer = ParentSignupSerializer(data=request.data)
    
    if serializer.is_valid():
        try:
            user = serializer.save()
            
            # Reset rate limiting on successful signup
            cache.delete(rate_limit_key)
            
            # Log successful signup
            logger.info(
                f"New parent signup: {user.username}",
                extra={
                    'user_id': user.id,
                    'ip': client_ip,
                }
            )
            
            # Generate tokens for immediate login
            refresh = RefreshToken.for_user(user)
            user_serializer = UserSerializer(user)
            
            return Response({
                'success': True,
                'message': 'Parent account created successfully.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(
                f"Parent signup error: {str(e)}",
                extra={'ip': client_ip},
                exc_info=True
            )
            return Response(
                {
                    'error': True,
                    'message': 'Signup failed. Please try again.',
                    'status_code': 500
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Increment rate limiting on failed signup
    cache.set(rate_limit_key, attempts + 1, 3600)  # 1 hour timeout
    
    return Response(
        {
            'error': True,
            'message': 'Signup failed.',
            'details': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    """Request password reset."""
    
    # Rate limiting for password reset requests
    client_ip = get_client_ip(request)
    rate_limit_key = f"password_reset:{client_ip}"
    attempts = cache.get(rate_limit_key, 0)
    
    if attempts >= 3:  # 3 password reset requests per hour
        return Response(
            {
                'error': True,
                'message': 'Too many password reset requests. Please try again later.',
                'status_code': 429
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if serializer.is_valid():
        email = serializer.validated_data['email']
        
        # Increment rate limiting
        cache.set(rate_limit_key, attempts + 1, 3600)
        
        try:
            user = User.objects.get(email=email, is_active=True)
            
            # TODO: Implement actual password reset email sending
            # For now, just log the request
            logger.info(
                f"Password reset requested for: {email}",
                extra={
                    'user_id': user.id,
                    'ip': client_ip,
                }
            )
            
        except User.DoesNotExist:
            # Don't reveal that email doesn't exist
            logger.warning(
                f"Password reset requested for non-existent email: {email}",
                extra={'ip': client_ip}
            )
        
        # Always return success to prevent email enumeration
        return Response({
            'success': True,
            'message': 'If the email exists, a password reset link has been sent.'
        })
    
    return Response(
        {
            'error': True,
            'message': 'Invalid request.',
            'details': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )


def get_client_ip(request):
    """Get the client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
    
    # Try to find by ID first (if it's numeric)
    if student_identifier.isdigit():
        try:
            student = Student.objects.get(id=int(student_identifier), is_active=True)
        except Student.DoesNotExist:
            pass
    
    # If not found by ID, try by full name (case-insensitive)
    if not student:
        # Try exact match first
        students = Student.objects.filter(
            Q(first_name__iexact=student_identifier.split()[0]) if ' ' in student_identifier else Q(),
            is_active=True
        )
        
        # Try full name match
        if ' ' in student_identifier:
            name_parts = student_identifier.strip().split()
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:])
            
            students = Student.objects.filter(
                Q(first_name__iexact=first_name, last_name__iexact=last_name) |
                Q(first_name__icontains=first_name, last_name__icontains=last_name),
                is_active=True
            )
        else:
            # Single name - search in both first and last name
            students = Student.objects.filter(
                Q(first_name__iexact=student_identifier) | Q(last_name__iexact=student_identifier),
                is_active=True
            )
        
        if students.count() == 1:
            student = students.first()
        elif students.count() > 1:
            return Response(
                {'detail': 'Multiple students found with that name. Please use the student ID instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if not student:
        return Response(
            {'detail': 'Student not found. Please check the student ID or full name.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if student already has a parent linked
    if student.parent_user:
        return Response(
            {'detail': 'This student already has a parent account linked.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create parent user
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        full_name=full_name,
        role='parent'
    )
    
    # Link student to parent
    student.parent_user = user
    student.save()
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    # Serialize user data
    user_serializer = UserSerializer(user)
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': user_serializer.data,
        'student': {
            'id': student.id,
            'full_name': student.full_name,
            'student_number': student.student_number
        }
    }, status=status.HTTP_201_CREATED)
