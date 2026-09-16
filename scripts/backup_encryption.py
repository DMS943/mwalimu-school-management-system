#!/usr/bin/env python3
"""
Backup Encryption and Security Management for Mwalimu School Management System.
Handles encryption, decryption, and secure storage of backup files.
"""

import os
import sys
import hashlib
import logging
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import json

logger = logging.getLogger(__name__)


class BackupEncryption:
    """Handles backup encryption and decryption operations."""
    
    def __init__(self, encryption_key: Optional[str] = None):
        self.encryption_key = encryption_key or os.environ.get('BACKUP_ENCRYPTION_KEY')
        if not self.encryption_key:
            raise ValueError("Backup encryption key not provided")
        
        self.cipher_suite = self._initialize_cipher()
        
    def _initialize_cipher(self) -> Fernet:
        """Initialize Fernet cipher suite."""
        # Derive key from password
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'mwalimu_backup_salt',  # In production, use random salt
            iterations=100000,
            backend=default_backend()
        )
        
        key = base64.urlsafe_b64encode(
            kdf.derive(self.encryption_key.encode())
        )
        
        return Fernet(key)
    
    def encrypt_file(self, file_path: Path, output_path: Optional[Path] = None) -> Path:
        """Encrypt a backup file."""
        if not file_path.exists():
            raise FileNotFoundError(f"Backup file not found: {file_path}")
        
        if output_path is None:
            output_path = file_path.with_suffix(file_path.suffix + '.enc')
        
        logger.info(f"Encrypting backup file: {file_path}")
        
        # Read and encrypt file
        with open(file_path, 'rb') as infile:
            file_data = infile.read()
        
        encrypted_data = self.cipher_suite.encrypt(file_data)
        
        # Write encrypted file
        with open(output_path, 'wb') as outfile:
            outfile.write(encrypted_data)
        
        # Generate checksum
        checksum = self._calculate_checksum(output_path)
        
        # Create metadata file
        metadata = {
            'original_file': str(file_path),
            'encrypted_file': str(output_path),
            'checksum': checksum,
            'encryption_method': 'Fernet',
            'timestamp': str(datetime.now())
        }
        
        metadata_path = output_path.with_suffix('.metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Backup encrypted successfully: {output_path}")
        return output_path
    
    def decrypt_file(self, encrypted_path: Path, output_path: Optional[Path] = None) -> Path:
        """Decrypt a backup file."""
        if not encrypted_path.exists():
            raise FileNotFoundError(f"Encrypted file not found: {encrypted_path}")
        
        if output_path is None:
            # Remove .enc extension
            output_path = encrypted_path.with_suffix('')
            if encrypted_path.suffix == '.enc':
                output_path = encrypted_path.with_suffix('')
        
        logger.info(f"Decrypting backup file: {encrypted_path}")
        
        # Verify checksum if metadata exists
        metadata_path = encrypted_path.with_suffix('.metadata.json')
        if metadata_path.exists():
            self._verify_checksum(encrypted_path, metadata_path)
        
        # Read and decrypt file
        with open(encrypted_path, 'rb') as infile:
            encrypted_data = infile.read()
        
        try:
            decrypted_data = self.cipher_suite.decrypt(encrypted_data)
        except Exception as e:
            raise ValueError(f"Decryption failed: {e}")
        
        # Write decrypted file
        with open(output_path, 'wb') as outfile:
            outfile.write(decrypted_data)
        
        logger.info(f"Backup decrypted successfully: {output_path}")
        return output_path
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA-256 checksum of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def _verify_checksum(self, file_path: Path, metadata_path: Path) -> bool:
        """Verify file checksum against metadata."""
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        expected_checksum = metadata.get('checksum')
        if not expected_checksum:
            logger.warning("No checksum found in metadata")
            return False
        
        actual_checksum = self._calculate_checksum(file_path)
        
        if actual_checksum != expected_checksum:
            raise ValueError(f"Checksum verification failed: {actual_checksum} != {expected_checksum}")
        
        logger.info("Checksum verification passed")
        return True


class SecureBackupManager:
    """Manages secure backup operations with encryption and validation."""
    
    def __init__(self):
        self.encryptor = BackupEncryption()
        self.backup_dir = Path(os.environ.get('BACKUP_DIR', '/opt/backups'))
        
    def create_secure_backup(self, source_files: List[Path], backup_name: str) -> Dict:
        """Create encrypted and validated backup."""
        logger.info(f"Creating secure backup: {backup_name}")
        
        # Create backup directory
        backup_path = self.backup_dir / backup_name
        backup_path.mkdir(parents=True, exist_ok=True)
        
        backup_manifest = {
            'backup_name': backup_name,
            'timestamp': str(datetime.now()),
            'files': [],
            'total_size': 0,
            'encrypted': True
        }
        
        for source_file in source_files:
            if not source_file.exists():
                logger.warning(f"Source file not found: {source_file}")
                continue
            
            # Copy file to backup directory
            backup_file = backup_path / source_file.name
            subprocess.run(['cp', str(source_file), str(backup_file)], check=True)
            
            # Encrypt file
            encrypted_file = self.encryptor.encrypt_file(backup_file)
            
            # Remove unencrypted file
            backup_file.unlink()
            
            file_info = {
                'original_name': source_file.name,
                'encrypted_name': encrypted_file.name,
                'size': encrypted_file.stat().st_size,
                'checksum': self.encryptor._calculate_checksum(encrypted_file)
            }
            
            backup_manifest['files'].append(file_info)
            backup_manifest['total_size'] += file_info['size']
        
        # Save manifest
        manifest_path = backup_path / 'manifest.json'
        with open(manifest_path, 'w') as f:
            json.dump(backup_manifest, f, indent=2)
        
        # Encrypt manifest
        encrypted_manifest = self.encryptor.encrypt_file(manifest_path)
        manifest_path.unlink()
        
        logger.info(f"Secure backup created: {backup_name}")
        return backup_manifest
    
    def restore_secure_backup(self, backup_name: str, restore_path: Path) -> bool:
        """Restore encrypted backup to specified location."""
        logger.info(f"Restoring secure backup: {backup_name}")
        
        backup_path = self.backup_dir / backup_name
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup not found: {backup_name}")
        
        # Find and decrypt manifest
        manifest_files = list(backup_path.glob('manifest.json.enc'))
        if not manifest_files:
            raise FileNotFoundError("Backup manifest not found")
        
        manifest_file = manifest_files[0]
        decrypted_manifest = self.encryptor.decrypt_file(manifest_file)
        
        # Load manifest
        with open(decrypted_manifest, 'r') as f:
            manifest = json.load(f)
        
        # Create restore directory
        restore_path.mkdir(parents=True, exist_ok=True)
        
        # Restore files
        for file_info in manifest['files']:
            encrypted_file = backup_path / file_info['encrypted_name']
            
            if not encrypted_file.exists():
                logger.error(f"Encrypted file not found: {encrypted_file}")
                continue
            
            # Decrypt file
            decrypted_file = self.encryptor.decrypt_file(
                encrypted_file, 
                restore_path / file_info['original_name']
            )
            
            logger.info(f"Restored file: {decrypted_file}")
        
        # Cleanup temporary manifest
        decrypted_manifest.unlink()
        
        logger.info(f"Secure backup restored to: {restore_path}")
        return True


if __name__ == "__main__":
    import argparse
    from datetime import datetime
    
    parser = argparse.ArgumentParser(description="Backup encryption utility")
    parser.add_argument('operation', choices=['encrypt', 'decrypt', 'backup', 'restore'])
    parser.add_argument('--file', help='File to encrypt/decrypt')
    parser.add_argument('--backup-name', help='Backup name for secure operations')
    parser.add_argument('--restore-path', help='Path to restore backup')
    
    args = parser.parse_args()
    
    if args.operation == 'encrypt' and args.file:
        encryptor = BackupEncryption()
        encryptor.encrypt_file(Path(args.file))
    elif args.operation == 'decrypt' and args.file:
        encryptor = BackupEncryption()
        encryptor.decrypt_file(Path(args.file))
    elif args.operation == 'backup' and args.backup_name:
        manager = SecureBackupManager()
        # Example: backup current directory
        files = list(Path.cwd().glob('*.sql.gz'))
        manager.create_secure_backup(files, args.backup_name)
    elif args.operation == 'restore' and args.backup_name and args.restore_path:
        manager = SecureBackupManager()
        manager.restore_secure_backup(args.backup_name, Path(args.restore_path))