import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  School, 
  Users, 
  GraduationCap, 
  UserCheck, 
  Building2, 
  BarChart3, 
  TrendingUp,
  Activity,
  Shield,
  Settings,
  Clock,
  FileText
} from 'lucide-react';
import AdminStatsCard from '@/components/AdminStatsCard';

interface SuperAdminOverviewProps {
  user: User;
}

const SuperAdminOverview = ({ user }: SuperAdminOverviewProps) => {
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalAdmins: 0,
    totalClasses: 0,
    activeUsers: 0,
    inactiveUsers: 0
  });
  const [recentSchools, setRecentSchools] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      setLoading(true);

      // Fetch system-wide statistics with error handling
      const [
        schoolsResponse,
        usersResponse,
        studentsResponse,
        teachersResponse,
        parentsResponse,
        adminsResponse,
        classesResponse,
        activeUsersResponse,
        inactiveUsersResponse
      ] = await Promise.all([
        supabase.from('schools').select('id', { count: 'exact' }),
        supabase.from('admin_users').select('id', { count: 'exact' }),
        supabase.from('students').select('id', { count: 'exact' }),
        supabase.from('admin_users').select('id', { count: 'exact' }).eq('role', 'teacher'),
        supabase.from('admin_users').select('id', { count: 'exact' }).eq('role', 'parent'),
        supabase.from('admin_users').select('id', { count: 'exact' }).eq('role', 'admin'),
        supabase.from('classes').select('id', { count: 'exact' }),
        supabase.from('admin_users').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('admin_users').select('id', { count: 'exact' }).eq('is_active', false)
      ]);

      // Log any errors but don't fail completely
      if (schoolsResponse.error) console.error('Error fetching schools:', schoolsResponse.error);
      if (usersResponse.error) console.error('Error fetching users:', usersResponse.error);
      if (studentsResponse.error) console.error('Error fetching students:', studentsResponse.error);
      if (teachersResponse.error) console.error('Error fetching teachers:', teachersResponse.error);
      if (parentsResponse.error) console.error('Error fetching parents:', parentsResponse.error);
      if (adminsResponse.error) console.error('Error fetching admins:', adminsResponse.error);
      if (classesResponse.error) console.error('Error fetching classes:', classesResponse.error);

      setStats({
        totalSchools: schoolsResponse.count || 0,
        totalUsers: usersResponse.count || 0,
        totalStudents: studentsResponse.count || 0,
        totalTeachers: teachersResponse.count || 0,
        totalParents: parentsResponse.count || 0,
        totalAdmins: adminsResponse.count || 0,
        totalClasses: classesResponse.count || 0,
        activeUsers: activeUsersResponse.count || 0,
        inactiveUsers: inactiveUsersResponse.count || 0
      });

      // Fetch recent schools (latest 5) - handle errors gracefully
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name, school_type, created_at, location')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (schoolsError) {
        console.error('Error fetching recent schools:', schoolsError);
      }

      // Fetch recent users (latest 5) - handle errors gracefully
      const { data: users, error: usersError } = await supabase
        .from('admin_users')
        .select('id, full_name, email, role, created_at, is_active')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (usersError) {
        console.error('Error fetching recent users:', usersError);
      }

      // Fetch recent activities (latest 5 audit logs) - handle if table doesn't exist
      const { data: activities, error: activitiesError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (activitiesError) {
        console.warn('Audit logs not available:', activitiesError.message);
      }

      setRecentSchools(schools || []);
      setRecentUsers(users || []);
      setRecentActivities(activities || []);
    } catch (error) {
      console.error('Error fetching system data:', error);
      // Set empty arrays on error so UI still renders
      setRecentSchools([]);
      setRecentUsers([]);
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const formatActivity = (activity: any) => {
    const timeAgo = new Date(activity.created_at).toLocaleString();
    switch (activity.action) {
      case 'USER_CREATED':
        return { 
          text: `New user registered: ${activity.new_values?.email || 'Unknown'}`,
          time: timeAgo,
          icon: Users
        };
      case 'USER_LOGIN':
        return { 
          text: `User logged in: ${activity.new_values?.email || 'Unknown'}`,
          time: timeAgo,
          icon: Users
        };
      case 'SCHOOL_CREATED':
        return { 
          text: `New school added: ${activity.new_values?.name || 'Unknown'}`,
          time: timeAgo,
          icon: School
        };
      default:
        return { 
          text: `System activity: ${activity.action}`,
          time: timeAgo,
          icon: Activity
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-zambian-green/30 border-t-zambian-green rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h2>
        <p className="text-gray-600">System-wide overview and management</p>
      </div>

      {/* System Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCard
          title="Total Schools"
          value={stats.totalSchools}
          icon={School}
          color="blue"
          loading={loading}
        />
        <AdminStatsCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="purple"
          loading={loading}
        />
        <AdminStatsCard
          title="Total Students"
          value={stats.totalStudents}
          icon={GraduationCap}
          color="orange"
          loading={loading}
        />
        <AdminStatsCard
          title="Total Classes"
          value={stats.totalClasses}
          icon={Building2}
          color="blue"
          loading={loading}
        />
      </div>

      {/* User Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-zambian-green/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zambian-green">{stats.totalAdmins}</div>
            <p className="text-xs text-gray-500 mt-1">School & System Admins</p>
          </CardContent>
        </Card>
        <Card className="border-zambian-green/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.totalTeachers}</div>
            <p className="text-xs text-gray-500 mt-1">Active Teachers</p>
          </CardContent>
        </Card>
        <Card className="border-zambian-green/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Parents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.totalParents}</div>
            <p className="text-xs text-gray-500 mt-1">Registered Parents</p>
          </CardContent>
        </Card>
        <Card className="border-zambian-green/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.activeUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.inactiveUsers > 0 ? `${stats.inactiveUsers} inactive` : 'All active'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Schools */}
        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green flex items-center gap-2">
              <School className="w-5 h-5" />
              Recent Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSchools.length > 0 ? (
              <div className="space-y-3">
                {recentSchools.map((school) => (
                  <div key={school.id} className="flex items-center justify-between p-3 bg-zambian-green/5 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-zambian-green">{school.name}</p>
                      <p className="text-xs text-zambian-red">
                        {school.location || 'No location'} • {school.school_type || 'N/A'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(school.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <School className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No schools yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-zambian-green/5 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-zambian-green">{user.full_name}</p>
                      <p className="text-xs text-zambian-red capitalize">
                        {user.role} {user.is_active ? '' : '(Inactive)'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No users yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Activities */}
        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => {
                  const formatted = formatActivity(activity);
                  const IconComponent = formatted.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-zambian-green/5 rounded-lg">
                      <IconComponent className="w-4 h-4 text-zambian-green" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zambian-green truncate">{formatted.text}</p>
                        <p className="text-xs text-zambian-red">{formatted.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No recent activities</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-zambian-green/20">
        <CardHeader>
          <CardTitle className="text-zambian-green flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
              <School className="w-6 h-6 text-zambian-green mb-2" />
              <p className="text-sm font-medium text-zambian-green">Add School</p>
              <p className="text-xs text-gray-500">Create new school</p>
            </button>
            <button className="p-4 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
              <Shield className="w-6 h-6 text-zambian-green mb-2" />
              <p className="text-sm font-medium text-zambian-green">Manage Users</p>
              <p className="text-xs text-gray-500">System users</p>
            </button>
            <button className="p-4 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
              <BarChart3 className="w-6 h-6 text-zambian-green mb-2" />
              <p className="text-sm font-medium text-zambian-green">View Reports</p>
              <p className="text-xs text-gray-500">System analytics</p>
            </button>
            <button className="p-4 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
              <Settings className="w-6 h-6 text-zambian-green mb-2" />
              <p className="text-sm font-medium text-zambian-green">System Settings</p>
              <p className="text-xs text-gray-500">Configure system</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* System Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zambian-green/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-600">All Systems Operational</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.totalSchools} schools active
            </p>
          </CardContent>
        </Card>
        <Card className="border-zambian-green/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zambian-green">
              {((stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.activeUsers} of {stats.totalUsers} users active
            </p>
          </CardContent>
        </Card>
        <Card className="border-zambian-green/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Data Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                {stats.totalStudents + stats.totalUsers} total records
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Students and users combined
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminOverview;

