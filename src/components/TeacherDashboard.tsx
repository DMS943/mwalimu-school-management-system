 
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart3, BookOpen, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EnhancedScoreManager from '@/components/EnhancedScoreManager';
import PerformanceAnalytics from '@/components/PerformanceAnalytics';
import EnhancedAnalytics from '@/components/EnhancedAnalytics';
import OfflineSyncManager from '@/components/OfflineSyncManager';
import NotificationCenter from '@/components/NotificationCenter';
import ReportsManager from '@/components/ReportsManager';
import { TeacherStudentManager } from '@/components/TeacherStudentManager';
import AttendanceManager from '@/components/AttendanceManager';
import UserSettings from '@/components/UserSettings';

interface TeacherDashboardProps {
  user: User;
  activeTab: string;
}

interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  averagePerformance: number;
  topPerformer: { name: string; score: number } | null;
  recentActivities: Array<{ type: string; message: string; time: string }>;
}

const TeacherDashboard = ({ user, activeTab }: TeacherDashboardProps) => {
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalStudents: 0,
    averagePerformance: 0,
    topPerformer: null,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [teacherAdminId, setTeacherAdminId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      
      // First, get the teacher's admin_users record to get their id
      const { data: teacherData, error: teacherError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .single();

      if (teacherError) throw teacherError;
      if (!teacherData) {
        throw new Error('Teacher record not found');
      }

      setTeacherAdminId(teacherData.id);

      // Fetch classes assigned to this teacher
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          school_id,
          schools (name)
        `)
        .eq('class_teacher_id', teacherData.id);

      if (classesError) throw classesError;
      setTeacherClasses(classesData || []);

      // Fetch statistics
      await fetchDashboardStats(teacherData.id, classesData || []);
    } catch (error: any) {
      console.error('Error fetching teacher data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch teacher data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (adminId: string, classes: any[]) => {
    try {
      const classIds = classes.map(c => c.id);
      
      if (classIds.length === 0) {
        setStats({
          totalClasses: 0,
          totalStudents: 0,
          averagePerformance: 0,
          topPerformer: null,
          recentActivities: []
        });
        return;
      }

      // Fetch total students in teacher's classes
      const { count: studentCount, error: studentError } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .in('current_class_id', classIds);

      if (studentError) throw studentError;

      // Fetch scores for students in teacher's classes to calculate average performance
      // First get student IDs in these classes
      const { data: studentsInClasses, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, current_class_id')
        .in('current_class_id', classIds);

      if (studentsError) throw studentsError;

      const studentIds = (studentsInClasses || []).map(s => s.id);

      if (studentIds.length === 0) {
        setStats({
          totalClasses: classes.length,
          totalStudents: studentCount || 0,
          averagePerformance: 0,
          topPerformer: null,
          recentActivities: []
        });
        return;
      }

      // Fetch scores using cumulative_scores (more reliable for averages)
      const { data: cumulativeScores, error: cumulativeError } = await supabase
        .from('cumulative_scores')
        .select(`
          percentage,
          students!inner (
            id,
            first_name,
            last_name
          )
        `)
        .in('student_id', studentIds);

      if (cumulativeError) {
        console.error('Error fetching cumulative scores:', cumulativeError);
        // Fallback to scores table if cumulative_scores fails
        const { data: scoresData, error: scoresError } = await supabase
          .from('scores')
          .select(`
            score_value,
            percentage,
            students!inner (
              id,
              first_name,
              last_name
            )
          `)
          .in('student_id', studentIds);

        if (scoresError) throw scoresError;

        // Calculate average performance
        let averagePerformance = 0;
        if (scoresData && scoresData.length > 0) {
          const totalScore = scoresData.reduce((sum, s) => sum + (s.percentage || 0), 0);
          averagePerformance = Math.round((totalScore / scoresData.length) * 10) / 10;
        }

        // Find top performer
        const studentScores: { [key: string]: { name: string; total: number; count: number } } = {};
        scoresData?.forEach((score: any) => {
          const student = score.students;
          if (student) {
            const studentId = student.id;
            const studentName = `${student.first_name} ${student.last_name}`;
            if (!studentScores[studentId]) {
              studentScores[studentId] = { name: studentName, total: 0, count: 0 };
            }
            studentScores[studentId].total += score.percentage || 0;
            studentScores[studentId].count += 1;
          }
        });

        let topPerformer: { name: string; score: number } | null = null;
        Object.values(studentScores).forEach(student => {
          const avg = student.count > 0 ? student.total / student.count : 0;
          if (!topPerformer || avg > topPerformer.score) {
            topPerformer = { name: student.name, score: Math.round(avg * 10) / 10 };
          }
        });

        // Fetch recent activities from scores
        const { data: recentScores, error: recentError } = await supabase
          .from('scores')
          .select(`
            created_at,
            students!inner (
              current_class_id
            ),
            assessments!inner (
              subjects (name),
              classes (name)
            )
          `)
          .in('student_id', studentIds)
          .order('created_at', { ascending: false })
          .limit(5);

        const recentActivities = (recentScores || []).map((score: any) => {
          const className = score.assessments?.classes?.name || 'Class';
          const subjectName = score.assessments?.subjects?.name || 'Subject';
          const timeAgo = getTimeAgo(new Date(score.created_at));
          return {
            type: 'score',
            message: `Marks updated for ${subjectName} in ${className}`,
            time: timeAgo
          };
        });

        setStats({
          totalClasses: classes.length,
          totalStudents: studentCount || 0,
          averagePerformance,
          topPerformer,
          recentActivities
        });
        return;
      }

      // Calculate average performance from cumulative_scores
      let averagePerformance = 0;
      if (cumulativeScores && cumulativeScores.length > 0) {
        const totalScore = cumulativeScores.reduce((sum, s) => sum + (s.percentage || 0), 0);
        averagePerformance = Math.round((totalScore / cumulativeScores.length) * 10) / 10;
      }

      // Find top performer
      const studentScores: { [key: string]: { name: string; total: number; count: number } } = {};
      cumulativeScores?.forEach((score: any) => {
        const student = score.students;
        if (student) {
          const studentId = student.id;
          const studentName = `${student.first_name} ${student.last_name}`;
          if (!studentScores[studentId]) {
            studentScores[studentId] = { name: studentName, total: 0, count: 0 };
          }
          studentScores[studentId].total += score.percentage || 0;
          studentScores[studentId].count += 1;
        }
      });

      let topPerformer: { name: string; score: number } | null = null;
      Object.values(studentScores).forEach(student => {
        const avg = student.count > 0 ? student.total / student.count : 0;
        if (!topPerformer || avg > topPerformer.score) {
          topPerformer = { name: student.name, score: Math.round(avg * 10) / 10 };
        }
      });

      // Fetch recent activities from cumulative_scores
      const { data: recentScores, error: recentError } = await supabase
        .from('cumulative_scores')
        .select(`
          created_at,
          students!inner (
            current_class_id
          ),
          subjects (name)
        `)
        .in('student_id', studentIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Error fetching recent activities:', recentError);
      }

      // Get class names for recent activities
      const classMap = new Map(classes.map(c => [c.id, c.name]));
      const recentActivities = (recentScores || []).map((score: any) => {
        const classId = score.students?.current_class_id;
        const className = classMap.get(classId) || 'Class';
        const subjectName = score.subjects?.name || 'Subject';
        const timeAgo = getTimeAgo(new Date(score.created_at));
        return {
          type: 'score',
          message: `Marks updated for ${subjectName} in ${className}`,
          time: timeAgo
        };
      });

      setStats({
        totalClasses: classes.length,
        totalStudents: studentCount || 0,
        averagePerformance,
        topPerformer,
        recentActivities
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-zambian-green/30 border-t-zambian-green rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-zambian-green font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'students':
        return <TeacherStudentManager user={user} />;
      case 'attendance':
        return <AttendanceManager user={user} />;
      case 'score-management':
        return <EnhancedScoreManager user={user} />;
      case 'reports':
        return <ReportsManager user={user} />;
      case 'analytics':
        return <EnhancedAnalytics userRole="teacher" user={user} classId={teacherClasses[0]?.id} />;
      case 'offline-sync':
        return <OfflineSyncManager />;
      case 'notifications':
        return <NotificationCenter />;
      case 'settings':
        return <UserSettings user={user} userRole="teacher" />;
      case 'overview':
      default:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zambian-green">Total Classes</CardTitle>
                  <BookOpen className="h-4 w-4 text-zambian-red" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zambian-green">{teacherClasses.length}</div>
                  <p className="text-xs text-zambian-red">Active classes</p>
                </CardContent>
              </Card>

              <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zambian-green">Students</CardTitle>
                  <Users className="h-4 w-4 text-zambian-red" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zambian-green">{stats.totalStudents}</div>
                  <p className="text-xs text-zambian-red">Total students</p>
                </CardContent>
              </Card>

              <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zambian-green">Active Classes</CardTitle>
                  <Calendar className="h-4 w-4 text-zambian-red" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zambian-green">{stats.totalClasses}</div>
                  <p className="text-xs text-zambian-red">Assigned classes</p>
                </CardContent>
              </Card>

              <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zambian-green">Performance</CardTitle>
                  <BarChart3 className="h-4 w-4 text-zambian-red" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zambian-green">{stats.averagePerformance}%</div>
                  <p className="text-xs text-zambian-red">Average score</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-zambian-red">Average Class Score:</span>
                      <span className="font-semibold text-zambian-green">{stats.averagePerformance}%</span>
                    </div>
                    {stats.topPerformer ? (
                      <div className="flex justify-between">
                        <span className="text-sm text-zambian-red">Top Performer:</span>
                        <span className="font-semibold text-zambian-green">{stats.topPerformer.name} - {stats.topPerformer.score}%</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-sm text-zambian-red">Top Performer:</span>
                        <span className="font-semibold text-zambian-green">No data yet</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green">Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recentActivities.length > 0 ? (
                      stats.recentActivities.map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-zambian-green/5 rounded-lg">
                          <BookOpen className="w-4 h-4 text-zambian-green" />
                          <div>
                            <p className="text-sm font-medium text-zambian-green">{activity.message}</p>
                            <p className="text-xs text-zambian-red">{activity.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-zambian-green/5 rounded-lg">
                        <Clock className="w-4 h-4 text-zambian-green" />
                        <div>
                          <p className="text-sm font-medium text-zambian-green">No recent activities</p>
                          <p className="text-xs text-zambian-red">Activities will appear here</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
                      <BookOpen className="w-6 h-6 text-zambian-green mb-2" />
                      <p className="text-sm font-medium text-zambian-green">Manage Scores</p>
                    </button>
                    <button className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
                      <BarChart3 className="w-6 h-6 text-zambian-green mb-2" />
                      <p className="text-sm font-medium text-zambian-green">Performance Analytics</p>
                    </button>
                    <button className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors">
                      <Users className="w-6 h-6 text-zambian-green mb-2" />
                      <p className="text-sm font-medium text-zambian-green">Generate Reports</p>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};

export default TeacherDashboard;
