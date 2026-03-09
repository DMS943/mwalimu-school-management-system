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
    """Parent signup view that links parent to student using student ID or full name"""
    from apps.students.models import Student
    from django.db.models import Q
    
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    full_name = request.data.get('full_name')
    student_identifier = request.data.get('student_identifier')  # Can be ID or full name
    
    # Validate required fields
    if not all([username, email, password, full_name, student_identifier]):
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
    
    # Find student by ID or full name
    student = None
    
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
