from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for deployment monitoring"""
    return Response({
        'status': 'healthy',
        'message': 'School Management System is running',
        'debug': settings.DEBUG,
        'database': 'connected'  # Could add actual DB check here
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """API Root - Shows available endpoints"""
    return Response({
        'message': 'School Management System API',
        'version': '1.0',
        'status': 'running',
        'endpoints': {
            'admin': '/admin/',
            'api': {
                'auth': {
                    'login': '/api/auth/token/',
                    'refresh': '/api/auth/token/refresh/',
                },
                'users': '/api/users/',
                'schools': '/api/schools/',
                'students': '/api/students/',
                'academics': '/api/academics/',
                'reports': '/api/reports/',
            }
        },
        'note': 'Most endpoints require authentication. Use /api/auth/token/ to login.'
    })

urlpatterns = [
    path('', api_root, name='api-root'),
    path('health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/users/', include('apps.users.urls')),
    path('api/schools/', include('apps.schools.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/academics/', include('apps.academics.urls')),
    path('api/reports/', include('apps.reports.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
