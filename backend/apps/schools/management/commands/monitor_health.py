"""
Django management command for system health monitoring.
Usage: python manage.py monitor_health
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.db import connection
from django.utils import timezone
from django.conf import settings
import time
import json
from datetime import timedelta

from apps.core.monitoring import SystemMetrics, DatabaseMetrics, ApplicationMetrics


class Command(BaseCommand):
    help = 'Monitor system health and performance metrics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            choices=['console', 'json', 'prometheus'],
            default='console',
            help='Output format for metrics',
        )
        parser.add_argument(
            '--check',
            type=str,
            choices=['all', 'system', 'database', 'cache', 'application'],
            default='all',
            help='Specific component to check',
        )
        parser.add_argument(
            '--alert-thresholds',
            action='store_true',
            help='Check against alert thresholds and exit with error if exceeded',
        )

    def handle(self, *args, **options):
        output_format = options['output']
        check_type = options['check']
        check_thresholds = options['alert_thresholds']
        
        start_time = time.time()
        
        # Collect metrics
        metrics = {
            'timestamp': timezone.now().isoformat(),
            'collection_time_ms': 0,
            'status': 'healthy',
            'alerts': []
        }
        
        if check_type in ['all', 'system']:
            metrics['system'] = self.collect_system_metrics()
            
        if check_type in ['all', 'database']:
            metrics['database'] = self.collect_database_metrics()
            
        if check_type in ['all', 'cache']:
            metrics['cache'] = self.collect_cache_metrics()
            
        if check_type in ['all', 'application']:
            metrics['application'] = self.collect_application_metrics()
        
        metrics['collection_time_ms'] = round((time.time() - start_time) * 1000, 2)
        
        # Check thresholds if requested
        if check_thresholds:
            self.check_alert_thresholds(metrics)
        
        # Output metrics
        if output_format == 'json':
            self.output_json(metrics)
        elif output_format == 'prometheus':
            self.output_prometheus(metrics)
        else:
            self.output_console(metrics)
        
        # Exit with error if unhealthy and checking thresholds
        if check_thresholds and (metrics['status'] == 'unhealthy' or metrics['alerts']):
            exit(1)

    def collect_system_metrics(self):
        """Collect system resource metrics."""
        try:
            memory = SystemMetrics.get_memory_usage()
            cpu = SystemMetrics.get_cpu_usage()
            disk = SystemMetrics.get_disk_usage()
            network = SystemMetrics.get_network_stats()
            
            return {
                'status': 'healthy',
                'memory': memory,
                'cpu': cpu,
                'disk': disk,
                'network': network
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }

    def collect_database_metrics(self):
        """Collect database metrics."""
        try:
            connection_info = DatabaseMetrics.get_connection_info()
            query_stats = DatabaseMetrics.get_query_stats()
            
            # Test query performance
            start_time = time.time()
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM django_session")
                cursor.fetchone()
            query_time_ms = round((time.time() - start_time) * 1000, 2)
            
            return {
                'status': connection_info.get('status', 'unknown'),
                'connection_info': connection_info,
                'query_stats': query_stats,
                'test_query_time_ms': query_time_ms
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }

    def collect_cache_metrics(self):
        """Collect cache metrics."""
        try:
            # Test cache performance
            start_time = time.time()
            cache.set('health_monitor_test', 'test_value', 10)
            result = cache.get('health_monitor_test')
            cache.delete('health_monitor_test')
            cache_time_ms = round((time.time() - start_time) * 1000, 2)
            
            status = 'healthy' if result == 'test_value' else 'unhealthy'
            
            return {
                'status': status,
                'test_result': result,
                'response_time_ms': cache_time_ms
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }

    def collect_application_metrics(self):
        """Collect application-specific metrics."""
        try:
            user_stats = ApplicationMetrics.get_user_stats()
            student_stats = ApplicationMetrics.get_student_stats()
            
            return {
                'status': 'healthy',
                'users': user_stats,
                'students': student_stats,
                'environment': getattr(settings, 'ENVIRONMENT', 'unknown'),
                'debug_mode': settings.DEBUG
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e)
            }

    def check_alert_thresholds(self, metrics):
        """Check metrics against alert thresholds."""
        alerts = []
        
        # System resource thresholds
        if 'system' in metrics and metrics['system'].get('status') == 'healthy':
            system = metrics['system']
            
            # Memory threshold
            if system['memory']['percent'] > 90:
                alerts.append({
                    'level': 'critical',
                    'component': 'system',
                    'metric': 'memory_usage',
                    'value': system['memory']['percent'],
                    'threshold': 90,
                    'message': f"Memory usage at {system['memory']['percent']}%"
                })
            elif system['memory']['percent'] > 80:
                alerts.append({
                    'level': 'warning',
                    'component': 'system',
                    'metric': 'memory_usage',
                    'value': system['memory']['percent'],
                    'threshold': 80,
                    'message': f"Memory usage at {system['memory']['percent']}%"
                })
            
            # Disk threshold
            if system['disk']['percent'] > 90:
                alerts.append({
                    'level': 'critical',
                    'component': 'system',
                    'metric': 'disk_usage',
                    'value': system['disk']['percent'],
                    'threshold': 90,
                    'message': f"Disk usage at {system['disk']['percent']}%"
                })
            elif system['disk']['percent'] > 80:
                alerts.append({
                    'level': 'warning',
                    'component': 'system',
                    'metric': 'disk_usage',
                    'value': system['disk']['percent'],
                    'threshold': 80,
                    'message': f"Disk usage at {system['disk']['percent']}%"
                })
            
            # CPU threshold
            if system['cpu']['percent'] > 90:
                alerts.append({
                    'level': 'critical',
                    'component': 'system',
                    'metric': 'cpu_usage',
                    'value': system['cpu']['percent'],
                    'threshold': 90,
                    'message': f"CPU usage at {system['cpu']['percent']}%"
                })
        
        # Database thresholds
        if 'database' in metrics:
            db = metrics['database']
            
            if db.get('status') != 'healthy':
                alerts.append({
                    'level': 'critical',
                    'component': 'database',
                    'metric': 'connection',
                    'message': 'Database connection unhealthy'
                })
            
            if db.get('test_query_time_ms', 0) > 1000:
                alerts.append({
                    'level': 'warning',
                    'component': 'database',
                    'metric': 'query_performance',
                    'value': db['test_query_time_ms'],
                    'threshold': 1000,
                    'message': f"Slow database query: {db['test_query_time_ms']}ms"
                })
        
        # Cache thresholds
        if 'cache' in metrics:
            cache_data = metrics['cache']
            
            if cache_data.get('status') != 'healthy':
                alerts.append({
                    'level': 'warning',
                    'component': 'cache',
                    'metric': 'connection',
                    'message': 'Cache connection unhealthy'
                })
            
            if cache_data.get('response_time_ms', 0) > 100:
                alerts.append({
                    'level': 'warning',
                    'component': 'cache',
                    'metric': 'performance',
                    'value': cache_data['response_time_ms'],
                    'threshold': 100,
                    'message': f"Slow cache response: {cache_data['response_time_ms']}ms"
                })
        
        metrics['alerts'] = alerts
        if alerts:
            critical_alerts = [a for a in alerts if a['level'] == 'critical']
            if critical_alerts:
                metrics['status'] = 'critical'
            else:
                metrics['status'] = 'warning'

    def output_console(self, metrics):
        """Output metrics in human-readable format."""
        self.stdout.write(f"🔍 System Health Report - {metrics['timestamp']}")
        self.stdout.write(f"Collection Time: {metrics['collection_time_ms']}ms")
        self.stdout.write(f"Overall Status: {metrics['status']}")
        self.stdout.write("")
        
        # System metrics
        if 'system' in metrics:
            system = metrics['system']
            if system.get('status') == 'healthy':
                self.stdout.write("💻 System Resources:")
                self.stdout.write(f"  Memory: {system['memory']['percent']}% used ({system['memory']['used'] // (1024**3):.1f}GB / {system['memory']['total'] // (1024**3):.1f}GB)")
                self.stdout.write(f"  CPU: {system['cpu']['percent']}%")
                self.stdout.write(f"  Disk: {system['disk']['percent']}% used ({system['disk']['used'] // (1024**3):.1f}GB / {system['disk']['total'] // (1024**3):.1f}GB)")
            else:
                self.stdout.write(f"❌ System: {system.get('error', 'Unknown error')}")
            self.stdout.write("")
        
        # Database metrics
        if 'database' in metrics:
            db = metrics['database']
            if db.get('status') == 'healthy':
                self.stdout.write("🗄️  Database:")
                self.stdout.write(f"  Status: Healthy")
                self.stdout.write(f"  Active Connections: {db['connection_info']['active_connections']}")
                self.stdout.write(f"  Test Query Time: {db['test_query_time_ms']}ms")
                if 'query_stats' in db:
                    self.stdout.write(f"  Database Size: {db['query_stats']['database_size']}")
            else:
                self.stdout.write(f"❌ Database: {db.get('error', 'Unknown error')}")
            self.stdout.write("")
        
        # Cache metrics
        if 'cache' in metrics:
            cache_data = metrics['cache']
            if cache_data.get('status') == 'healthy':
                self.stdout.write("🚀 Cache:")
                self.stdout.write(f"  Status: Healthy")
                self.stdout.write(f"  Response Time: {cache_data['response_time_ms']}ms")
            else:
                self.stdout.write(f"❌ Cache: {cache_data.get('error', 'Unknown error')}")
            self.stdout.write("")
        
        # Application metrics
        if 'application' in metrics:
            app = metrics['application']
            if app.get('status') == 'healthy':
                self.stdout.write("📱 Application:")
                self.stdout.write(f"  Environment: {app['environment']}")
                self.stdout.write(f"  Total Users: {app['users']['total_users']}")
                self.stdout.write(f"  Active Users: {app['users']['active_users']}")
                self.stdout.write(f"  Total Students: {app['students']['total_students']}")
            else:
                self.stdout.write(f"❌ Application: {app.get('error', 'Unknown error')}")
            self.stdout.write("")
        
        # Alerts
        if metrics['alerts']:
            self.stdout.write("⚠️  Alerts:")
            for alert in metrics['alerts']:
                level_emoji = '🚨' if alert['level'] == 'critical' else '⚠️'
                self.stdout.write(f"  {level_emoji} {alert['component']}: {alert['message']}")

    def output_json(self, metrics):
        """Output metrics in JSON format."""
        self.stdout.write(json.dumps(metrics, indent=2, default=str))

    def output_prometheus(self, metrics):
        """Output metrics in Prometheus format."""
        lines = []
        
        # System metrics
        if 'system' in metrics and metrics['system'].get('status') == 'healthy':
            system = metrics['system']
            lines.append(f"system_memory_usage_percent {system['memory']['percent']}")
            lines.append(f"system_cpu_usage_percent {system['cpu']['percent']}")
            lines.append(f"system_disk_usage_percent {system['disk']['percent']}")
            lines.append(f"system_memory_total_bytes {system['memory']['total']}")
            lines.append(f"system_memory_used_bytes {system['memory']['used']}")
        
        # Database metrics
        if 'database' in metrics and metrics['database'].get('status') == 'healthy':
            db = metrics['database']
            lines.append(f"database_active_connections {db['connection_info']['active_connections']}")
            lines.append(f"database_total_connections {db['connection_info']['total_connections']}")
            lines.append(f"database_query_time_ms {db['test_query_time_ms']}")
        
        # Cache metrics
        if 'cache' in metrics and metrics['cache'].get('status') == 'healthy':
            cache_data = metrics['cache']
            lines.append(f"cache_response_time_ms {cache_data['response_time_ms']}")
        
        # Application metrics
        if 'application' in metrics and metrics['application'].get('status') == 'healthy':
            app = metrics['application']
            lines.append(f"application_total_users {app['users']['total_users']}")
            lines.append(f"application_active_users {app['users']['active_users']}")
            lines.append(f"application_total_students {app['students']['total_students']}")
        
        # Collection time
        lines.append(f"health_check_collection_time_ms {metrics['collection_time_ms']}")
        
        for line in lines:
            self.stdout.write(line)