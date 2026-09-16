"""
URL Configuration for Mwalimu School Management System.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.core import views

# API URL patterns
api_patterns = [
    path('auth/', include('apps.users.urls')),
    path('schools/', include('apps.schools.urls')),
    path('students/', include('apps.students.urls')),
    path('academics/', include('apps.academics.urls')),
    path('reports/', include('apps.reports.urls')),
]

# Health check and monitoring URLs
monitoring_patterns = [
    path('health/', views.health_check, name='health_check'),
    path('ready/', views.ready_check, name='ready_check'),
    path('alive/', views.alive_check, name='alive_check'),
    path('metrics/', views.SystemMetricsView.as_view(), name='system_metrics'),
    path('database/', views.DatabaseMetricsView.as_view(), name='database_metrics'),
    path('prometheus/', views.metrics_prometheus, name='prometheus_metrics'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_patterns)),
    path('monitoring/', include(monitoring_patterns)),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Add debug toolbar URLs if available
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

# Custom error handlers
handler400 = 'apps.core.views.bad_request_view'
handler403 = 'apps.core.views.permission_denied_view'
handler404 = 'apps.core.views.not_found_view'
handler500 = 'apps.core.views.server_error_view'