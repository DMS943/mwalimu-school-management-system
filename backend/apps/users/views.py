from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer, UserCreateSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Custom login view that returns tokens and user data"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'detail': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response(
            {'detail': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    
    # Serialize user data
    user_serializer = UserSerializer(user)
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': user_serializer.data
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def parent_signup_view(request):
    """Parent signup view that validates link code and creates parent account"""
    from apps.students.models import StudentLinkCode
    from django.utils import timezone
    
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    full_name = request.data.get('full_name')
    link_code = request.data.get('link_code')
    
    # Validate required fields
    if not all([username, email, password, full_name, link_code]):
        return Response(
            {'detail': 'All fields are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if username already exists
    if User.objects.filter(username=username).exists():
        return Response(
            {'detail': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if email already exists
    if User.objects.filter(email=email).exists():
        return Response(
            {'detail': 'Email already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate link code
    try:
        link_code_obj = StudentLinkCode.objects.get(
            link_code=link_code.upper(),
            is_active=True
        )
        
        # Check if code has expired
        if link_code_obj.expires_at < timezone.now():
            return Response(
                {'detail': 'Link code has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if code has already been used
        if link_code_obj.used_by:
            return Response(
                {'detail': 'Link code has already been used'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    except StudentLinkCode.DoesNotExist:
        return Response(
            {'detail': 'Invalid link code'},
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
    student = link_code_obj.student
    student.parent_user = user
    student.save()
    
    # Mark link code as used
    link_code_obj.used_by = user
    link_code_obj.used_at = timezone.now()
    link_code_obj.is_active = False
    link_code_obj.save()
    
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
