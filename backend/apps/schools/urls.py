from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchoolSettingsViewSet, DepartmentViewSet, ClassViewSet, SubjectViewSet, TermViewSet

router = DefaultRouter()
router.register(r'settings', SchoolSettingsViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'classes', ClassViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'terms', TermViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
