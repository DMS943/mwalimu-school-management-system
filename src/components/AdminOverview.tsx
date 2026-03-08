
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, FileText, BarChart3, Settings, Calendar, BookOpen, ClipboardList, TrendingUp, Clock, UserCheck } from 'lucide-react';
import AdminStatsCard from '@/components/AdminStatsCard';
// Core statistics and overview components only

interface AdminOverviewProps {
  user: User;
}

const AdminOverview = ({ user }: AdminOverviewProps) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalStaff: 0,
    totalClasses: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentLogins, setRecentLogins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetchUserSchool();
  }, [user]);

  useEffect(() => {
    if (userSchoolId !== null || isSuperAdmin) {
      fetchOverviewData();
    }
  }, [userSchoolId, isSuperAdmin]);

  const fetchUserSchool = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('school_id, is_super_admin')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserSchoolId(data?.school_id || null);
      setIsSuperAdmin(data?.is_super_admin || false);
    } catch (error: any) {
      console.error('Error fetching user school:', error);
      setUserSchoolId(null);
      setIsSuperAdmin(false);
    }
  };

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      
      // Build queries - filter by school if not super admin
      let studentsQuery = supabase.from('students').select('id', { count: 'exact' });
      let staffQuery = supabase.from('admin_users').select('id', { count: 'exact' });
      let classesQuery = supabase.from('classes').select('id', { count: 'exact' });
      let teachersQuery = supabase.from('admin_users').select('id', { count: 'exact' }).eq('role', 'teacher');
      let parentsQuery = supabase.from('admin_users').select('id', { count: 'exact' }).eq('role', 'parent');

      if (!isSuperAdmin && userSchoolId) {
        studentsQuery = studentsQuery.eq('school_id', userSchoolId);
        staffQuery = staffQuery.eq('school_id', userSchoolId);
        classesQuery = classesQuery.eq('school_id', userSchoolId);
        teachersQuery = teachersQuery.eq('school_id', userSchoolId);
        parentsQuery = parentsQuery.eq('school_id', userSchoolId);
      }

      const [studentsResponse, staffResponse, classesResponse, teachersResponse, parentsResponse] = await Promise.all([
        studentsQuery,
        staffQuery,
        classesQuery,
        teachersQuery,
        parentsQuery
      ]);

      setStats({
        totalStudents: studentsResponse.count || 0,
        totalTeachers: teachersResponse.count || 0,
        totalParents: parentsResponse.count || 0,
        totalStaff: staffResponse.count || 0,
        totalClasses: classesResponse.count || 0
      });

      // Fetch recent activities (latest 5 audit logs) - only for super admin or skip if not available
      try {
        let activitiesQuery = supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        const { data: activities } = await activitiesQuery;
        setRecentActivities(activities || []);
      } catch (error) {
        // Audit logs might not be available or accessible
        console.warn('Audit logs not available:', error);
        setRecentActivities([]);
      }

      // Fetch recent logins (latest 5 users with their last login) - filter by school
      let loginsQuery = supabase
        .from('admin_users')
        .select('full_name, last_login, role')
        .not('last_login', 'is', null)
        .order('last_login', { ascending: false })
        .limit(5);

      if (!isSuperAdmin && userSchoolId) {
        loginsQuery = loginsQuery.eq('school_id', userSchoolId);
      }

      const { data: logins } = await loginsQuery;
      setRecentLogins(logins || []);
    } catch (error) {
      console.error('Error fetching overview data:', error);
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
      default:
        return { 
          text: `System activity: ${activity.action}`,
          time: timeAgo,
          icon: FileText
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
      {/* Enhanced Stats Cards Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AdminStatsCard
            title="Students"
            value={stats.totalStudents}
            icon={Users}
            color="purple"
            loading={loading}
          />
          <AdminStatsCard
            title="Teachers"
            value={stats.totalTeachers}
            icon={GraduationCap}
            color="blue"
            loading={loading}
          />
          <AdminStatsCard
            title="Parents"
            value={stats.totalParents}
            icon={UserCheck}
            color="orange"
            loading={loading}
          />
        </div>
      </div>

      {/* System Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-zambian-green/20 h-full">
            <CardHeader>
              <CardTitle className="text-zambian-green">System Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-zambian-green/5 rounded-lg">
                  <div className="text-2xl font-bold text-zambian-green">{stats.totalClasses}</div>
                  <div className="text-sm text-zambian-red">Active Classes</div>
                </div>
                <div className="text-center p-4 bg-zambian-green/5 rounded-lg">
                  <div className="text-2xl font-bold text-zambian-green">{stats.totalStaff}</div>
                  <div className="text-sm text-zambian-red">Total Staff</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green">Administrative Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
                <Users className="w-6 h-6 text-zambian-green mb-2" />
                <p className="text-sm font-medium text-zambian-green">Staff Management</p>
              </button>
              <button className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
                <Clock className="w-6 h-6 text-zambian-green mb-2" />
                <p className="text-sm font-medium text-zambian-green">Timetable</p>
              </button>
              <button className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
                <FileText className="w-6 h-6 text-zambian-green mb-2" />
                <p className="text-sm font-medium text-zambian-green">Reports</p>
              </button>
              <button className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
                <Settings className="w-6 h-6 text-zambian-green mb-2" />
                <p className="text-sm font-medium text-zambian-green">Settings</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zambian-green/20">
        <CardHeader>
          <CardTitle className="text-zambian-green">Recent System Activities</CardTitle>
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
                    <div>
                      <p className="text-sm font-medium text-zambian-green">{formatted.text}</p>
                      <p className="text-xs text-zambian-red">{formatted.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No recent activities</p>
              <p className="text-sm">System activities will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green">Recent User Logins</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogins.length > 0 ? (
              <div className="space-y-3">
                {recentLogins.map((login, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zambian-green/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-zambian-green" />
                      <div>
                        <p className="text-sm font-medium text-zambian-green">{login.full_name}</p>
                        <p className="text-xs text-zambian-red capitalize">{login.role}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zambian-red">
                      {login.last_login ? new Date(login.last_login).toLocaleString() : 'Never'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No recent logins</p>
                <p className="text-sm">User login activity will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors flex items-center gap-3">
                <Users className="w-5 h-5 text-zambian-green" />
                <span className="text-sm font-medium text-zambian-green">Manage Parent-Child Links</span>
              </button>
              <button className="w-full p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-zambian-green" />
                <span className="text-sm font-medium text-zambian-green">Add New Student</span>
              </button>
              <button className="w-full p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-zambian-green" />
                <span className="text-sm font-medium text-zambian-green">Create User Account</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
