"""
Management command for database monitoring and performance analysis.
"""

import time
import json
from django.core.management.base import BaseCommand
from django.db import connection
from apps.core.database import DatabaseOptimizer, DatabaseQueryOptimizer
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Monitor database performance and generate reports'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--watch',
            action='store_true',
            help='Continuous monitoring mode'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=30,
            help='Monitoring interval in seconds (default: 30)'
        )
        parser.add_argument(
            '--output',
            choices=['console', 'json', 'file'],
            default='console',
            help='Output format (default: console)'
        )
        parser.add_argument(
            '--file',
            type=str,
            help='Output file path (for file output)'
        )
        parser.add_argument(
            '--alert-threshold',
            type=int,
            default=80,
            help='Performance alert threshold percentage (default: 80)'
        )
    
    def handle(self, *args, **options):
        if options['watch']:
            self.continuous_monitoring(options)
        else:
            self.single_report(options)
    
    def single_report(self, options):
        """Generate a single performance report."""
        self.stdout.write(self.style.SUCCESS('Generating database performance report...'))
        
        optimizer = DatabaseOptimizer()
        query_optimizer = DatabaseQueryOptimizer()
        
        # Collect performance data
        report_data = {
            'timestamp': time.time(),
            'connection_info': optimizer.get_connection_info(),
            'database_stats': optimizer.get_database_stats(),
            'table_stats': optimizer.get_table_stats()[:10],  # Top 10 tables
            'index_recommendations': optimizer.analyze_missing_indexes()[:5],  # Top 5 recommendations
            'slow_queries': query_optimizer.log_slow_queries(),
        }
        
        # Generate health score
        health_score = self.calculate_health_score(report_data)
        report_data['health_score'] = health_score
        
        # Output report
        if options['output'] == 'json':
            self.output_json(report_data)
        elif options['output'] == 'file':
            self.output_file(report_data, options['file'])
        else:
            self.output_console(report_data, options['alert_threshold'])
    
    def continuous_monitoring(self, options):
        """Continuous monitoring mode."""
        self.stdout.write(
            self.style.SUCCESS(
                f'Starting continuous database monitoring (interval: {options["interval"]}s)...'
            )
        )
        self.stdout.write('Press Ctrl+C to stop monitoring')
        
        try:
            while True:
                self.single_report(options)
                
                if options['output'] == 'console':
                    self.stdout.write('-' * 80)
                
                time.sleep(options['interval'])
                
        except KeyboardInterrupt:
            self.stdout.write('\nMonitoring stopped.')
    
    def calculate_health_score(self, report_data):
        """Calculate overall database health score (0-100)."""
        score = 100
        stats = report_data.get('database_stats', {})
        
        # Cache hit ratio impact
        cache_hit = stats.get('cache_hit_ratio', 100)
        if cache_hit < 95:
            score -= (95 - cache_hit) * 2
        
        # Slow queries impact
        slow_queries = stats.get('slow_queries', 0)
        if slow_queries > 0:
            score -= min(slow_queries * 5, 30)
        
        # Connection utilization impact
        total_conn = stats.get('total_connections', 0)
        if total_conn > 150:  # Assuming max 200 connections
            score -= (total_conn - 150) / 2
        
        # Index recommendations impact
        index_recs = len(report_data.get('index_recommendations', []))
        if index_recs > 0:
            score -= min(index_recs * 3, 20)
        
        return max(0, min(100, int(score)))
    
    def output_console(self, report_data, alert_threshold):
        """Output report to console."""
        stats = report_data.get('database_stats', {})
        health_score = report_data.get('health_score', 0)
        
        # Header
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(f'DATABASE PERFORMANCE REPORT - Health Score: {health_score}%')
        self.stdout.write('=' * 60)
        
        # Health status
        if health_score >= alert_threshold:
            status_style = self.style.SUCCESS
            status_text = 'HEALTHY'
        elif health_score >= 60:
            status_style = self.style.WARNING
            status_text = 'WARNING'
        else:
            status_style = self.style.ERROR
            status_text = 'CRITICAL'
        
        self.stdout.write(f'Status: {status_style(status_text)}')
        
        # Database statistics
        self.stdout.write('\nDatabase Statistics:')
        self.stdout.write(f'  Database Size: {stats.get("database_size", "Unknown")}')
        self.stdout.write(f'  Total Connections: {stats.get("total_connections", 0)}')
        self.stdout.write(f'  Active Connections: {stats.get("active_connections", 0)}')
        self.stdout.write(f'  Cache Hit Ratio: {stats.get("cache_hit_ratio", 0):.2f}%')
        self.stdout.write(f'  Slow Queries: {stats.get("slow_queries", 0)}')
        
        # Index recommendations
        recommendations = report_data.get('index_recommendations', [])
        if recommendations:
            self.stdout.write(f'\nIndex Recommendations ({len(recommendations)}):')
            for rec in recommendations:
                self.stdout.write(
                    f'  • {rec["table"]}: {rec["sequential_scans"]} seq scans, '
                    f'{rec["sequential_reads"]} reads'
                )
        
        # Slow queries
        slow_queries = report_data.get('slow_queries', [])
        if slow_queries:
            self.stdout.write(f'\nSlow Queries ({len(slow_queries)}):')
            for query in slow_queries[:3]:  # Show top 3
                self.stdout.write(f'  • {query["time"]}s: {query["sql"][:100]}...')
        
        # Alerts
        if health_score < alert_threshold:
            self.stdout.write(
                self.style.ERROR(
                    f'\n⚠️  ALERT: Database health score ({health_score}%) is below threshold ({alert_threshold}%)'
                )
            )
        
        self.stdout.write('')
    
    def output_json(self, report_data):
        """Output report as JSON."""
        self.stdout.write(json.dumps(report_data, indent=2, default=str))
    
    def output_file(self, report_data, filename):
        """Output report to file."""
        if not filename:
            filename = f'db_report_{int(time.time())}.json'
        
        try:
            with open(filename, 'w') as f:
                json.dump(report_data, f, indent=2, default=str)
            
            self.stdout.write(
                self.style.SUCCESS(f'Report saved to: {filename}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to save report: {e}')
            )