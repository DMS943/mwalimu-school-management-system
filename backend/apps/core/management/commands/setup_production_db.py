"""
Management command to set up database for production readiness.
Runs all necessary optimizations and configurations.
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Set up database for production with all optimizations'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-migrations',
            action='store_true',
            help='Skip running migrations',
        )
        parser.add_argument(
            '--skip-indexes',
            action='store_true',
            help='Skip creating performance indexes',
        )
        parser.add_argument(
            '--skip-collectstatic',
            action='store_true',
            help='Skip collecting static files',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Setting up database for production...'))
        
        # Step 1: Run migrations
        if not options['skip_migrations']:
            self.stdout.write('\n1. Running database migrations...')
            try:
                call_command('migrate', '--noinput')
                self.stdout.write(self.style.SUCCESS('✓ Migrations completed'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Migration failed: {e}'))
                return
        
        # Step 2: Create superuser if in CI/development
        if settings.DEBUG or getattr(settings, 'CI', False):
            self.stdout.write('\n2. Setting up default admin user...')
            try:
                call_command('createsuperuser', '--noinput', username='admin', email='admin@school.com')
                self.stdout.write(self.style.SUCCESS('✓ Admin user created'))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Admin user creation skipped: {e}'))
        
        # Step 3: Collect static files
        if not options['skip_collectstatic']:
            self.stdout.write('\n3. Collecting static files...')
            try:
                call_command('collectstatic', '--noinput', '--clear')
                self.stdout.write(self.style.SUCCESS('✓ Static files collected'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Static collection failed: {e}'))
        
        # Step 4: Validate configuration
        self.stdout.write('\n4. Validating configuration...')
        try:
            call_command('validate_config')
            self.stdout.write(self.style.SUCCESS('✓ Configuration validated'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Configuration validation failed: {e}'))
        
        # Step 5: Create performance indexes
        if not options['skip_indexes']:
            self.stdout.write('\n5. Creating performance indexes...')
            try:
                call_command('optimize_database', '--create-indexes')
                self.stdout.write(self.style.SUCCESS('✓ Performance indexes created'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Index creation failed: {e}'))
        
        # Step 6: Run initial vacuum analyze
        self.stdout.write('\n6. Optimizing database statistics...')
        try:
            call_command('optimize_database', '--vacuum')
            self.stdout.write(self.style.SUCCESS('✓ Database statistics optimized'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Database optimization failed: {e}'))
        
        # Step 7: Run security audit
        self.stdout.write('\n7. Running security audit...')
        try:
            call_command('security_audit')
            self.stdout.write(self.style.SUCCESS('✓ Security audit completed'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Security audit failed: {e}'))
        
        # Step 8: Generate initial health report
        self.stdout.write('\n8. Generating initial health report...')
        try:
            call_command('monitor_database', '--output', 'console')
            self.stdout.write(self.style.SUCCESS('✓ Health report generated'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Health report failed: {e}'))
        
        # Final status
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('✓ Production database setup completed!'))
        self.stdout.write('=' * 60)
        
        # Provide next steps
        self.stdout.write('\nNext steps:')
        self.stdout.write('1. Set up automated backups: crontab scripts/crontab_backup')
        self.stdout.write('2. Configure monitoring alerts')
        self.stdout.write('3. Test backup and restore procedures')
        self.stdout.write('4. Monitor /monitoring/database/ endpoint')
        self.stdout.write('5. Review logs in /var/log/django/')