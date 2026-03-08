from rest_framework import serializers
from .models import Mark

class MarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mark
        fields = '__all__'
        read_only_fields = ['grade']
