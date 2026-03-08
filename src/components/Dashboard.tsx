
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AppSidebar from '@/components/AppSidebar';
import ParentDashboard from '@/components/ParentDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import TeacherDashboard from '@/components/TeacherDashboard';
import LoadingPage from '@/components/LoadingPage';
import { useToast } from '@/hooks/use-toast';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import { Moon, Sun } from 'lucide-react';

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const { toast } = useToast();
  const { school, loading: schoolLoading } = useCurrentSchool(user);

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const fetchUserRole = async () => {
    try {
      console.log('🔍 Dashboard: Fetching user role for user_id:', user.id);
      console.log('🔍 Dashboard: User email:', user.email);
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('role, is_super_admin, email, full_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ Dashboard: Error fetching user role:', error);
        console.error('❌ Dashboard: Error code:', error.code);
        console.error('❌ Dashboard: Error message:', error.message);
        console.error('❌ Dashboard: Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's a "not found" error (PGRST116) or RLS policy error
        if (error.code === 'PGRST116') {
          // User not found in admin_users - show error instead of defaulting to parent
          toast({
            title: "Account Setup Required",
            description: "Your account is not set up in the system. Please contact your administrator.",
            variant: "destructive",
          });
          setUserRole(null); // Don't default to parent - show error state
        } else if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
          // RLS policy error
          console.error('❌ Dashboard: RLS Policy Error - User cannot access their own record!');
          toast({
            title: "Access Error",
            description: "Unable to verify your account. Please contact support.",
            variant: "destructive",
          });
          setUserRole(null);
        } else {
          // Other error - still don't default to parent
          toast({
            title: "Error Loading Account",
            description: error.message || "Failed to load your account information.",
            variant: "destructive",
          });
          setUserRole(null);
        }
        setIsSuperAdmin(false);
      } else {
        console.log('✅ Dashboard: User role data:', data);
        console.log('✅ Dashboard: Role:', data.role);
        console.log('✅ Dashboard: is_super_admin:', data.is_super_admin);
        setUserRole(data.role);
        setIsSuperAdmin(data.is_super_admin || false);
        
        // Log what dashboard will be shown
        if (data.role === 'admin' && data.is_super_admin) {
          console.log('✅ Dashboard: Will show SuperAdminDashboard');
        } else if (data.role === 'admin') {
          console.log('⚠️ Dashboard: Will show AdminDashboard (School Admin)');
        } else if (data.role === 'parent') {
          console.log('❌ Dashboard: Will show ParentDashboard (PROBLEM if you are super admin!)');
        } else {
          console.log('⚠️ Dashboard: Will show dashboard for role:', data.role);
        }
      }
    } catch (error: any) {
      console.error('❌ Dashboard: Exception in fetchUserRole:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please refresh the page or contact support.",
        variant: "destructive",
      });
      setUserRole(null);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingPage message="Setting up your dashboard..." />;
  }

  // Show error state if role couldn't be determined
  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Account Setup Issue</CardTitle>
            <CardDescription>
              Unable to determine your account role. This usually means:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Your account is not set up in the system</li>
              <li>There was an error accessing your account information</li>
              <li>Your account may need to be activated by an administrator</li>
            </ul>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
              <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign Out</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderDashboardContent = () => {
    switch (userRole) {
      case 'admin':
        // Route to SuperAdminDashboard if super admin, otherwise AdminDashboard
        return isSuperAdmin ? (
          <SuperAdminDashboard user={user} activeTab={activeTab} />
        ) : (
          <AdminDashboard user={user} activeTab={activeTab} />
        );
      case 'teacher':
        return <TeacherDashboard user={user} activeTab={activeTab} />;
        case 'parent':
        default:
          return <ParentDashboard user={user} activeTab={activeTab} setActiveTab={setActiveTab} />;
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const getPageTitle = () => {
    switch (userRole) {
      case 'admin':
        return isSuperAdmin ? 'Super Admin Dashboard' : 'School Admin Dashboard';
      case 'teacher':
        return 'Teacher Dashboard';
      case 'parent':
        return 'Parent Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const getActiveTabTitle = () => {
    if (activeTab === 'overview') return getPageTitle();
    
    // Find the menu item title based on activeTab
    const menuItems = getMenuItemsForRole(userRole || 'parent');
    const activeItem = menuItems.find(item => item.id === activeTab);
    return activeItem ? activeItem.title : getPageTitle();
  };

  const getMenuItemsForRole = (role: string) => {
    const commonItems = [
      { id: 'overview', title: 'Overview' },
    ];

    switch (role) {
      case 'admin':
        // Super admins see system-wide management, school admins see school-specific
        if (isSuperAdmin) {
        return [
          ...commonItems,
          { id: 'schools', title: 'Schools Management' },
            { id: 'users', title: 'System Users' },
            { id: 'settings', title: 'System Settings' },
          ];
        } else {
          return [
            ...commonItems,
          { id: 'score-management', title: 'Student Score Management' },
          { id: 'reports', title: 'Report Generation' },
          { id: 'students', title: 'Student Management' },
          { id: 'classes', title: 'Class Management' },
          { id: 'users', title: 'User Management' },
          { id: 'parent-links', title: 'Parent-Student Links' },
          { id: 'terms', title: 'Academic Terms' },
            { id: 'settings', title: 'School Settings' },
        ];
        }

      case 'teacher':
        return [
          ...commonItems,
          { id: 'students', title: 'Student Management' },
          { id: 'attendance', title: 'Mark Attendance' },
          { id: 'score-management', title: 'Score Management' },
          { id: 'reports', title: 'Student Reports' },
          { id: 'analytics', title: 'Enhanced Analytics' },
          { id: 'offline-sync', title: 'Offline Sync' },
          { id: 'notifications', title: 'Notifications' },
        ];
      case 'parent':
      default:
        return [
          ...commonItems,
          { id: 'children', title: 'My Children' },
          { id: 'reports', title: 'Report Cards' },
          { id: 'performance', title: 'Performance Tracking' },
          { id: 'attendance', title: 'Attendance' },
        ];
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-purple-primary/5 to-purple-primary/10 dark:from-gray-900 dark:to-gray-800">
        <AppSidebar 
          user={user} 
          userRole={userRole || 'parent'} 
          isSuperAdmin={isSuperAdmin}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-purple-primary/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-purple-primary hover:bg-purple-light dark:hover:bg-purple-primary/20" />
                {school?.logo_url && (
                  <img
                    src={school.logo_url}
                    alt={school.name}
                    className="h-10 w-10 object-contain rounded-lg border border-purple-primary/20"
                  />
                )}
                <div>
                  <h1 className="text-xl font-bold text-purple-primary dark:text-purple-primary">
                    {getActiveTabTitle()}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {school?.name || 'Cumulative Score and Rank Analyzer School Management System'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="text-purple-primary hover:bg-purple-light dark:hover:bg-purple-primary/20"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6">
            {renderDashboardContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
