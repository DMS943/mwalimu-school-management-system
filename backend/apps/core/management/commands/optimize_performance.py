"""
Performance optimization management command for Mwalimu School Management System.
Handles cache warming, database optimization, and asset optimization.
"""

import json
import logging
from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from django.conf import settings
from apps.core.caching import cache_manager
from apps.core.performance import (
    QueryOptimizer, PerformanceMonitor, CacheWarmupManager
)
from apps.core.cdn_optimization import cdn_manager, asset_optimizer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Comprehensive performance optimization operations'
    
    def add_arguments(self, parser):
        subparsers = parser.add_subparsers(dest='operation', help='Performance operations')
        
        # Cache operations
        cache_parser = subparsers.add_parser('cache', help='Cache management')
        cache_parser.add_argument('--warm', action='store_true', help='Warm up caches')
        cache_parser.add_argument('--clear', action='store_true', help='Clear all caches')
        cache_parser.add_argument('--stats', action='store_true', help='Show cache statistics')
        cache_parser.add_argument('--pattern', help='Clear cache by pattern')
        
        # Database optimization
        db_parser = subparsers.add_parser('database', help='Database optimization')
        db_parser.add_argument('--analyze', action='store_true', help='Analyze query performance')
        db_parser.add_argument('--optimize', action='store_true', help='Run database optimizations')
        db_parser.add_argument('--vacuum', action='store_true', help='Vacuum database')
        
        # Asset optimization
        asset_parser = subparsers.add_parser('assets', help='Asset optimization')
        asset_parser.add_argument('--minify', action='store_true', help='Minify CSS/JS files')
        asset_parser.add_argument('--optimize-images', action='store_true', help='Optimize images')
        asset_parser.add_argument('--sync-cdn', action='store_true', help='Sync assets to CDN')
        asset_parser.add_argument('--generate-manifest', action='store_true', help='Generate asset manifest')
        
        # Performance monitoring
        monitor_parser = subparsers.add_parser('monitor', help='Performance monitoring')
        monitor_parser.add_argument('--report', action='store_true', help='Generate performance report')
        monitor_parser.add_argument('--hours', type=int, default=24, help='Report period in hours')
        
        # Comprehensive optimization
        optimize_parser = subparsers.add_parser('optimize-all', help='Run all optimizations')
        optimize_parser.add_argument('--exclude', nargs='+', 
                                    choices=['cache', 'database', 'assets', 'cdn'],
                                    help='Exclude specific optimization types')
    
    def handle(self, *args, **options):
        operation = options.get('operation')
        
        if operation == 'cache':
            self.handle_cache_operations(options)
        elif operation == 'database':
            self.handle_database_operations(options)
        elif operation == 'assets':
            self.handle_asset_operations(options)
        elif operation == 'monitor':
            self.handle_monitoring_operations(options)
        elif operation == 'optimize-all':
            self.handle_comprehensive_optimization(options)
        else:
            self.print_help('manage.py', 'optimize_performance')
    
    def handle_cache_operations(self, options):
        """Handle cache-related operations."""
        if options.get('warm'):
            self.stdout.write('🔥 Warming up caches...')
            self.warm_caches()
            
        elif options.get('clear'):
            if options.get('pattern'):
                pattern = options['pattern']
                cleared = cache_manager.clear_pattern(pattern)
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Cleared {cleared} cache keys matching pattern: {pattern}')
                )
            else:
                cache.clear()
                self.stdout.write(self.style.SUCCESS('✓ All caches cleared'))
                
        elif options.get('stats'):
            self.show_cache_stats()
        else:
            self.stdout.write(self.style.WARNING('Please specify a cache operation'))
    
    def handle_database_operations(self, options):
        """Handle database optimization operations."""
        if options.get('analyze'):
            self.stdout.write('📊 Analyzing database performance...')
            self.analyze_database_performance()
            
        elif options.get('optimize'):
            self.stdout.write('⚡ Running database optimizations...')
            self.optimize_database()
            
        elif options.get('vacuum'):
            self.stdout.write('🧹 Vacuuming database...')
            self.vacuum_database()
        else:
            self.stdout.write(self.style.WARNING('Please specify a database operation'))
    
    def handle_asset_operations(self, options):
        """Handle asset optimization operations."""
        if options.get('minify'):
            self.stdout.write('📦 Minifying assets...')
            self.minify_assets()
            
        elif options.get('optimize_images'):
            self.stdout.write('🖼️ Optimizing images...')
            self.optimize_images()
            
        elif options.get('sync_cdn'):
            self.stdout.write('☁️ Syncing assets to CDN...')
            self.sync_cdn()
            
        elif options.get('generate_manifest'):
            self.stdout.write('📄 Generating asset manifest...')
            self.generate_asset_manifest()
        else:
            self.stdout.write(self.style.WARNING('Please specify an asset operation'))
    
    def handle_monitoring_operations(self, options):
        """Handle performance monitoring operations."""
        if options.get('report'):
            hours = options.get('hours', 24)
            self.stdout.write(f'📈 Generating performance report for last {hours} hours...')
            self.generate_performance_report(hours)
        else:
            self.stdout.write(self.style.WARNING('Please specify a monitoring operation'))
    
    def handle_comprehensive_optimization(self, options):
        """Handle comprehensive optimization."""
        exclude = options.get('exclude', [])
        
        self.stdout.write('🚀 Running comprehensive performance optimization...')
        
        if 'cache' not in exclude:
            self.stdout.write('  → Warming caches...')
            self.warm_caches()
        
        if 'database' not in exclude:
            self.stdout.write('  → Optimizing database...')
            self.optimize_database()
        
        if 'assets' not in exclude:
            self.stdout.write('  → Optimizing assets...')
            self.minify_assets()
            self.optimize_images()
        
        if 'cdn' not in exclude:
            self.stdout.write('  → Syncing to CDN...')
            self.sync_cdn()
        
        self.stdout.write(self.style.SUCCESS('✅ Comprehensive optimization completed'))
    
    def warm_caches(self):
        """Warm up application caches."""
        try:
            # Warm student caches
            CacheWarmupManager.warm_student_caches()
            
            # Warm academic caches
            CacheWarmupManager.warm_academic_caches()
            
            # Warm school caches
            CacheWarmupManager.warm_school_caches()
            
            self.stdout.write(self.style.SUCCESS('✓ Caches warmed successfully'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Cache warming failed: {e}')
            )
    
    def show_cache_stats(self):
        """Display cache statistics."""
        stats = cache_manager.cache_stats
        
        self.stdout.write('📊 Cache Statistics:')
        self.stdout.write(f'  Hits: {stats["hits"]}')
        self.stdout.write(f'  Misses: {stats["misses"]}')
        self.stdout.write(f'  Sets: {stats["sets"]}')
        self.stdout.write(f'  Deletes: {stats["deletes"]}')
        
        if stats['hits'] + stats['misses'] > 0:
            hit_rate = stats['hits'] / (stats['hits'] + stats['misses']) * 100
            self.stdout.write(f'  Hit Rate: {hit_rate:.2f}%')
    
    def analyze_database_performance(self):
        """Analyze database query performance."""
        try:
            from django.db import connection
            
            # Get query statistics
            with connection.cursor() as cursor:
                # PostgreSQL-specific query performance analysis
                cursor.execute("""
                    SELECT query, calls, total_time, rows, 
                           100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
                    FROM pg_stat_statements 
                    ORDER BY total_time DESC 
                    LIMIT 10;
                """)
                
                slow_queries = cursor.fetchall()
                
                if slow_queries:
                    self.stdout.write('🐌 Top 10 Slowest Queries:')
                    for i, query_data in enumerate(slow_queries, 1):
                        query, calls, total_time, rows, hit_percent = query_data
                        self.stdout.write(f'  {i}. Total Time: {total_time:.2f}ms, Calls: {calls}')
                        self.stdout.write(f'     Cache Hit Rate: {hit_percent or 0:.2f}%')
                        self.stdout.write(f'     Query: {query[:100]}...')
                else:
                    self.stdout.write('ℹ️ No query statistics available (enable pg_stat_statements)')
                    
        except Exception as e:
            self.stdout.write(f'⚠️ Database analysis failed: {e}')
    
    def optimize_database(self):
        """Run database optimizations."""
        try:
            from django.core.management import call_command
            
            # Run database optimization command
            call_command('optimize_database', 'optimize', '--all')
            
            self.stdout.write(self.style.SUCCESS('✓ Database optimization completed'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Database optimization failed: {e}')
            )
    
    def vacuum_database(self):
        """Vacuum database for better performance."""
        try:
            from django.db import connection
            
            with connection.cursor() as cursor:
                cursor.execute('VACUUM ANALYZE;')
            
            self.stdout.write(self.style.SUCCESS('✓ Database vacuum completed'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Database vacuum failed: {e}')
            )
    
    def minify_assets(self):
        """Minify CSS and JavaScript assets."""
        try:
            result = asset_optimizer.minify_css_js()
            
            if result.get('skipped'):
                self.stdout.write('⏭️ Asset minification skipped (disabled)')
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Minified {result["minified_files"]} files, '
                        f'saved {result["total_savings_mb"]:.2f}MB'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Asset minification failed: {e}')
            )
    
    def optimize_images(self):
        """Optimize images for web delivery."""
        try:
            result = asset_optimizer.optimize_images()
            
            if result.get('skipped'):
                self.stdout.write('⏭️ Image optimization skipped (disabled)')
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Optimized {result["optimized_images"]} images, '
                        f'saved {result["total_savings_mb"]:.2f}MB'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Image optimization failed: {e}')
            )
    
    def sync_cdn(self):
        """Sync assets to CDN."""
        try:
            result = cdn_manager.sync_static_files()
            
            if 'error' in result:
                self.stdout.write(
                    self.style.WARNING(f'⚠️ CDN sync skipped: {result["error"]}')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Synced to CDN: {result["uploaded"]} files uploaded, '
                        f'{result["failed"]} failed'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ CDN sync failed: {e}')
            )
    
    def generate_asset_manifest(self):
        """Generate asset manifest file."""
        try:
            manifest = asset_optimizer.generate_asset_manifest()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Generated asset manifest with {len(manifest)} entries'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Asset manifest generation failed: {e}')
            )
    
    def generate_performance_report(self, hours: int):
        """Generate performance monitoring report."""
        try:
            from apps.core.performance import performance_monitor_instance
            
            report = performance_monitor_instance.get_performance_report(hours)
            
            if 'message' in report:
                self.stdout.write(f'ℹ️ {report["message"]}')
            else:
                self.stdout.write('📊 Performance Report:')
                self.stdout.write(f'  Period: Last {hours} hours')
                self.stdout.write(f'  Total Requests: {report["total_requests"]}')
                self.stdout.write(f'  Average Response Time: {report["avg_response_time"]:.3f}s')
                self.stdout.write(f'  Slowest Response: {report["max_response_time"]:.3f}s')
                self.stdout.write(f'  Slow Requests (>2s): {report["slow_requests"]}')
                
                # Show slowest endpoints
                if report.get('top_slow_endpoints'):
                    self.stdout.write('\n🐌 Slowest Endpoints:')
                    for endpoint in report['top_slow_endpoints'][:5]:
                        self.stdout.write(
                            f'  {endpoint["path"]}: {endpoint["avg_duration"]:.3f}s '
                            f'({endpoint["count"]} requests)'
                        )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Performance report generation failed: {e}')
            )