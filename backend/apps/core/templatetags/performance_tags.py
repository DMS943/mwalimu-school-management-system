"""
Performance-optimized template tags for Mwalimu School Management System.
Provides caching, asset optimization, and resource hints.
"""

import json
import hashlib
from datetime import datetime
from django import template
from django.core.cache import cache
from django.conf import settings
from django.utils.safestring import mark_safe
from django.templatetags.static import static
from apps.core.cdn_optimization import cdn_manager, ResourceHintsGenerator
from apps.core.caching import cache_manager

register = template.Library()


@register.simple_tag
def cached_static(path, version=True):
    """
    Get static file URL with CDN support and versioning.
    
    Usage: {% cached_static 'css/main.css' %}
    """
    return cdn_manager.get_static_url(path, version=version)


@register.simple_tag(takes_context=True)
def cache_fragment(context, cache_key, timeout=3600):
    """
    Cache template fragment with automatic key generation.
    
    Usage: {% cache_fragment 'user_dashboard' 300 as cached_content %}
    """
    # Generate cache key with context
    request = context.get('request')
    user_id = request.user.id if request and request.user.is_authenticated else 'anonymous'
    
    full_cache_key = f"fragment:{cache_key}:user:{user_id}"
    
    cached_content = cache_manager.get(full_cache_key)
    if cached_content is not None:
        return cached_content
    
    # Return empty string - content will be cached by template
    return ''


@register.simple_tag
def resource_hints():
    """
    Generate resource hints for performance optimization.
    
    Usage: {% resource_hints %}
    """
    hints = []
    
    # DNS prefetch hints
    hints.append(ResourceHintsGenerator.generate_dns_prefetch())
    
    # Preconnect hints
    hints.append(ResourceHintsGenerator.generate_preconnect_hints())
    
    return mark_safe('\n'.join(filter(None, hints)))


@register.simple_tag(takes_context=True)
def preload_hints(context):
    """
    Generate preload hints for critical resources.
    
    Usage: {% preload_hints %}
    """
    request = context.get('request')
    return ResourceHintsGenerator.generate_preload_hints(request)


@register.filter
def cache_buster(url):
    """
    Add cache busting parameter to URL.
    
    Usage: {{ 'main.css'|cache_buster }}
    """
    if not url:
        return url
    
    # Generate hash based on current time and URL
    timestamp = int(datetime.now().timestamp())
    hash_input = f"{url}{timestamp}"
    cache_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]
    
    separator = '&' if '?' in url else '?'
    return f"{url}{separator}v={cache_hash}"


@register.inclusion_tag('core/performance_metrics.html', takes_context=True)
def performance_metrics(context):
    """
    Display performance metrics in debug mode.
    
    Usage: {% performance_metrics %}
    """
    if not settings.DEBUG:
        return {'show_metrics': False}
    
    request = context.get('request')
    
    # Get performance data from request
    metrics = {
        'query_count': getattr(request, '_query_count', 0),
        'response_time': getattr(request, '_response_time', 0),
        'memory_usage': getattr(request, '_memory_usage', 0),
        'cache_hits': cache_manager.cache_stats.get('hits', 0),
        'cache_misses': cache_manager.cache_stats.get('misses', 0),
    }
    
    return {
        'show_metrics': True,
        'metrics': metrics
    }


@register.simple_tag
def optimized_image(image_path, width=None, height=None, quality=85):
    """
    Generate optimized image URL with dimensions and quality.
    
    Usage: {% optimized_image 'uploads/photo.jpg' width=300 height=200 %}
    """
    if not image_path:
        return ''
    
    # Generate cache key for optimized image
    params = {
        'width': width,
        'height': height,
        'quality': quality
    }
    
    param_str = '&'.join(f"{k}={v}" for k, v in params.items() if v is not None)
    
    if param_str:
        separator = '&' if '?' in image_path else '?'
        optimized_url = f"{image_path}{separator}{param_str}"
    else:
        optimized_url = image_path
    
    return optimized_url


@register.simple_tag
def lazy_load_script():
    """
    Generate lazy loading script for images and other resources.
    
    Usage: {% lazy_load_script %}
    """
    script = """
    <script>
    // Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for older browsers
        document.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
        });
    }
    </script>
    """
    return mark_safe(script)


@register.simple_tag
def critical_css():
    """
    Inline critical CSS for above-the-fold content.
    
    Usage: {% critical_css %}
    """
    # In production, this would contain actual critical CSS
    critical_styles = """
    <style>
    /* Critical CSS for above-the-fold content */
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .header { background: #333; color: white; padding: 1rem; }
    .main-nav { display: flex; justify-content: space-between; }
    .loading { display: flex; justify-content: center; padding: 2rem; }
    </style>
    """
    return mark_safe(critical_styles)


@register.simple_tag(takes_context=True)
def cached_user_data(context, timeout=1800):
    """
    Get cached user-specific data.
    
    Usage: {% cached_user_data 3600 as user_stats %}
    """
    request = context.get('request')
    
    if not request or not request.user.is_authenticated:
        return {}
    
    cache_key = f"user_data:{request.user.id}"
    cached_data = cache_manager.get(cache_key)
    
    if cached_data is not None:
        return cached_data
    
    # Generate user data (this would be customized based on needs)
    user_data = {
        'full_name': request.user.get_full_name(),
        'role': getattr(request.user, 'role', 'user'),
        'last_login': request.user.last_login,
        'permissions': list(request.user.get_all_permissions())
    }
    
    cache_manager.set(cache_key, user_data, timeout)
    return user_data


@register.filter
def compress_whitespace(value):
    """
    Compress HTML whitespace for better performance.
    
    Usage: {{ html_content|compress_whitespace }}
    """
    if not value:
        return value
    
    import re
    # Remove extra whitespace but preserve structure
    compressed = re.sub(r'\s+', ' ', str(value))
    compressed = re.sub(r'>\s+<', '><', compressed)
    
    return mark_safe(compressed.strip())


@register.simple_tag
def service_worker():
    """
    Generate service worker registration script.
    
    Usage: {% service_worker %}
    """
    if not getattr(settings, 'PWA_ENABLED', False):
        return ''
    
    script = """
    <script>
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('SW registered'))
                .catch(error => console.log('SW registration failed'));
        });
    }
    </script>
    """
    return mark_safe(script)


@register.simple_tag
def performance_budget():
    """
    Generate performance budget monitoring script.
    
    Usage: {% performance_budget %}
    """
    if not settings.DEBUG:
        return ''
    
    script = """
    <script>
    // Performance budget monitoring
    window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
        
        // Warn if load time exceeds budget (2 seconds)
        if (loadTime > 2000) {
            console.warn(`Page load time: ${loadTime}ms exceeds budget of 2000ms`);
        }
        
        // Log performance metrics
        console.log('Performance Metrics:', {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: loadTime,
            firstPaint: performance.getEntriesByType('paint')[0]?.startTime
        });
    });
    </script>
    """
    return mark_safe(script)