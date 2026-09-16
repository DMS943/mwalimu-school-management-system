"""
Enhanced model classes and mixins for Mwalimu School Management System.
Includes performance optimizations, caching, and query optimization.
"""

from django.db import models
from django.core.cache import cache
from django.utils import timezone
from apps.core.caching import (
    CacheInvalidationMixin, CachedQuerySet, cache_model_method
)
from apps.core.performance import QueryOptimizer
import logging

logger = logging.getLogger('app.models')


class OptimizedModelManager(models.Manager):
    """Enhanced model manager with built-in query optimizations."""
    
    def get_queryset(self):
        """Return cached queryset by default."""
        return CachedQuerySet(self.model, using=self._db)
    
    def get_optimized(self, select_related=None, prefetch_related=None, **filters):
        """Get objects with optimized queries."""
        queryset = self.get_queryset()
        
        if filters:
            queryset = queryset.filter(**filters)
        
        return QueryOptimizer.optimize_queryset(
            queryset,
            select_related=select_related,
            prefetch_related=prefetch_related
        )
    
    def bulk_create_optimized(self, objs, batch_size=1000, **kwargs):
        """Optimized bulk create with better performance."""
        created_objects = []
        
        for i in range(0, len(objs), batch_size):
            batch = objs[i:i + batch_size]
            created_batch = self.bulk_create(batch, **kwargs)
            created_objects.extend(created_batch)
        
        logger.info(f"Bulk created {len(created_objects)} {self.model.__name__} objects")
        return created_objects


class BaseModel(CacheInvalidationMixin, models.Model):
    """Base model with common fields and performance optimizations."""
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    objects = OptimizedModelManager()
    
    class Meta:
        abstract = True
        ordering = ['-created_at']
    
    @cache_model_method(timeout=3600)
    def get_absolute_url(self):
        """Get cached absolute URL for model instance."""
        return f"/{self._meta.model_name}/{self.pk}/"
    
    def save(self, *args, **kwargs):
        """Enhanced save with cache invalidation and logging."""
        is_update = self.pk is not None
        
        # Call parent save (includes cache invalidation)
        super().save(*args, **kwargs)
        
        # Log model changes for audit trail
        action = 'updated' if is_update else 'created'
        logger.info(f"Model {action}: {self.__class__.__name__} (id={self.pk})")
    
    def delete(self, *args, **kwargs):
        """Enhanced delete with cache invalidation and logging."""
        model_name = self.__class__.__name__
        obj_id = self.pk
        
        # Call parent delete (includes cache invalidation)
        super().delete(*args, **kwargs)
        
        logger.info(f"Model deleted: {model_name} (id={obj_id})")
    
    @classmethod
    def get_cache_key(cls, obj_id, suffix=''):
        """Generate consistent cache key for model instances."""
        key_parts = [cls._meta.label_lower.replace('.', '_'), str(obj_id)]
        if suffix:
            key_parts.append(suffix)
        return ':'.join(key_parts)


class AuditableModel(BaseModel):
    """Model with audit trail capabilities."""
    
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_%(class)s_set'
    )
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_%(class)s_set'
    )
    
    class Meta:
        abstract = True
    
    def save(self, user=None, *args, **kwargs):
        """Save with audit information."""
        if user:
            if not self.pk:
                self.created_by = user
            self.updated_by = user
        
        super().save(*args, **kwargs)


class SoftDeleteManager(OptimizedModelManager):
    """Manager that excludes soft-deleted objects by default."""
    
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)
    
    def with_deleted(self):
        """Include soft-deleted objects in queryset."""
        return super().get_queryset()
    
    def only_deleted(self):
        """Return only soft-deleted objects."""
        return super().get_queryset().filter(deleted_at__isnull=False)


class SoftDeleteModel(BaseModel):
    """Model with soft delete capability."""
    
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deleted_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_%(class)s_set'
    )
    
    objects = SoftDeleteManager()
    all_objects = OptimizedModelManager()  # Access to all objects including deleted
    
    class Meta:
        abstract = True
    
    def delete(self, user=None, hard=False):
        """Soft delete or hard delete the object."""
        if hard:
            super().delete()
        else:
            self.deleted_at = timezone.now()
            if user:
                self.deleted_by = user
            self.save()
    
    def restore(self):
        """Restore soft-deleted object."""
        self.deleted_at = None
        self.deleted_by = None
        self.save()
    
    @property
    def is_deleted(self):
        """Check if object is soft-deleted."""
        return self.deleted_at is not None


class TimestampedModel(models.Model):
    """Simple timestamped model for minimal overhead."""
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
        ordering = ['-created_at']


class CachedCountMixin:
    """Mixin to provide cached count methods for models."""
    
    @classmethod
    @cache_model_method(timeout=1800)
    def get_total_count(cls):
        """Get cached total count of objects."""
        return cls.objects.count()
    
    @classmethod
    @cache_model_method(timeout=1800)
    def get_active_count(cls):
        """Get cached count of active objects."""
        if hasattr(cls.objects.model, 'is_active'):
            return cls.objects.filter(is_active=True).count()
        return cls.objects.count()
    
    @classmethod
    def invalidate_count_cache(cls):
        """Invalidate cached count values."""
        cache_keys = [
            cls.get_cache_key('', 'total_count'),
            cls.get_cache_key('', 'active_count')
        ]
        for key in cache_keys:
            cache.delete(key)


class OptimizedModelMixin:
    """Mixin providing common optimization methods."""
    
    @classmethod
    def get_for_user(cls, user, **filters):
        """Get objects optimized for specific user context."""
        queryset = cls.objects.get_optimized(**filters)
        
        # Add user-specific optimizations
        if hasattr(cls, 'school') and hasattr(user, 'school'):
            queryset = queryset.filter(school=user.school)
        
        return queryset
    
    @classmethod
    def prefetch_for_list_view(cls):
        """Get queryset optimized for list views."""
        select_related = getattr(cls, 'LIST_SELECT_RELATED', [])
        prefetch_related = getattr(cls, 'LIST_PREFETCH_RELATED', [])
        
        return cls.objects.get_optimized(
            select_related=select_related,
            prefetch_related=prefetch_related
        )
    
    @classmethod
    def prefetch_for_detail_view(cls):
        """Get queryset optimized for detail views."""
        select_related = getattr(cls, 'DETAIL_SELECT_RELATED', [])
        prefetch_related = getattr(cls, 'DETAIL_PREFETCH_RELATED', [])
        
        return cls.objects.get_optimized(
            select_related=select_related,
            prefetch_related=prefetch_related
        )


# Utility functions for model optimization
def optimize_model_queryset(model_class, operation='list'):
    """
    Get optimized queryset for common operations.
    
    Args:
        model_class: Django model class
        operation: 'list', 'detail', 'search', 'export'
    
    Returns:
        Optimized queryset
    """
    base_queryset = model_class.objects.all()
    
    if hasattr(model_class, f'{operation.upper()}_SELECT_RELATED'):
        select_related = getattr(model_class, f'{operation.upper()}_SELECT_RELATED')
        base_queryset = base_queryset.select_related(*select_related)
    
    if hasattr(model_class, f'{operation.upper()}_PREFETCH_RELATED'):
        prefetch_related = getattr(model_class, f'{operation.upper()}_PREFETCH_RELATED')
        base_queryset = base_queryset.prefetch_related(*prefetch_related)
    
    if hasattr(model_class, f'{operation.upper()}_ONLY_FIELDS'):
        only_fields = getattr(model_class, f'{operation.upper()}_ONLY_FIELDS')
        base_queryset = base_queryset.only(*only_fields)
    
    return base_queryset


def bulk_update_with_cache_invalidation(model_class, updates, batch_size=1000):
    """
    Perform bulk update with proper cache invalidation.
    
    Args:
        model_class: Django model class
        updates: List of dictionaries with update data
        batch_size: Number of objects per batch
    
    Returns:
        Number of updated objects
    """
    updated_count = 0
    
    for i in range(0, len(updates), batch_size):
        batch_updates = updates[i:i + batch_size]
        
        # Perform bulk update
        for update_data in batch_updates:
            obj_id = update_data.pop('id')
            model_class.objects.filter(id=obj_id).update(**update_data)
            updated_count += 1
        
        # Invalidate cache for updated objects
        if hasattr(model_class, '_invalidate_model_caches'):
            # This would be called on each object, but for performance
            # we'll do a pattern-based cache clear
            cache_pattern = f"*:{model_class._meta.label_lower.replace('.', '_')}:*"
            cache.delete_pattern(cache_pattern)
    
    logger.info(f"Bulk updated {updated_count} {model_class.__name__} objects")
    return updated_count