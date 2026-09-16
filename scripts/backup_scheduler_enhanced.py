#!/usr/bin/env python3
"""
Enhanced Backup Scheduler for Mwalimu School Management System.
Manages automated backups across multiple tiers with monitoring and alerting.
"""

import os
import sys
import json
import logging
import subprocess
import schedule
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/mwalimu_backup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class EnhancedBackupScheduler:
    """Enhanced backup scheduler with multi-tier support."""
    
    def __init__(self, config_file: str = '/etc/mwalimu/backup_config.json'):
        self.config = self._load_config(config_file)
        self.is_running = False
        
    def _load_config(self, config_file: str) -> Dict:
        """Load backup configuration."""
        default_config = {
            'backup_schedules': {
                'local': '0 */4 * * *',      # Every 4 hours
                'regional': '0 2 * * *',     # Daily at 2 AM
                'offsite': '0 3 * * *',      # Daily at 3 AM
                'archive': '0 4 * * 0'       # Weekly on Sunday at 4 AM
            },
            'retention_policies': {
                'local': 7,      # 7 days
                'regional': 30,  # 30 days
                'offsite': 90,   # 90 days
                'archive': 2555  # 7 years
            },
            'backup_types': {
                'database': True,
                'media': True,
                'configurations': True,
                'logs': False
            },
            'notifications': {
                'on_success': False,
                'on_failure': True,
                'email_recipients': [],
                'slack_webhook': None
            },
            'compression': {
                'enabled': True,
                'level': 6
            },
            'encryption': {
                'enabled': True,
                'key_path': '/etc/mwalimu/backup.key'
            },
            'monitoring': {
                'enabled': True,
                'health_checks': True,
                'metrics_collection': True
            }
        }
        
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    default_config.update(config)
            except Exception as e:
                logger.error(f"Failed to load config: {e}")
        
        return default_config
    
    def start(self):
        """Start the backup scheduler."""
        logger.info("Starting Enhanced Backup Scheduler")
        
        # Schedule backups for each tier
        for tier, cron_schedule in self.config['backup_schedules'].items():
            self._schedule_backup(tier, cron_schedule)
        
        # Schedule cleanup operations
        schedule.every().day.at("05:00").do(self._cleanup_old_backups)
        
        # Schedule health checks
        schedule.every().hour.do(self._run_health_checks)
        
        # Schedule monitoring reports
        schedule.every().day.at("06:00").do(self._generate_daily_report)
        
        self.is_running = True
        
        try:
            while self.is_running:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        finally:
            self.stop()
    
    def stop(self):
        """Stop the backup scheduler."""
        logger.info("Stopping Enhanced Backup Scheduler")
        self.is_running = False
    
    def _schedule_backup(self, tier: str, cron_schedule: str):
        """Schedule backup for specific tier."""
        # Convert cron to schedule format (simplified)
        # In production, use proper cron parsing library
        
        if tier == 'local' and '*/4' in cron_schedule:
            schedule.every(4).hours.do(self._run_backup, tier)
        elif tier == 'regional':
            schedule.every().day.at("02:00").do(self._run_backup, tier)
        elif tier == 'offsite':
            schedule.every().day.at("03:00").do(self._run_backup, tier)
        elif tier == 'archive':
            schedule.every().sunday.at("04:00").do(self._run_backup, tier)
        
        logger.info(f"Scheduled {tier} backup: {cron_schedule}")
    
    def _run_backup(self, tier: str):
        """Execute backup for specific tier."""
        logger.info(f"Starting {tier} backup")
        
        start_time = datetime.now()
        backup_success = False
        
        try:
            # Run disaster recovery backup command
            cmd = [
                'python', 'manage.py', 'disaster_recovery', 'backup',
                '--tier', tier, '--full'
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode == 0:
                backup_success = True
                logger.info(f"{tier} backup completed successfully")
            else:
                logger.error(f"{tier} backup failed: {result.stderr}")
            
        except subprocess.TimeoutExpired:
            logger.error(f"{tier} backup timed out")
        except Exception as e:
            logger.error(f"{tier} backup error: {e}")
        
        # Record backup metrics
        duration = (datetime.now() - start_time).total_seconds()
        self._record_backup_metrics(tier, backup_success, duration)
        
        # Send notifications
        if backup_success and self.config['notifications']['on_success']:
            self._send_notification(f"{tier} backup completed successfully", "success")
        elif not backup_success and self.config['notifications']['on_failure']:
            self._send_notification(f"{tier} backup failed", "error")
    
    def _cleanup_old_backups(self):
        """Clean up old backups according to retention policies."""
        logger.info("Starting backup cleanup")
        
        for tier, retention_days in self.config['retention_policies'].items():
            try:
                cmd = [
                    'python', 'manage.py', 'disaster_recovery', 'cleanup',
                    '--tier', tier, '--force'
                ]
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=1800  # 30 minutes
                )
                
                if result.returncode == 0:
                    logger.info(f"Cleanup completed for {tier} tier")
                else:
                    logger.error(f"Cleanup failed for {tier}: {result.stderr}")
                    
            except Exception as e:
                logger.error(f"Cleanup error for {tier}: {e}")
    
    def _run_health_checks(self):
        """Run backup system health checks."""
        if not self.config['monitoring']['health_checks']:
            return
            
        logger.info("Running backup health checks")
        
        try:
            cmd = ['python', 'manage.py', 'disaster_recovery', 'status', '--detailed']
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                logger.warning(f"Health check issues detected: {result.stderr}")
                self._send_notification("Backup health check failed", "warning")
            
        except Exception as e:
            logger.error(f"Health check error: {e}")
    
    def _generate_daily_report(self):
        """Generate daily backup report."""
        logger.info("Generating daily backup report")
        
        try:
            # Collect backup statistics for last 24 hours
            report_data = {
                'date': datetime.now().strftime('%Y-%m-%d'),
                'backups_completed': 0,
                'backups_failed': 0,
                'total_size_gb': 0,
                'alerts_generated': 0
            }
            
            # In production, collect actual metrics from backup logs
            # This is a simplified example
            
            report_message = f"""
Daily Backup Report - {report_data['date']}

Backups Completed: {report_data['backups_completed']}
Backups Failed: {report_data['backups_failed']}
Total Data Backed Up: {report_data['total_size_gb']:.2f} GB
Alerts Generated: {report_data['alerts_generated']}

Status: {'✅ All systems operational' if report_data['backups_failed'] == 0 else '⚠️ Issues detected'}
"""
            
            self._send_notification(report_message, "info")
            
        except Exception as e:
            logger.error(f"Report generation error: {e}")
    
    def _record_backup_metrics(self, tier: str, success: bool, duration: float):
        """Record backup metrics for monitoring."""
        if not self.config['monitoring']['metrics_collection']:
            return
            
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'tier': tier,
            'success': success,
            'duration_seconds': duration,
            'size_bytes': 0  # Would be populated with actual backup size
        }
        
        # In production, send to monitoring system (Prometheus, etc.)
        logger.info(f"Backup metrics: {json.dumps(metrics)}")
    
    def _send_notification(self, message: str, level: str):
        """Send notification via configured channels."""
        try:
            # Email notification
            if self.config['notifications']['email_recipients']:
                self._send_email_notification(message, level)
            
            # Slack notification
            if self.config['notifications']['slack_webhook']:
                self._send_slack_notification(message, level)
                
        except Exception as e:
            logger.error(f"Notification error: {e}")
    
    def _send_email_notification(self, message: str, level: str):
        """Send email notification."""
        # Implementation would use Django's email system or SMTP
        logger.info(f"Email notification ({level}): {message}")
    
    def _send_slack_notification(self, message: str, level: str):
        """Send Slack notification."""
        # Implementation would use Slack API
        logger.info(f"Slack notification ({level}): {message}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Enhanced Backup Scheduler")
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--daemon', action='store_true', help='Run as daemon')
    
    args = parser.parse_args()
    
    scheduler = EnhancedBackupScheduler(args.config)
    
    if args.daemon:
        # In production, use proper daemon implementation
        logger.info("Starting scheduler in daemon mode")
        
    scheduler.start()