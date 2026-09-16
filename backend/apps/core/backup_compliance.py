"""
Backup Compliance and Retention Management for Mwalimu School Management System.
Ensures compliance with data protection regulations and retention policies.
"""

import json
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger('app.backup_compliance')


class ComplianceStandard(Enum):
    """Supported compliance standards."""
    GDPR = "gdpr"           # General Data Protection Regulation
    FERPA = "ferpa"         # Family Educational Rights and Privacy Act
    SOX = "sox"             # Sarbanes-Oxley Act
    HIPAA = "hipaa"         # Health Insurance Portability and Accountability Act
    ISO27001 = "iso27001"   # ISO/IEC 27001
    CUSTOM = "custom"       # Custom organizational requirements


@dataclass
class RetentionPolicy:
    """Data retention policy definition."""
    name: str
    standard: ComplianceStandard
    retention_period: timedelta
    backup_frequency: timedelta
    encryption_required: bool
    offsite_storage_required: bool
    audit_trail_required: bool
    data_categories: List[str]
    geographic_restrictions: List[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


class BackupComplianceManager:
    """Manages backup compliance and retention policies."""
    
    def __init__(self):
        self.policies = self._load_retention_policies()
        self.audit_log = []
        
    def _load_retention_policies(self) -> Dict[str, RetentionPolicy]:
        """Load predefined retention policies."""
        policies = {}
        
        # FERPA compliance for educational records
        policies['student_records'] = RetentionPolicy(
            name="Student Educational Records",
            standard=ComplianceStandard.FERPA,
            retention_period=timedelta(days=2555),  # 7 years
            backup_frequency=timedelta(days=1),
            encryption_required=True,
            offsite_storage_required=True,
            audit_trail_required=True,
            data_categories=['student_data', 'academic_records', 'assessments'],
            geographic_restrictions=['US']
        )
        
        # GDPR compliance for EU data subjects
        policies['personal_data'] = RetentionPolicy(
            name="Personal Data (GDPR)",
            standard=ComplianceStandard.GDPR,
            retention_period=timedelta(days=365),  # 1 year after consent withdrawal
            backup_frequency=timedelta(days=1),
            encryption_required=True,
            offsite_storage_required=False,
            audit_trail_required=True,
            data_categories=['personal_info', 'contact_details', 'preferences'],
            geographic_restrictions=['EU']
        )
        
        # Financial records (SOX compliance)
        policies['financial_records'] = RetentionPolicy(
            name="Financial Records",
            standard=ComplianceStandard.SOX,
            retention_period=timedelta(days=2555),  # 7 years
            backup_frequency=timedelta(days=1),
            encryption_required=True,
            offsite_storage_required=True,
            audit_trail_required=True,
            data_categories=['payments', 'invoices', 'financial_reports']
        )
        
        # System logs and audit trails
        policies['audit_logs'] = RetentionPolicy(
            name="System Audit Logs",
            standard=ComplianceStandard.ISO27001,
            retention_period=timedelta(days=1095),  # 3 years
            backup_frequency=timedelta(days=7),
            encryption_required=True,
            offsite_storage_required=True,
            audit_trail_required=True,
            data_categories=['system_logs', 'security_events', 'access_logs']
        )
        
        return policies
    
    def get_applicable_policies(self, data_category: str) -> List[RetentionPolicy]:
        """Get applicable retention policies for a data category."""
        applicable = []
        for policy in self.policies.values():
            if data_category in policy.data_categories:
                applicable.append(policy)
        return applicable
    
    def validate_backup_compliance(self, backup_metadata: Dict) -> Dict:
        """Validate backup compliance with retention policies."""
        compliance_report = {
            'compliant': True,
            'violations': [],
            'recommendations': []
        }
        
        data_category = backup_metadata.get('data_category', 'unknown')
        policies = self.get_applicable_policies(data_category)
        
        if not policies:
            compliance_report['violations'].append(
                f"No retention policy defined for data category: {data_category}"
            )
            compliance_report['compliant'] = False
            return compliance_report
        
        # Check each applicable policy
        for policy in policies:
            # Check encryption requirement
            if policy.encryption_required and not backup_metadata.get('encrypted', False):
                compliance_report['violations'].append(
                    f"Encryption required by {policy.standard.value} for {policy.name}"
                )
                compliance_report['compliant'] = False
            
            # Check offsite storage requirement
            if policy.offsite_storage_required:
                backup_tiers = backup_metadata.get('tiers', [])
                if 'offsite' not in backup_tiers and 'archive' not in backup_tiers:
                    compliance_report['violations'].append(
                        f"Offsite storage required by {policy.standard.value} for {policy.name}"
                    )
                    compliance_report['compliant'] = False
            
            # Check retention period
            backup_date = datetime.fromisoformat(backup_metadata.get('timestamp'))
            retention_deadline = backup_date + policy.retention_period
            if datetime.now() > retention_deadline:
                compliance_report['recommendations'].append(
                    f"Backup older than retention period for {policy.name}"
                )
        
        return compliance_report
    
    def generate_compliance_report(self) -> Dict:
        """Generate comprehensive compliance report."""
        report = {
            'report_date': datetime.now().isoformat(),
            'policies_count': len(self.policies),
            'compliance_summary': {},
            'recommendations': [],
            'violations': []
        }
        
        # Analyze compliance for each policy
        for policy_name, policy in self.policies.items():
            policy_compliance = self._analyze_policy_compliance(policy)
            report['compliance_summary'][policy_name] = policy_compliance
            
            if not policy_compliance['compliant']:
                report['violations'].extend(policy_compliance['violations'])
            
            report['recommendations'].extend(policy_compliance['recommendations'])
        
        return report