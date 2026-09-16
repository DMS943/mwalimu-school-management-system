"""
CDN and Static File Optimization for Mwalimu School Management System.
Handles CDN integration, static file compression, and asset optimization.
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from django.conf import settings
from django.core.files.storage import default_storage
from django.templatetags.static import static
from django.utils.safestring import mark_safe
import boto3
from botocore.exceptions import ClientError
import gzip
import brotli

logger = logging.getLogger('app.cdn_optimization')


class CDNManager:
    """Manages CDN integration and static file optimization."""
    
    def __init__(self):
        self.cdn_enabled = getattr(settings, 'CDN_ENABLED', False)
        self.cdn_domain = getattr(settings, 'CDN_DOMAIN', None)
        self.aws_s3_bucket = getattr(settings, 'AWS_S3_CDN_BUCKET', None)
        self.cloudflare_enabled = getattr(settings, 'CLOUDFLARE_ENABLED', False)
        
        # Initialize AWS S3 client for CDN
        if self.aws_s3_bucket:
            self.s3_client = boto3.client('s3')
        else:
            self.s3_client = None
    
    def get_static_url(self, path: str, version: bool = True) -> str:
        """Get optimized static file URL with CDN support."""
        if not self.cdn_enabled or not self.cdn_domain:
            return static(path)
        
        # Generate versioned URL for cache busting
        if version:
            file_path = Path(settings.STATIC_ROOT) / path
            if file_path.exists():
                # Use file modification time for versioning
                mtime = int(file_path.stat().st_mtime)
                path = f"{path}?v={mtime}"
        
        return f"https://{self.cdn_domain}/{path}"
    
    def upload_to_cdn(self, local_file_path: str, cdn_key: str) -> bool:
        """Upload file to CDN storage."""
        if not self.s3_client or not self.aws_s3_bucket:
            logger.error("CDN not properly configured")
            return False
        
        try:
            # Compress file before upload
            compressed_file = self._compress_file(local_file_path)
            
            # Set appropriate headers
            content_type = self._get_content_type(local_file_path)
            headers = {
                'ContentType': content_type,
                'CacheControl': self._get_cache_control(local_file_path),
                'ContentEncoding': 'gzip' if compressed_file != local_file_path else None
            }
            
            # Remove None values
            headers = {k: v for k, v in headers.items() if v is not None}
            
            # Upload to S3
            with open(compressed_file, 'rb') as file:
                self.s3_client.put_object(
                    Bucket=self.aws_s3_bucket,
                    Key=cdn_key,
                    Body=file,
                    **headers
                )
            
            # Clean up compressed file if it's different from original
            if compressed_file != local_file_path:
                os.remove(compressed_file)
            
            logger.info(f"Uploaded {local_file_path} to CDN as {cdn_key}")
            return True
            
        except Exception as e:
            logger.error(f"CDN upload failed for {local_file_path}: {e}")
            return False
    
    def sync_static_files(self) -> Dict[str, int]:
        """Sync all static files to CDN."""
        if not self.cdn_enabled:
            return {'error': 'CDN not enabled'}
        
        static_root = Path(settings.STATIC_ROOT)
        if not static_root.exists():
            return {'error': 'Static files not collected'}
        
        uploaded = 0
        failed = 0
        
        for file_path in static_root.rglob('*'):
            if file_path.is_file():
                # Generate CDN key (relative path from static root)
                relative_path = file_path.relative_to(static_root)
                cdn_key = str(relative_path).replace('\\', '/')
                
                # Upload to CDN
                if self.upload_to_cdn(str(file_path), cdn_key):
                    uploaded += 1
                else:
                    failed += 1
        
        return {
            'uploaded': uploaded,
            'failed': failed,
            'total_processed': uploaded + failed
        }
    
    def _compress_file(self, file_path: str) -> str:
        """Compress file for CDN upload."""
        file_ext = Path(file_path).suffix.lower()
        
        # Only compress text-based files
        compressible_extensions = {'.css', '.js', '.html', '.xml', '.json', '.svg'}
        
        if file_ext not in compressible_extensions:
            return file_path
        
        # Create compressed version
        compressed_path = f"{file_path}.gz"
        
        with open(file_path, 'rb') as f_in:
            with gzip.open(compressed_path, 'wb') as f_out:
                f_out.writelines(f_in)
        
        # Check if compression is beneficial (at least 10% reduction)
        original_size = os.path.getsize(file_path)
        compressed_size = os.path.getsize(compressed_path)
        
        if compressed_size < original_size * 0.9:
            return compressed_path
        else:
            # Remove compressed file if not beneficial
            os.remove(compressed_path)
            return file_path
    
    def _get_content_type(self, file_path: str) -> str:
        """Get appropriate content type for file."""
        file_ext = Path(file_path).suffix.lower()
        
        content_types = {
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.html': 'text/html',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
        }
        
        return content_types.get(file_ext, 'application/octet-stream')
    
    def _get_cache_control(self, file_path: str) -> str:
        """Get appropriate cache control header."""
        file_ext = Path(file_path).suffix.lower()
        
        # Long cache for assets with hash in filename
        if any(char in Path(file_path).stem for char in ['hash', 'min']):
            return 'public, max-age=31536000'  # 1 year
        
        # Medium cache for static assets
        if file_ext in {'.css', '.js', '.png', '.jpg', '.gif', '.svg'}:
            return 'public, max-age=86400'  # 1 day
        
        # Short cache for HTML and other dynamic content
        return 'public, max-age=3600'  # 1 hour
    
    def purge_cdn_cache(self, paths: List[str] = None) -> bool:
        """Purge CDN cache for specified paths."""
        if not self.cloudflare_enabled:
            logger.info("Cloudflare not enabled, skipping cache purge")
            return True
        
        try:
            # This would integrate with Cloudflare API
            # Implementation depends on CDN provider
            logger.info(f"Purging CDN cache for paths: {paths}")
            return True
            
        except Exception as e:
            logger.error(f"CDN cache purge failed: {e}")
            return False


class AssetOptimizer:
    """Optimizes static assets for better performance."""
    
    def __init__(self):
        self.optimization_enabled = getattr(settings, 'ASSET_OPTIMIZATION_ENABLED', True)
    
    def optimize_images(self, image_dir: str = None) -> Dict[str, int]:
        """Optimize images for web delivery."""
        if not self.optimization_enabled:
            return {'skipped': True}
        
        image_dir = image_dir or os.path.join(settings.MEDIA_ROOT)
        optimized_count = 0
        total_savings = 0
        
        for root, dirs, files in os.walk(image_dir):
            for file in files:
                if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                    file_path = os.path.join(root, file)
                    original_size = os.path.getsize(file_path)
                    
                    # Optimize image (placeholder - would use actual optimization library)
                    if self._optimize_image_file(file_path):
                        new_size = os.path.getsize(file_path)
                        savings = original_size - new_size
                        
                        if savings > 0:
                            optimized_count += 1
                            total_savings += savings
        
        return {
            'optimized_images': optimized_count,
            'total_savings_bytes': total_savings,
            'total_savings_mb': total_savings / (1024 * 1024)
        }
    
    def _optimize_image_file(self, file_path: str) -> bool:
        """Optimize individual image file."""
        try:
            # This would use libraries like Pillow, tinify, or imagemin
            # For now, just a placeholder
            logger.info(f"Optimizing image: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Image optimization failed for {file_path}: {e}")
            return False
    
    def minify_css_js(self, static_dir: str = None) -> Dict[str, int]:
        """Minify CSS and JavaScript files."""
        if not self.optimization_enabled:
            return {'skipped': True}
        
        static_dir = static_dir or settings.STATIC_ROOT
        minified_count = 0
        total_savings = 0
        
        for root, dirs, files in os.walk(static_dir):
            for file in files:
                if file.endswith(('.css', '.js')) and not file.endswith('.min.css') and not file.endswith('.min.js'):
                    file_path = os.path.join(root, file)
                    original_size = os.path.getsize(file_path)
                    
                    # Minify file
                    if self._minify_file(file_path):
                        new_size = os.path.getsize(file_path)
                        savings = original_size - new_size
                        
                        if savings > 0:
                            minified_count += 1
                            total_savings += savings
        
        return {
            'minified_files': minified_count,
            'total_savings_bytes': total_savings,
            'total_savings_mb': total_savings / (1024 * 1024)
        }
    
    def _minify_file(self, file_path: str) -> bool:
        """Minify individual CSS/JS file."""
        try:
            # This would use libraries like cssmin, jsmin, or similar
            # For now, just remove extra whitespace and comments
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Simple minification (remove extra whitespace)
            import re
            minified = re.sub(r'\s+', ' ', content)
            minified = re.sub(r'/\*.*?\*/', '', minified, flags=re.DOTALL)
            
            with open(file_path, 'w') as f:
                f.write(minified)
            
            logger.info(f"Minified file: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Minification failed for {file_path}: {e}")
            return False
    
    def generate_asset_manifest(self) -> Dict[str, str]:
        """Generate manifest of optimized assets with hashes."""
        manifest = {}
        static_root = Path(settings.STATIC_ROOT)
        
        if not static_root.exists():
            return manifest
        
        for file_path in static_root.rglob('*'):
            if file_path.is_file():
                # Calculate file hash
                with open(file_path, 'rb') as f:
                    file_hash = hashlib.md5(f.read()).hexdigest()[:8]
                
                # Generate manifest entry
                relative_path = str(file_path.relative_to(static_root)).replace('\\', '/')
                manifest[relative_path] = f"{relative_path}?v={file_hash}"
        
        # Save manifest file
        manifest_path = static_root / 'manifest.json'
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        return manifest


class ResourceHintsGenerator:
    """Generate resource hints for improved loading performance."""
    
    @staticmethod
    def generate_preload_hints(request) -> str:
        """Generate preload hints for critical resources."""
        hints = []
        
        # Preload critical CSS
        css_files = [
            '/static/css/main.css',
            '/static/css/dashboard.css'
        ]
        
        for css_file in css_files:
            hints.append(f'<link rel="preload" href="{css_file}" as="style">')
        
        # Preload critical fonts
        font_files = [
            '/static/fonts/roboto-regular.woff2'
        ]
        
        for font_file in font_files:
            hints.append(f'<link rel="preload" href="{font_file}" as="font" type="font/woff2" crossorigin>')
        
        return mark_safe('\n'.join(hints))
    
    @staticmethod
    def generate_dns_prefetch() -> str:
        """Generate DNS prefetch hints for external domains."""
        domains = [
            'fonts.googleapis.com',
            'fonts.gstatic.com',
            'cdn.jsdelivr.net'
        ]
        
        hints = [f'<link rel="dns-prefetch" href="//{domain}">' for domain in domains]
        return mark_safe('\n'.join(hints))
    
    @staticmethod
    def generate_preconnect_hints() -> str:
        """Generate preconnect hints for critical third-party origins."""
        origins = [
            'https://fonts.googleapis.com',
            'https://api.yourschool.com'
        ]
        
        hints = [f'<link rel="preconnect" href="{origin}">' for origin in origins]
        return mark_safe('\n'.join(hints))


# Global instances
cdn_manager = CDNManager()
asset_optimizer = AssetOptimizer()