from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, StudentLinkCodeViewSet, AttendanceViewSet

router = DefaultRouter()
router.register(r'students', StudentViewSet)
router.register(r'link-codes', StudentLinkCodeViewSet)
router.register(r'attendance', AttendanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
