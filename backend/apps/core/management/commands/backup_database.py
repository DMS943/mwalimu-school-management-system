"""
Management command for database backup and restore operations.
"""

import os
import subprocess
import datetime
import logging
import boto3
from botocore.exceptions import ClientError
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from decouple import config
import gzip
import shutil

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backup and restore database operations'
    
    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['backup', 'restore', 'list', 'cleanup', 'verify'],
            help='Action to perform: backup, restore, list, cleanup, or verify'
        )
        parser.add_argument(
            '--file',
            type=str,
            help='Backup file name for restore operation'
        )
        parser.add_argument(
            '--s3-upload',
            action='store_true',
            help='Upload backup to S3 storage'
        )
        parser.add_argument(
            '--compress',
            action='store_true',
            default=True,
            help='Compress backup file (default: True)'
        )
        parser.add_argument(
            '--retention-days',
            type=int,
            default=30,
            help='Number of days to keep backups (default: 30)'
        )
        parser.add_argument(
            '--backup-dir',
            type=str,
            default=config('BACKUP_DIR', default='/opt/backups'),
            help='Directory to store backups'
        )
    
    def handle(self, *args, **options):
        self.backup_dir = options['backup_dir']
        self.ensure_backup_directory()
        
        action = options['action']
        
        if action == 'backup':
            self.create_backup(options)
        elif action == 'restore':
            self.restore_backup(options)
        elif action == 'list':
            self.list_backups()
        elif action == 'cleanup':
            self.cleanup_old_backups(options['retention_days'])
        elif action == 'verify':
            self.verify_backups()
    
    def ensure_backup_directory(self):
        """Ensure backup directory exists."""
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir, mode=0o750)
            self.stdout.write(f'Created backup directory: {self.backup_dir}')
    
    def create_backup(self, options):
        """Create a database backup."""
        self.stdout.write(self.style.SUCCESS('Creating database backup...'))
        
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        db_settings = settings.DATABASES['default']
        
        # Generate backup filename
        filename = f"backup_{db_settings['NAME']}_{timestamp}.sql"
        if options['compress']:
            filename += '.gz'
        
        backup_path = os.path.join(self.backup_dir, filename)
        
        # Prepare pg_dump command
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']
        
        pg_dump_cmd = [
            'pg_dump',
            '-h', db_settings['HOST'],
            '-p', str(db_settings['PORT']),
            '-U', db_settings['USER'],
            '-d', db_settings['NAME'],
            '--verbose',
            '--no-password',
            '--format=custom',
            '--compress=9',
            '--no-owner',
            '--no-privileges',
        ]
        
        try:
            # Create backup
            self.stdout.write(f'Creating backup: {filename}')
            
            if options['compress']:
                # Create compressed backup
                with open(backup_path, 'wb') as f:
                    with gzip.GzipFile(fileobj=f, mode='wb') as gz:
                        process = subprocess.Popen(
                            pg_dump_cmd,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            env=env
                        )
                        
                        for chunk in iter(lambda: process.stdout.read(8192), b''):
                            gz.write(chunk)
                        
                        process.wait()
                        
                        if process.returncode != 0:
                            error = process.stderr.read().decode()
                            raise CommandError(f'pg_dump failed: {error}')
            else:
                # Create uncompressed backup
                with open(backup_path, 'wb') as f:
                    process = subprocess.run(
                        pg_dump_cmd,
                        stdout=f,
                        stderr=subprocess.PIPE,
                        env=env,
                        check=True
                    )
            
            # Get backup file size
            file_size = os.path.getsize(backup_path)
            size_mb = round(file_size / (1024 * 1024), 2)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Backup created successfully: {filename} ({size_mb} MB)'
                )
            )
            
            # Upload to S3 if requested
            if options['s3_upload']:
                self.upload_to_s3(backup_path, filename)
            
            # Log backup creation
            logger.info(f'Database backup created: {filename}, Size: {size_mb} MB')
            
            return backup_path
            
        except subprocess.CalledProcessError as e:
            error_msg = f'Backup failed: {e.stderr.decode() if e.stderr else str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg)
            raise CommandError(error_msg)
        except Exception as e:
            error_msg = f'Backup failed: {str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg)
            raise CommandError(error_msg)
    
    def restore_backup(self, options):
        """Restore database from backup."""
        if not options['file']:
            raise CommandError('--file parameter is required for restore operation')
        
        backup_file = options['file']
        backup_path = os.path.join(self.backup_dir, backup_file)
        
        if not os.path.exists(backup_path):
            raise CommandError(f'Backup file not found: {backup_path}')
        
        self.stdout.write(
            self.style.WARNING(
                f'WARNING: This will replace the current database with backup: {backup_file}'
            )
        )
        
        confirm = input('Type "yes" to continue: ')
        if confirm.lower() != 'yes':
            self.stdout.write('Restore cancelled.')
            return
        
        db_settings = settings.DATABASES['default']
        
        # Prepare environment
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']
        
        try:
            self.stdout.write(f'Restoring from backup: {backup_file}')
            
            # Determine if file is compressed
            is_compressed = backup_file.endswith('.gz')
            
            if is_compressed:
                # Restore from compressed backup
                with gzip.open(backup_path, 'rb') as gz:
                    pg_restore_cmd = [
                        'pg_restore',
                        '-h', db_settings['HOST'],
                        '-p', str(db_settings['PORT']),
                        '-U', db_settings['USER'],
                        '-d', db_settings['NAME'],
                        '--verbose',
                        '--no-password',
                        '--clean',
                        '--if-exists',
                    ]
                    
                    process = subprocess.run(
                        pg_restore_cmd,
                        input=gz.read(),
                        stderr=subprocess.PIPE,
                        env=env,
                        check=True
                    )
            else:
                # Restore from uncompressed backup
                pg_restore_cmd = [
                    'pg_restore',
                    '-h', db_settings['HOST'],
                    '-p', str(db_settings['PORT']),
                    '-U', db_settings['USER'],
                    '-d', db_settings['NAME'],
                    '--verbose',
                    '--no-password',
                    '--clean',
                    '--if-exists',
                    backup_path
                ]
                
                process = subprocess.run(
                    pg_restore_cmd,
                    stderr=subprocess.PIPE,
                    env=env,
                    check=True
                )
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Database restored successfully from: {backup_file}')
            )
            
            logger.info(f'Database restored from backup: {backup_file}')
            
        except subprocess.CalledProcessError as e:
            error_msg = f'Restore failed: {e.stderr.decode() if e.stderr else str(e)}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg)
            raise CommandError(error_msg)
    
    def list_backups(self):
        """List available backups."""
        self.stdout.write('\n=== Available Backups ===')
        
        if not os.path.exists(self.backup_dir):
            self.stdout.write('No backup directory found.')
            return
        
        backup_files = []
        for filename in os.listdir(self.backup_dir):
            if filename.startswith('backup_') and (filename.endswith('.sql') or filename.endswith('.sql.gz')):
                filepath = os.path.join(self.backup_dir, filename)
                stat = os.stat(filepath)
                
                backup_files.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'modified': datetime.datetime.fromtimestamp(stat.st_mtime)
                })
        
        # Sort by modification time (newest first)
        backup_files.sort(key=lambda x: x['modified'], reverse=True)
        
        if not backup_files:
            self.stdout.write('No backup files found.')
            return
        
        for backup in backup_files:
            size_mb = round(backup['size'] / (1024 * 1024), 2)
            self.stdout.write(
                f"{backup['filename']:<40} {size_mb:>8} MB  {backup['modified'].strftime('%Y-%m-%d %H:%M:%S')}"
            )
        
        self.stdout.write(f'\nTotal backups: {len(backup_files)}')
    
    def cleanup_old_backups(self, retention_days):
        """Remove backups older than retention period."""
        self.stdout.write(f'Cleaning up backups older than {retention_days} days...')
        
        if not os.path.exists(self.backup_dir):
            self.stdout.write('No backup directory found.')
            return
        
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=retention_days)
        removed_count = 0
        
        for filename in os.listdir(self.backup_dir):
            if filename.startswith('backup_') and (filename.endswith('.sql') or filename.endswith('.sql.gz')):
                filepath = os.path.join(self.backup_dir, filename)
                file_time = datetime.datetime.fromtimestamp(os.path.getmtime(filepath))
                
                if file_time < cutoff_date:
                    try:
                        os.remove(filepath)
                        self.stdout.write(f'Removed: {filename}')
                        removed_count += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Failed to remove {filename}: {e}'))
        
        self.stdout.write(
            self.style.SUCCESS(f'✓ Cleanup completed. Removed {removed_count} old backups.')
        )
        
        logger.info(f'Backup cleanup completed. Removed {removed_count} files.')
    
    def verify_backups(self):
        """Verify backup file integrity."""
        self.stdout.write('Verifying backup file integrity...')
        
        if not os.path.exists(self.backup_dir):
            self.stdout.write('No backup directory found.')
            return
        
        verified_count = 0
        error_count = 0
        
        for filename in os.listdir(self.backup_dir):
            if filename.startswith('backup_') and (filename.endswith('.sql') or filename.endswith('.sql.gz')):
                filepath = os.path.join(self.backup_dir, filename)
                
                try:
                    if filename.endswith('.gz'):
                        # Verify gzipped file
                        with gzip.open(filepath, 'rb') as f:
                            # Read a small chunk to verify file integrity
                            f.read(1024)
                    else:
                        # Verify regular file
                        with open(filepath, 'rb') as f:
                            f.read(1024)
                    
                    self.stdout.write(f'✓ {filename}')
                    verified_count += 1
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'✗ {filename}: {e}'))
                    error_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Verification completed. {verified_count} valid, {error_count} corrupted.'
            )
        )
    
    def upload_to_s3(self, backup_path, filename):
        """Upload backup to S3 storage."""
        try:
            aws_access_key = config('AWS_ACCESS_KEY_ID', default='')
            aws_secret_key = config('AWS_SECRET_ACCESS_KEY', default='')
            aws_region = config('AWS_DEFAULT_REGION', default='us-east-1')
            s3_bucket = config('S3_BACKUP_BUCKET', default='')
            
            if not all([aws_access_key, aws_secret_key, s3_bucket]):
                self.stdout.write(self.style.WARNING('S3 configuration incomplete. Skipping S3 upload.'))
                return
            
            self.stdout.write('Uploading to S3...')
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # Create S3 key with date prefix
            date_prefix = datetime.datetime.now().strftime('%Y/%m/%d')
            s3_key = f'database-backups/{date_prefix}/{filename}'
            
            s3_client.upload_file(backup_path, s3_bucket, s3_key)
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Backup uploaded to S3: s3://{s3_bucket}/{s3_key}')
            )
            
            logger.info(f'Backup uploaded to S3: {s3_key}')
            
        except ClientError as e:
            error_msg = f'S3 upload failed: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg)
        except Exception as e:
            error_msg = f'S3 upload error: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg)