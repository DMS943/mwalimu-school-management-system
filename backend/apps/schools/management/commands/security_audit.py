"""
Django management command to perform security audits.
Usage: python manage.py security_audit
"""
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
import os
import sys

User = get_user_model()


class Command(BaseCommand):
    help = 'Perform security audit of the system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check',
            type=str,
            choices=['passwords', 'accounts', 'permissions', 'config', 'all'],
            default='all',
            help='Specific security check to run',
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Automatically fix issues where possible',
        )

    def handle(self, *args, **options):
        check_type = options['check']
        auto_fix = options['fix']
        
        self.stdout.write(
            self.style.SUCCESS('🔒 Starting Security Audit...\n')
        )
        
        issues = []
        
        if check_type in ['passwords', 'all']:
            issues.extend(self.audit_passwords(auto_fix))
        
        if check_type in ['accounts', 'all']:
            issues.extend(self.audit_accounts(auto_fix))
        
        if check_type in ['permissions', 'all']:
            issues.extend(self.audit_permissions(auto_fix))
        
        if check_type in ['config', 'all']:
            issues.extend(self.audit_configuration(auto_fix))
        
        # Report results
        self.report_results(issues, auto_fix)

    def audit_passwords(self, auto_fix=False):
        """Audit password security."""
        self.stdout.write('🔑 Auditing password security...')
        issues = []
        
        # Check for weak passwords (this is a basic check)
        users_with_weak_passwords = User.objects.filter(
            password__isnull=False
        )
        
        # Check for users who need password changes
        now = timezone.now()
        password_expiry = now - timedelta(days=90)
        
        expired_passwords = User.objects.filter(
            password_changed_at__lt=password_expiry,
            is_active=True
        )
        
        if expired_passwords.exists():
            issues.append({
                'severity': 'medium',
                'category': 'passwords',
                'description': f'{expired_passwords.count()} users have passwords older than 90 days',
                'users': list(expired_passwords.values_list('username', flat=True)),
                'fixable': True
            })
            
            if auto_fix:
                expired_passwords.update(must_change_password=True)
                self.stdout.write(
                    self.style.WARNING(f'  ✓ Marked {expired_passwords.count()} users for password change')
                )
        
        # Check for users with must_change_password flag
        must_change = User.objects.filter(must_change_password=True, is_active=True)
        if must_change.exists():
            issues.append({
                'severity': 'low',
                'category': 'passwords',
                'description': f'{must_change.count()} users are required to change their passwords',
                'users': list(must_change.values_list('username', flat=True)),
                'fixable': False
            })
        
        # Check for default/weak admin passwords (basic heuristic)
        admin_users = User.objects.filter(role='admin', is_active=True)
        for admin in admin_users:
            if admin.check_password('admin') or admin.check_password('admin123') or admin.check_password('password'):
                issues.append({
                    'severity': 'critical',
                    'category': 'passwords',
                    'description': f'Admin user "{admin.username}" has a default/weak password',
                    'users': [admin.username],
                    'fixable': True
                })
                
                if auto_fix:
                    admin.must_change_password = True
                    admin.save(update_fields=['must_change_password'])
                    self.stdout.write(
                        self.style.ERROR(f'  ✓ Marked admin "{admin.username}" for password change')
                    )
        
        return issues

    def audit_accounts(self, auto_fix=False):
        """Audit account security."""
        self.stdout.write('👤 Auditing account security...')
        issues = []
        
        # Check for locked accounts
        now = timezone.now()
        locked_accounts = User.objects.filter(
            account_locked_until__gt=now,
            is_active=True
        )
        
        if locked_accounts.exists():
            issues.append({
                'severity': 'low',
                'category': 'accounts',
                'description': f'{locked_accounts.count()} accounts are currently locked',
                'users': list(locked_accounts.values_list('username', flat=True)),
                'fixable': False
            })
        
        # Check for accounts with high failed login attempts
        high_failed_attempts = User.objects.filter(
            failed_login_attempts__gte=3,
            is_active=True
        )
        
        if high_failed_attempts.exists():
            issues.append({
                'severity': 'medium',
                'category': 'accounts',
                'description': f'{high_failed_attempts.count()} accounts have 3+ failed login attempts',
                'users': list(high_failed_attempts.values_list('username', flat=True)),
                'fixable': True
            })
            
            if auto_fix:
                high_failed_attempts.update(failed_login_attempts=0)
                self.stdout.write(
                    self.style.WARNING(f'  ✓ Reset failed login attempts for {high_failed_attempts.count()} accounts')
                )
        
        # Check for inactive accounts that should be disabled
        inactive_threshold = now - timedelta(days=180)
        inactive_accounts = User.objects.filter(
            last_login__lt=inactive_threshold,
            is_active=True
        ).exclude(last_login__isnull=True)
        
        if inactive_accounts.exists():
            issues.append({
                'severity': 'medium',
                'category': 'accounts',
                'description': f'{inactive_accounts.count()} accounts inactive for 6+ months',
                'users': list(inactive_accounts.values_list('username', flat=True)),
                'fixable': True
            })
            
            if auto_fix:
                inactive_accounts.update(is_active=False)
                self.stdout.write(
                    self.style.WARNING(f'  ✓ Disabled {inactive_accounts.count()} inactive accounts')
                )
        
        # Check for accounts without email verification
        unverified_emails = User.objects.filter(
            email_verified=False,
            is_active=True
        ).exclude(email='')
        
        if unverified_emails.exists():
            issues.append({
                'severity': 'low',
                'category': 'accounts',
                'description': f'{unverified_emails.count()} accounts have unverified email addresses',
                'users': list(unverified_emails.values_list('username', flat=True)),
                'fixable': False
            })
        
        return issues

    def audit_permissions(self, auto_fix=False):
        """Audit permission and role security."""
        self.stdout.write('🛡️  Auditing permissions...')
        issues = []
        
        # Check for too many admin users
        admin_count = User.objects.filter(role='admin', is_active=True).count()
        if admin_count > 3:
            issues.append({
                'severity': 'medium',
                'category': 'permissions',
                'description': f'Too many admin users: {admin_count} (recommend ≤3)',
                'fixable': False
            })
        
        # Check for users without proper role assignment
        users_without_role = User.objects.filter(role='', is_active=True)
        if users_without_role.exists():
            issues.append({
                'severity': 'high',
                'category': 'permissions',
                'description': f'{users_without_role.count()} users have no role assigned',
                'users': list(users_without_role.values_list('username', flat=True)),
                'fixable': True
            })
            
            if auto_fix:
                users_without_role.update(role='teacher')  # Default to teacher
                self.stdout.write(
                    self.style.WARNING(f'  ✓ Assigned teacher role to {users_without_role.count()} users')
                )
        
        # Check for orphaned parent accounts (parents without linked students)
        parent_users = User.objects.filter(role='parent', is_active=True)
        orphaned_parents = []
        
        for parent in parent_users:
            from apps.students.models import Student
            if not Student.objects.filter(parent=parent).exists():
                orphaned_parents.append(parent.username)
        
        if orphaned_parents:
            issues.append({
                'severity': 'low',
                'category': 'permissions',
                'description': f'{len(orphaned_parents)} parent accounts not linked to students',
                'users': orphaned_parents,
                'fixable': False
            })
        
        return issues

    def audit_configuration(self, auto_fix=False):
        """Audit system configuration security."""
        self.stdout.write('⚙️  Auditing configuration...')
        issues = []
        
        # Check DEBUG setting
        if getattr(settings, 'DEBUG', False):
            issues.append({
                'severity': 'critical',
                'category': 'config',
                'description': 'DEBUG is enabled in production',
                'fixable': False
            })
        
        # Check SECRET_KEY
        secret_key = getattr(settings, 'SECRET_KEY', '')
        if not secret_key or len(secret_key) < 50:
            issues.append({
                'severity': 'critical',
                'category': 'config',
                'description': 'SECRET_KEY is too short or missing',
                'fixable': False
            })
        
        if 'django-insecure' in secret_key:
            issues.append({
                'severity': 'critical',
                'category': 'config',
                'description': 'SECRET_KEY is using default insecure value',
                'fixable': False
            })
        
        # Check ALLOWED_HOSTS
        allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
        if '*' in allowed_hosts:
            issues.append({
                'severity': 'high',
                'category': 'config',
                'description': 'ALLOWED_HOSTS contains wildcard (*)',
                'fixable': False
            })
        
        # Check CORS settings
        if getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False):
            issues.append({
                'severity': 'high',
                'category': 'config',
                'description': 'CORS allows all origins',
                'fixable': False
            })
        
        # Check HTTPS settings
        if not getattr(settings, 'SECURE_SSL_REDIRECT', False):
            issues.append({
                'severity': 'medium',
                'category': 'config',
                'description': 'HTTPS redirect not enabled',
                'fixable': False
            })
        
        # Check HSTS
        hsts_seconds = getattr(settings, 'SECURE_HSTS_SECONDS', 0)
        if hsts_seconds < 31536000:  # 1 year
            issues.append({
                'severity': 'low',
                'category': 'config',
                'description': 'HSTS max-age is less than 1 year',
                'fixable': False
            })
        
        # Check session security
        if not getattr(settings, 'SESSION_COOKIE_SECURE', False):
            issues.append({
                'severity': 'medium',
                'category': 'config',
                'description': 'Session cookies not marked as secure',
                'fixable': False
            })
        
        # Check CSRF security
        if not getattr(settings, 'CSRF_COOKIE_SECURE', False):
            issues.append({
                'severity': 'medium',
                'category': 'config',
                'description': 'CSRF cookies not marked as secure',
                'fixable': False
            })
        
        # Check cache configuration for security
        try:
            cache.set('security_test', 'test', 1)
            if cache.get('security_test') != 'test':
                issues.append({
                    'severity': 'low',
                    'category': 'config',
                    'description': 'Cache not working properly',
                    'fixable': False
                })
            cache.delete('security_test')
        except Exception:
            issues.append({
                'severity': 'medium',
                'category': 'config',
                'description': 'Cache configuration error',
                'fixable': False
            })
        
        return issues

    def report_results(self, issues, auto_fix):
        """Report audit results."""
        self.stdout.write('\n' + '='*60)
        
        if not issues:
            self.stdout.write(self.style.SUCCESS('🎉 No security issues found!'))
            return
        
        # Group issues by severity
        critical = [i for i in issues if i['severity'] == 'critical']
        high = [i for i in issues if i['severity'] == 'high']
        medium = [i for i in issues if i['severity'] == 'medium']
        low = [i for i in issues if i['severity'] == 'low']
        
        # Report by severity
        if critical:
            self.stdout.write(self.style.ERROR(f'\n🚨 {len(critical)} CRITICAL ISSUES:'))
            for issue in critical:
                self.stdout.write(f'   • {issue["description"]}')
                if 'users' in issue and issue['users']:
                    self.stdout.write(f'     Users: {", ".join(issue["users"][:5])}{"..." if len(issue["users"]) > 5 else ""}')
        
        if high:
            self.stdout.write(self.style.ERROR(f'\n⚠️  {len(high)} HIGH ISSUES:'))
            for issue in high:
                self.stdout.write(f'   • {issue["description"]}')
                if 'users' in issue and issue['users']:
                    self.stdout.write(f'     Users: {", ".join(issue["users"][:5])}{"..." if len(issue["users"]) > 5 else ""}')
        
        if medium:
            self.stdout.write(self.style.WARNING(f'\n⚠️  {len(medium)} MEDIUM ISSUES:'))
            for issue in medium:
                self.stdout.write(f'   • {issue["description"]}')
                if 'users' in issue and issue['users']:
                    self.stdout.write(f'     Users: {", ".join(issue["users"][:5])}{"..." if len(issue["users"]) > 5 else ""}')
        
        if low:
            self.stdout.write(self.style.WARNING(f'\n💡 {len(low)} LOW PRIORITY ISSUES:'))
            for issue in low:
                self.stdout.write(f'   • {issue["description"]}')
                if 'users' in issue and issue['users']:
                    self.stdout.write(f'     Users: {", ".join(issue["users"][:5])}{"..." if len(issue["users"]) > 5 else ""}')
        
        # Summary
        total_issues = len(issues)
        fixed_issues = len([i for i in issues if i.get('fixable', False) and auto_fix])
        
        self.stdout.write('\n' + '='*60)
        
        if auto_fix and fixed_issues > 0:
            self.stdout.write(self.style.SUCCESS(f'✅ {fixed_issues} issues automatically fixed'))
        
        self.stdout.write(f'📊 Security Audit Summary: {total_issues} issues found')
        
        if critical or high:
            self.stdout.write(self.style.ERROR('❌ Critical/High issues require immediate attention'))
            sys.exit(1)
        elif medium:
            self.stdout.write(self.style.WARNING('⚠️  Medium issues should be addressed soon'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ No critical security issues found'))