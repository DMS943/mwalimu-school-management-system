import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useParentDashboard = (user: User) => {
  const [stats, setStats] = useState({
    childrenCount: 0,
    attendanceRate: 0,
    newReports: 0,
  });
  const [children, setChildren] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Get the parent's admin_users.id (parent_user_id references admin_users.id, not auth.users.id)
      const { data: parentAdminUser, error: adminUserError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'parent')
        .single();

      if (adminUserError || !parentAdminUser) {
        console.error('Parent admin user not found:', adminUserError);
        setLoading(false);
        return;
      }

      // Fetch children with class and marks information
      // parent_user_id references admin_users.id, not auth.users.id
      const { data: childrenData, error: childrenError } = await supabase
        .from('students')
        .select(`
          *,
          classes!current_class_id (
            id,
            name
          )
        `)
        .eq('parent_user_id', parentAdminUser.id);

      if (childrenError) throw childrenError;

      // Fetch marks for all children to calculate averages
      const childrenWithStats = await Promise.all(
        (childrenData || []).map(async (child) => {
          const { data: marksData } = await supabase
            .from('marks')
            .select('marks')
            .eq('student_id', child.id);

          const average = marksData && marksData.length > 0
            ? Math.round(marksData.reduce((sum, m) => sum + m.marks, 0) / marksData.length)
            : 0;

          // Get class rank and average from cumulative_scores if available
          let rank = 'N/A';
          let termAverage = 0;
          if (child.current_class_id) {
            try {
              const { data: cumulativeData, error: cumulativeError } = await supabase
                .from('cumulative_scores')
                .select('rank_in_class, percentage')
                .eq('student_id', child.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (!cumulativeError && cumulativeData) {
                if (cumulativeData.rank_in_class) {
                  rank = cumulativeData.rank_in_class.toString();
                }
                if (cumulativeData.percentage) {
                  termAverage = Number(cumulativeData.percentage);
                }
              }
            } catch (error) {
              // Silently fail - cumulative_scores might not be available
              console.debug('Could not fetch cumulative_scores:', error);
            }
          }

          return {
            id: child.id,
            name: `${child.first_name} ${child.last_name}`,
            class: child.classes?.name || 'N/A',
            average,
            rank,
            termAverage: termAverage || average, // Use term average if available, otherwise use calculated average
          };
        })
      );

      setChildren(childrenWithStats);

      // Calculate attendance rate for children this month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      let totalAttendance = 0;
      let totalDays = 0;

      if (childrenData && childrenData.length > 0) {
        const childIds = childrenData.map(child => child.id);
        
        try {
          const { data: attendanceData, error: attendanceError } = await supabase
            .from('attendance')
            .select('status')
            .in('student_id', childIds)
            .gte('date', `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`)
            .lt('date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);

          if (!attendanceError && attendanceData) {
            totalDays = attendanceData.length;
            totalAttendance = attendanceData.filter(record => record.status === 'present').length;
          }
        } catch (error) {
          // Silently fail - attendance might not be available or accessible
          console.debug('Could not fetch attendance:', error);
        }
      }

      // Fetch report count
      const { data: reportsData } = await supabase
        .from('reports')
        .select('id')
        .in('student_id', childrenData?.map(child => child.id) || [])
        .gte('generated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Fetch recent activities
      const activities = [];
      
      // Recent reports
      if (reportsData && reportsData.length > 0) {
        activities.push({
          type: 'report',
          message: `${reportsData.length} new report${reportsData.length > 1 ? 's' : ''} available`,
          time: '2 hours ago',
          icon: 'FileText'
        });
      }

      setStats({
        childrenCount: childrenData?.length || 0,
        attendanceRate: totalDays > 0 ? Math.round((totalAttendance / totalDays) * 100) : 0,
        newReports: reportsData?.length || 0,
      });

      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    children,
    recentActivities,
    loading,
    refetch: fetchDashboardData
  };
};