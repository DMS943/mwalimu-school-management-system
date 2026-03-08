
import { User } from '@supabase/supabase-js';
import AdminOverview from '@/components/AdminOverview';
import UserManagement from '@/components/UserManagement';
import SystemSettings from '@/components/SystemSettings';
import EnhancedScoreManager from '@/components/EnhancedScoreManager';
import PerformanceAnalytics from '@/components/PerformanceAnalytics';
import ReportsManager from '@/components/ReportsManager';
import { SimpleParentLinkManager } from '@/components/SimpleParentLinkManager';
import { TermsManager } from '@/components/TermsManager';
import { SchoolsManager } from '@/components/SchoolsManager';
import { ClassAssignmentManager } from '@/components/ClassAssignmentManager';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import StudentManagement from '@/components/StudentManagement';
import UserSettings from '@/components/UserSettings';

interface AdminDashboardProps {
  user: User;
  activeTab: string;
}

const AdminDashboard = ({ user, activeTab }: AdminDashboardProps) => {
  const renderContent = () => {
    switch (activeTab) {
      case 'score-management':
        return <EnhancedScoreManager user={user} />;
      case 'reports':
        return <ReportsManager user={user} />;
      case 'users':
        return <UserManagement user={user} />;
      case 'parent-links':
        return <SimpleParentLinkManager />;
      case 'terms':
        return <TermsManager />;
      case 'schools':
        return <SchoolsManager />;
      case 'classes':
        return <ClassAssignmentManager user={user} />;
      case 'students':
        return <StudentManagement user={user} />;
      case 'settings':
        return <UserSettings user={user} userRole="admin" />;
      case 'system-settings':
        return <SystemSettings user={user} />;
      default:
        return <AdminOverview user={user} />;
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};

export default AdminDashboard;
