"""
Advanced Caching System for Mwalimu School Management System.
Multi-layer caching with Redis, database query optimization, and performance monitoring.
"""

import json
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from functools import wraps
from django.core.cache import cache
from django.core.cache.utils import make_template_fragment_key
from django.conf import settings
from django.db import models, connection
from django.http import HttpRequest, HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
import redis
from redis.sentinel import Sentinel

logger = logging.getLogger('app.caching')


class CacheManager:
    """Centralized cache management with multiple layers."""
    
    def __init__(self):
        self.redis_client = self._get_redis_client()
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0
        }
    
    def _get_redis_client(self):
        """Get Redis client with failover support."""
        try:
            if hasattr(settings, 'REDIS_SENTINEL_HOSTS'):
                # Redis Sentinel configuration for high availability
                sentinels = [(host, port) for host, port in settings.REDIS_SENTINEL_HOSTS]
                sentinel = Sentinel(sentinels)
                return sentinel.master_for(settings.REDIS_SENTINEL_SERVICE, socket_timeout=0.1)
            else:
                # Standard Redis configuration
                redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
                return redis.from_url(redis_url, decode_responses=True)
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return None
    
    def get(self, key: str, default=None) -> Any:
        """Get value from cache with fallback."""
        try:
            # Try Django cache first (L1 cache)
            value = cache.get(key)
            if value is not None:
                self.cache_stats['hits'] += 1
                return value
            
            # Try Redis cache (L2 cache)
            if self.redis_client:
                redis_value = self.redis_client.get(key)
                if redis_value:
                    try:
                        value = json.loads(redis_value)
                        # Store in L1 cache for faster access
                        cache.set(key, value, timeout=300)  # 5 minutes in L1
                        self.cache_stats['hits'] += 1
                        return value
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON in Redis for key: {key}")
            
            self.cache_stats['misses'] += 1
            return default
            
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            self.cache_stats['misses'] += 1
            return default
    
    def set(self, key: str, value: Any, timeout: int = 3600) -> bool:
        """Set value in multiple cache layers."""
        try:
            # Store in Django cache (L1)
            cache.set(key, value, timeout=min(timeout, 900))  # Max 15 minutes in L1
            
            # Store in Redis cache (L2) 
            if self.redis_client:
                serialized_value = json.dumps(value, default=str)
                self.redis_client.setex(key, timeout, serialized_value)
            
            self.cache_stats['sets'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete from all cache layers."""
        try:
            # Delete from Django cache
            cache.delete(key)
            
            # Delete from Redis
            if self.redis_client:
                self.redis_client.delete(key)
            
            self.cache_stats['deletes'] += 1
            return True
            
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """Clear cache keys matching pattern."""
        try:
            deleted_count = 0
            
            if self.redis_client:
                keys = self.redis_client.keys(pattern)
                if keys:
                    deleted_count = self.redis_client.delete(*keys)
                    logger.info(f"Cleared {deleted_count} cache keys matching pattern: {pattern}")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cache pattern clear error for pattern {pattern}: {e}")
            return 0


# Global cache manager instance
cache_manager = CacheManager()


class CacheKeyGenerator:
    """Generate consistent cache keys for different data types."""
    
    @staticmethod
    def model_key(model_name: str, obj_id: Union[int, str], **kwargs) -> str:
        """Generate cache key for model instances."""
        key_parts = [f"model:{model_name}:{obj_id}"]
        
        if kwargs:
            sorted_kwargs = sorted(kwargs.items())
            key_suffix = hashlib.md5(str(sorted_kwargs).encode()).hexdigest()[:8]
            key_parts.append(key_suffix)
        
        return ":".join(key_parts)
    
    @staticmethod
    def query_key(model_name: str, query_hash: str, **filters) -> str:
        """Generate cache key for database queries."""
        filter_str = json.dumps(filters, sort_keys=True, default=str)
        filter_hash = hashlib.md5(filter_str.encode()).hexdigest()[:8]
        return f"query:{model_name}:{query_hash}:{filter_hash}"
    
    @staticmethod
    def view_key(view_name: str, request: HttpRequest, **kwargs) -> str:
        """Generate cache key for view responses."""
        key_parts = [f"view:{view_name}"]
        
        # Include user ID if authenticated
        if request.user.is_authenticated:
            key_parts.append(f"user:{request.user.id}")
        
        # Include query parameters
        if request.GET:
            query_hash = hashlib.md5(request.GET.urlencode().encode()).hexdigest()[:8]
            key_parts.append(f"query:{query_hash}")
        
        # Include additional kwargs
        if kwargs:
            kwargs_hash = hashlib.md5(str(sorted(kwargs.items())).encode()).hexdigest()[:8]
            key_parts.append(kwargs_hash)
        
        return ":".join(key_parts)
    
    @staticmethod
    def aggregation_key(model_name: str, aggregation_type: str, **filters) -> str:
        """Generate cache key for aggregation queries."""
        filter_str = json.dumps(filters, sort_keys=True, default=str)
        filter_hash = hashlib.md5(filter_str.encode()).hexdigest()[:8]
        return f"agg:{model_name}:{aggregation_type}:{filter_hash}"


def cache_model_method(timeout: int = 3600, key_func=None):
    """Decorator to cache model method results."""
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            if key_func:
                cache_key = key_func(self, *args, **kwargs)
            else:
                method_name = func.__name__
                obj_id = getattr(self, 'pk', getattr(self, 'id', 'unknown'))
                args_hash = hashlib.md5(str(args + tuple(sorted(kwargs.items()))).encode()).hexdigest()[:8]
                cache_key = f"method:{self.__class__.__name__}:{obj_id}:{method_name}:{args_hash}"
            
            # Try to get from cache
            result = cache_manager.get(cache_key)
            if result is not None:
                return result
            
            # Execute method and cache result
            result = func(self, *args, **kwargs)
            cache_manager.set(cache_key, result, timeout)
            
            return result
        return wrapper
    return decorator


def cache_query_result(timeout: int = 1800, key_prefix: str = None):
    """Decorator to cache database query results."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            func_name = func.__name__
            prefix = key_prefix or func_name
            args_hash = hashlib.md5(str(args + tuple(sorted(kwargs.items()))).encode()).hexdigest()[:8]
            cache_key = f"query_result:{prefix}:{args_hash}"
            
            # Try to get from cache
            result = cache_manager.get(cache_key)
            if result is not None:
                return result
            
            # Execute query and cache result
            result = func(*args, **kwargs)
            
            # Convert QuerySet to list for caching
            if hasattr(result, '_result_cache'):
                result = list(result)
            elif isinstance(result, models.QuerySet):
                result = list(result)
            
            cache_manager.set(cache_key, result, timeout)
            return result
            
        return wrapper
    return decorator


class CachedQuerySet(models.QuerySet):
    """QuerySet with built-in caching capabilities."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cache_timeout = 1800  # 30 minutes default
        self.cache_key_prefix = None
    
    def cache_for(self, timeout: int):
        """Set cache timeout for this query."""
        clone = self._clone()
        clone.cache_timeout = timeout
        return clone
    
    def cache_key(self, prefix: str = None):
        """Set cache key prefix for this query."""
        clone = self._clone()
        clone.cache_key_prefix = prefix
        return clone
    
    def _fetch_all(self):
        """Override to add caching layer."""
        if self._result_cache is None:
            # Generate cache key
            query_sql = str(self.query)
            query_hash = hashlib.md5(query_sql.encode()).hexdigest()[:12]
            
            model_name = self.model.__name__.lower()
            prefix = self.cache_key_prefix or model_name
            cache_key = f"queryset:{prefix}:{query_hash}"
            
            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                self._result_cache = cached_result
                return
            
            # Execute query
            super()._fetch_all()
            
            # Cache the result
            if self._result_cache is not None:
                cache_manager.set(cache_key, list(self._result_cache), self.cache_timeout)
    
    def invalidate_cache(self):
        """Invalidate related cache entries."""
        model_name = self.model.__name__.lower()
        pattern = f"*:{model_name}:*"
        cache_manager.clear_pattern(pattern)


class CacheInvalidationMixin:
    """Mixin to handle cache invalidation on model changes."""
    
    def save(self, *args, **kwargs):
        """Override save to invalidate related caches."""
        super().save(*args, **kwargs)
        self._invalidate_model_caches()
    
    def delete(self, *args, **kwargs):
        """Override delete to invalidate related caches."""
        self._invalidate_model_caches()
        super().delete(*args, **kwargs)
    
    def _invalidate_model_caches(self):
        """Invalidate caches related to this model."""
        model_name = self.__class__.__name__.lower()
        
        # Invalidate model instance caches
        if hasattr(self, 'pk') and self.pk:
            instance_pattern = f"*:{model_name}:{self.pk}*"
            cache_manager.clear_pattern(instance_pattern)
        
        # Invalidate query caches for this model
        query_pattern = f"query*:{model_name}:*"
        cache_manager.clear_pattern(query_pattern)
        
        # Invalidate aggregation caches
        agg_pattern = f"agg:{model_name}:*"
        cache_manager.clear_pattern(agg_pattern)
        
        logger.info(f"Invalidated caches for {model_name} model")