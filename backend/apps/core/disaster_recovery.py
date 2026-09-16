"""
Disaster Recovery System for Mwalimu School Management System.
Comprehensive backup, recovery, and business continuity management.
"""

import os
import logging
import boto3
import json
import subprocess
import hashlib
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from django.conf import settings
from django.core.management.base import BaseCommand
from decouple import config

logger = logging.getLogger('app.disaster_recovery')


class BackupTier(Enum):
    """Backup tier definitions for multi-tier backup strategy."""
    LOCAL = "local"
    REGIONAL = "regional" 
    OFFSITE = "offsite"
    ARCHIVE = "archive"


class RecoveryObjective(Enum):
    """Recovery objectives for different scenarios."""
    CRITICAL = "critical"    # RTO: 15 min, RPO: 5 min
    HIGH = "high"           # RTO: 1 hour, RPO: 15 min
    MEDIUM = "medium"       # RTO: 4 hours, RPO: 1 hour
    LOW = "low"            # RTO: 24 hours, RPO: 4 hours


@dataclass
class BackupMetadata:
    """Backup metadata for tracking and validation."""
    backup_id: str
    timestamp: datetime
    size_bytes: int
    checksum: str
    tier: BackupTier
    retention_date: datetime
    tags: Dict[str, str]
    encrypted: bool = True
    verified: bool = False

class DisasterRecoveryManager:
    """Central disaster recovery management system."""
    
    def __init__(self):
        self.backup_dir = config('BACKUP_DIR', default='/opt/backups')
        self.encryption_key = config('BACKUP_ENCRYPTION_KEY', default='')
        self.s3_bucket = config('S3_BACKUP_BUCKET', default='')
        self.retention_policies = {
            BackupTier.LOCAL: timedelta(days=7),
            BackupTier.REGIONAL: timedelta(days=30),
            BackupTier.OFFSITE: timedelta(days=90),
            BackupTier.ARCHIVE: timedelta(days=2555)  # 7 years
        }
        
    def create_full_backup(self, tier: BackupTier = BackupTier.LOCAL) -> BackupMetadata:
        """Create a complete system backup."""
        backup_id = f"full_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        logger.info(f"Creating full backup: {backup_id} (tier: {tier.value})")
        
        # Create backup directory structure
        backup_path = Path(self.backup_dir) / backup_id
        backup_path.mkdir(parents=True, exist_ok=True)
        
        # Backup database
        db_backup = self._backup_database(backup_path)
        
        # Backup application files
        app_backup = self._backup_application_files(backup_path)
        
        # Backup configurations
        config_backup = self._backup_configurations(backup_path)
        
        # Create metadata
        metadata = self._create_backup_metadata(backup_id, backup_path, tier)
        
        # Encrypt and compress
        if self.encryption_key:
            self._encrypt_backup(backup_path)
            
        # Store metadata
        self._store_metadata(metadata)
        
        logger.info(f"Full backup completed: {backup_id}")
        return metadata
    
    def _backup_database(self, backup_path: Path) -> str:
        """Create database backup."""
        db_file = backup_path / "database.sql.gz"
        
        # Use existing backup management command
        subprocess.run([
            'python', 'manage.py', 'backup_database', 'backup',
            '--compress', '--backup-dir', str(backup_path),
            '--file', 'database.sql.gz'
        ], check=True)
        
        return str(db_file)
    
    def _backup_application_files(self, backup_path: Path) -> str:
        """Backup application files and media."""
        files_dir = backup_path / "application_files"
        files_dir.mkdir(exist_ok=True)
        
        # Backup media files
        media_backup = files_dir / "media.tar.gz"
        subprocess.run([
            'tar', '-czf', str(media_backup), 
            '-C', settings.MEDIA_ROOT, '.'
        ], check=True)
        
        # Backup static files
        static_backup = files_dir / "static.tar.gz"
        subprocess.run([
            'tar', '-czf', str(static_backup),
            '-C', settings.STATIC_ROOT, '.'
        ], check=True)
        
        return str(files_dir)
    
    def _backup_configurations(self, backup_path: Path) -> str:
        """Backup system configurations."""
        config_dir = backup_path / "configurations"
        config_dir.mkdir(exist_ok=True)
        
        # Backup environment files
        for env_file in ['.env.production', '.env.staging']:
            if os.path.exists(env_file):
                subprocess.run([
                    'cp', env_file, str(config_dir)
                ], check=True)
        
        # Backup nginx configuration
        nginx_dir = config_dir / "nginx"
        nginx_dir.mkdir(exist_ok=True)
        subprocess.run([
            'cp', '-r', 'nginx/', str(nginx_dir)
        ], check=True)
        
        return str(config_dir)