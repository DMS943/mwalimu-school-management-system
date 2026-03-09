from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, login_view, parent_signup_view

router = DefaultRouter()
router.register(r'', UserViewSet)

urlpatterns = [
    path('login/', login_view, name='login'),
    path('parent-signup/', parent_signup_view, name='parent-signup'),
    path('', include(router.urls)),
]
