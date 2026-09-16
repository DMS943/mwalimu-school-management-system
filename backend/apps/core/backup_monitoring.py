"""
Backup Monitoring and Alerting System for Mwalimu School Management System.
Monitors backup health, validates integrity, and sends alerts.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
import requests
import subprocess
from pathlib import Path

logger = logging.getLogger('app.backup_monitoring')


@dataclass
class BackupHealthMetrics:
    """Backup health monitoring metrics."""
    backup_id: str
    timestamp: datetime
    status: str  # success, failed, warning
    size_bytes: int
    duration_seconds: int
    integrity_check: bool
    compliance_status: str
    error_message: Optional[str] = None


@dataclass
class AlertConfiguration:
    """Alert configuration settings."""
    email_recipients: List[str]
    slack_webhook: Optional[str]
    sms_recipients: List[str]
    alert_thresholds: Dict[str, int]
    escalation_rules: Dict[str, List[str]]


class BackupMonitor:
    """Comprehensive backup monitoring system."""
    
    def __init__(self):
        self.backup_dir = Path(settings.BACKUP_DIR if hasattr(settings, 'BACKUP_DIR') else '/opt/backups')
        self.metrics_file = self.backup_dir / 'monitoring' / 'metrics.json'
        self.alert_config = self._load_alert_config()
        self.health_thresholds = {
            'max_backup_age_hours': 25,  # Alert if backup older than 25 hours
            'min_backup_size_mb': 10,    # Alert if backup smaller than 10MB
            'max_backup_duration_minutes': 60,  # Alert if backup takes over 1 hour
            'integrity_check_failures': 3  # Alert after 3 consecutive failures
        }
        
    def _load_alert_config(self) -> AlertConfiguration:
        """Load alert configuration."""
        config_path = Path(settings.BASE_DIR) / 'config' / 'alert_config.json'
        
        if config_path.exists():
            with open(config_path, 'r') as f:
                config_data = json.load(f)
                return AlertConfiguration(**config_data)
        
        # Default configuration
        return AlertConfiguration(
            email_recipients=getattr(settings, 'BACKUP_ALERT_EMAILS', []),
            slack_webhook=getattr(settings, 'SLACK_WEBHOOK_URL', None),
            sms_recipients=getattr(settings, 'BACKUP_ALERT_SMS', []),
            alert_thresholds={
                'backup_failure': 1,
                'integrity_failure': 2,
                'size_variance': 50,  # Percent
                'age_threshold': 25   # Hours
            },
            escalation_rules={
                'critical': ['email', 'slack', 'sms'],
                'high': ['email', 'slack'],
                'medium': ['email'],
                'low': ['email']
            }
        )
    
    def monitor_backup_health(self) -> Dict[str, any]:
        """Monitor overall backup system health."""
        logger.info("Running backup health monitoring")
        
        health_report = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'checks': {},
            'alerts': [],
            'recommendations': []
        }
        
        # Check recent backup status
        recent_backup_status = self._check_recent_backups()
        health_report['checks']['recent_backups'] = recent_backup_status
        
        # Check backup integrity
        integrity_status = self._check_backup_integrity()
        health_report['checks']['integrity'] = integrity_status
        
        # Check storage utilization
        storage_status = self._check_storage_utilization()
        health_report['checks']['storage'] = storage_status
        
        # Check compliance status
        compliance_status = self._check_compliance_status()
        health_report['checks']['compliance'] = compliance_status
        
        # Determine overall status
        failed_checks = [check for check in health_report['checks'].values() 
                        if check.get('status') in ['failed', 'critical']]
        
        if failed_checks:
            health_report['overall_status'] = 'critical' if len(failed_checks) > 2 else 'degraded'
        
        # Generate alerts if needed
        if health_report['overall_status'] != 'healthy':
            self._generate_health_alerts(health_report)
        
        # Store metrics
        self._store_health_metrics(health_report)
        
        return health_report
    
    def _check_recent_backups(self) -> Dict:
        """Check status of recent backups."""
        check_result = {
            'status': 'healthy',
            'details': {},
            'issues': []
        }
        
        try:
            # Find recent backup files
            backup_files = list(self.backup_dir.glob('**/*.sql.gz'))
            backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            
            if not backup_files:
                check_result['status'] = 'critical'
                check_result['issues'].append('No backup files found')
                return check_result
            
            # Check most recent backup
            latest_backup = backup_files[0]
            backup_age = datetime.now() - datetime.fromtimestamp(latest_backup.stat().st_mtime)
            
            check_result['details']['latest_backup'] = {
                'file': latest_backup.name,
                'age_hours': backup_age.total_seconds() / 3600,
                'size_mb': latest_backup.stat().st_size / (1024 * 1024)
            }
            
            # Check backup age
            if backup_age.total_seconds() > self.health_thresholds['max_backup_age_hours'] * 3600:
                check_result['status'] = 'degraded'
                check_result['issues'].append(f'Latest backup is {backup_age.total_seconds() / 3600:.1f} hours old')
            
            # Check backup size
            backup_size_mb = latest_backup.stat().st_size / (1024 * 1024)
            if backup_size_mb < self.health_thresholds['min_backup_size_mb']:
                check_result['status'] = 'degraded'
                check_result['issues'].append(f'Latest backup is unusually small: {backup_size_mb:.1f}MB')
            
            # Check backup frequency (should have backups from last 3 days)
            recent_backups = [f for f in backup_files 
                            if datetime.now() - datetime.fromtimestamp(f.stat().st_mtime) < timedelta(days=3)]
            
            check_result['details']['backup_count_3days'] = len(recent_backups)
            
            if len(recent_backups) < 3:  # Expecting at least daily backups
                check_result['status'] = 'degraded'
                check_result['issues'].append(f'Only {len(recent_backups)} backups found in last 3 days')
                
        except Exception as e:
            check_result['status'] = 'failed'
            check_result['issues'].append(f'Backup check error: {e}')
            
        return check_result
    
    def _check_backup_integrity(self) -> Dict:
        """Check backup file integrity."""
        check_result = {
            'status': 'healthy',
            'details': {},
            'issues': []
        }
        
        try:
            # Run backup validation command
            result = subprocess.run([
                'python', 'manage.py', 'backup_database', 'verify',
                '--backup-dir', str(self.backup_dir)
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                check_result['details']['verification_output'] = result.stdout
            else:
                check_result['status'] = 'failed'
                check_result['issues'].append(f'Integrity check failed: {result.stderr}')
                
        except Exception as e:
            check_result['status'] = 'failed'
            check_result['issues'].append(f'Integrity check error: {e}')
            
        return check_result
    
    def _check_storage_utilization(self) -> Dict:
        """Check backup storage utilization."""
        check_result = {
            'status': 'healthy',
            'details': {},
            'issues': []
        }
        
        try:
            # Check disk usage
            result = subprocess.run(['df', '-h', str(self.backup_dir)], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if len(lines) > 1:
                    fields = lines[1].split()
                    if len(fields) >= 5:
                        usage_percent = int(fields[4].rstrip('%'))
                        check_result['details']['storage_usage_percent'] = usage_percent
                        
                        if usage_percent > 90:
                            check_result['status'] = 'critical'
                            check_result['issues'].append(f'Storage usage critical: {usage_percent}%')
                        elif usage_percent > 80:
                            check_result['status'] = 'degraded'
                            check_result['issues'].append(f'Storage usage high: {usage_percent}%')
                            
        except Exception as e:
            check_result['status'] = 'failed'
            check_result['issues'].append(f'Storage check error: {e}')
            
        return check_result
    
    def _generate_health_alerts(self, health_report: Dict):
        """Generate alerts based on health report."""
        severity = health_report['overall_status']
        
        alert_message = f"Backup System Health Alert - Status: {severity.upper()}\n\n"
        
        for check_name, check_result in health_report['checks'].items():
            if check_result.get('status') != 'healthy':
                alert_message += f"{check_name.title()}: {check_result['status'].upper()}\n"
                for issue in check_result.get('issues', []):
                    alert_message += f"  - {issue}\n"
                alert_message += "\n"
        
        # Send alerts based on escalation rules
        alert_methods = self.alert_config.escalation_rules.get(severity, ['email'])
        
        if 'email' in alert_methods:
            self._send_email_alert(alert_message, severity)
        
        if 'slack' in alert_methods and self.alert_config.slack_webhook:
            self._send_slack_alert(alert_message, severity)
    
    def _send_email_alert(self, message: str, severity: str):
        """Send email alert."""
        try:
            subject = f"[{severity.upper()}] Backup System Alert - Mwalimu School"
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=self.alert_config.email_recipients,
                fail_silently=False
            )
            
            logger.info(f"Email alert sent to {len(self.alert_config.email_recipients)} recipients")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
    
    def _send_slack_alert(self, message: str, severity: str):
        """Send Slack alert."""
        try:
            color_map = {
                'critical': '#FF0000',
                'degraded': '#FF9900',
                'healthy': '#00FF00'
            }
            
            payload = {
                'text': f'Backup System Alert - {severity.upper()}',
                'attachments': [{
                    'color': color_map.get(severity, '#FF9900'),
                    'text': message,
                    'footer': 'Mwalimu School Management System',
                    'ts': int(datetime.now().timestamp())
                }]
            }
            
            response = requests.post(
                self.alert_config.slack_webhook,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info("Slack alert sent successfully")
            else:
                logger.error(f"Slack alert failed: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
    
    def generate_backup_report(self, days: int = 30) -> Dict:
        """Generate comprehensive backup report."""
        logger.info(f"Generating backup report for last {days} days")
        
        report = {
            'report_period': f'Last {days} days',
            'generated_at': datetime.now().isoformat(),
            'summary': {},
            'backup_statistics': {},
            'compliance_status': {},
            'recommendations': []
        }
        
        # Calculate summary statistics
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Count backups in period
        backup_files = list(self.backup_dir.glob('**/*.sql.gz'))
        period_backups = [
            f for f in backup_files 
            if start_date <= datetime.fromtimestamp(f.stat().st_mtime) <= end_date
        ]
        
        report['summary'] = {
            'total_backups': len(period_backups),
            'successful_backups': len(period_backups),  # Simplified for now
            'failed_backups': 0,
            'total_size_gb': sum(f.stat().st_size for f in period_backups) / (1024**3),
            'average_size_mb': (sum(f.stat().st_size for f in period_backups) / len(period_backups) / (1024**2)) if period_backups else 0
        }
        
        # Generate recommendations
        if len(period_backups) < days * 0.8:  # Less than 80% expected backups
            report['recommendations'].append('Consider increasing backup frequency')
        
        if report['summary']['total_size_gb'] > 100:  # More than 100GB
            report['recommendations'].append('Consider implementing backup compression or archival')
        
        return report