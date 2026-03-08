import { User } from '@supabase/supabase-js';
import { SchoolsManager } from '@/components/SchoolsManager';
import { ClassAssignmentManager } from '@/components/ClassAssignmentManager';
import UserManagement from '@/components/UserManagement';
import SystemSettings from '@/components/SystemSettings';
import SuperAdminOverview from '@/components/SuperAdminOverview';
import UserSettings from '@/components/UserSettings';

interface SuperAdminDashboardProps {
  user: User;
  activeTab: string;
}

const SuperAdminDashboard = ({ user, activeTab }: SuperAdminDashboardProps) => {
  const renderContent = () => {
    switch (activeTab) {
      case 'schools':
        return <SchoolsManager />;
      case 'classes':
        return <ClassAssignmentManager user={user} />;
      case 'users':
        return <UserManagement user={user} />;
      case 'settings':
        return <UserSettings user={user} userRole="admin" />;
      case 'system-settings':
        return <SystemSettings user={user} />;
      default:
        return <SuperAdminOverview user={user} />;
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};

export default SuperAdminDashboard;