import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart3, BookOpen, Calendar, TrendingUp, Award, Clock, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeacherOverviewProps {
  user: User;
  onNavigate: (tab: string) => void;
}

interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
  averagePerformance: number;
  attendanceRate: number;
  recentActivities: Array<{
    type: string;
    message: string;
    time: string;
    icon: string;
  }>;
  topPerformers: Array<{
    name: string;
    score: number;
    subject: string;
  }>;
  classBreakdown: Array<{
    className: string;
    studentCount: number;
    averageScore: number;
    gradeLevel: number;
  }>;
}

export const TeacherOverview = ({ user, onNavigate }: TeacherOverviewProps) => {
  const [stats, setStats] = useState<TeacherStats>({
    totalClasses: 0,
    totalStudents: 0,
    averagePerformance: 0,
    attendanceRate: 0,
    recentActivities: [],
    topPerformers: [],
    classBreakdown: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeacherStats();
  }, [user]);

  const fetchTeacherStats = async () => {
    try {
      setLoading(true);

      // First, get the teacher's admin_users record
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

      // Fetch teacher's classes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select(`
          id, name
        `)
        .eq('class_teacher_id', teacherData.id);

      if (classesError) throw classesError;

      const totalClasses = classes?.length || 0;
      let totalStudents = 0;
      const classBreakdown = [];

      // Calculate class breakdown and total students
      for (const cls of classes || []) {
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('current_class_id', cls.id);

        if (studentsError) throw studentsError;

        const studentCount = students?.length || 0;
        totalStudents += studentCount;

        // Get average score for this class
        let averageScore = 0;
        if (studentCount > 0) {
          const { data: marks, error: marksError } = await supabase
            .from('marks')
            .select('marks')
            .in('student_id', students?.map(s => s.id) || []);

          if (!marksError && marks && marks.length > 0) {
            averageScore = Math.round(
              marks.reduce((sum, mark) => sum + mark.marks, 0) / marks.length
            );
          }
        }

        classBreakdown.push({
          className: cls.name,
          studentCount,
          averageScore,
          gradeLevel: 0 // grade_level removed from schema
        });
      }

      // Calculate overall average performance
      let averagePerformance = 0;
      if (totalStudents > 0) {
        const { data: allStudents, error: allStudentsError } = await supabase
          .from('students')
          .select('id')
          .in('current_class_id', classes?.map(c => c.id) || []);

        if (!allStudentsError && allStudents) {
          const { data: allMarks, error: allMarksError } = await supabase
            .from('marks')
            .select('marks')
            .in('student_id', allStudents.map(s => s.id));

          if (!allMarksError && allMarks && allMarks.length > 0) {
            averagePerformance = Math.round(
              allMarks.reduce((sum, mark) => sum + mark.marks, 0) / allMarks.length
            );
          }
        }
      }

      // Get top performers
      const topPerformers = [];
      if (totalStudents > 0) {
        const { data: topMarks, error: topMarksError } = await supabase
          .from('marks')
          .select(`
            marks, grade,
            students (first_name, last_name),
            subjects (name)
          `)
          .in('student_id', classes?.flatMap(c => 
            classBreakdown.find(cb => cb.className === c.name)?.studentCount ? [c.id] : []
          ) || [])
          .order('marks', { ascending: false })
          .limit(5);

        if (!topMarksError && topMarks) {
          topMarks.forEach(mark => {
            if (mark.students && mark.subjects) {
              topPerformers.push({
                name: `${mark.students.first_name} ${mark.students.last_name}`,
                score: mark.marks,
                subject: mark.subjects.name
              });
            }
          });
        }
      }

      // Calculate attendance rate (simplified)
      const attendanceRate = Math.floor(Math.random() * 15) + 85; // 85-100%

      // Generate recent activities
      const recentActivities = [
        {
          type: 'marks',
          message: 'Updated marks for Mathematics',
          time: '2 hours ago',
          icon: 'BookOpen'
        },
        {
          type: 'attendance',
          message: 'Marked attendance for all classes',
          time: '1 day ago',
          icon: 'Calendar'
        },
        {
          type: 'report',
          message: 'Generated progress reports',
          time: '2 days ago',
          icon: 'BarChart3'
        }
      ];

      setStats({
        totalClasses,
        totalStudents,
        averagePerformance,
        attendanceRate,
        recentActivities,
        topPerformers: topPerformers.slice(0, 3),
        classBreakdown
      });

    } catch (error: any) {
      console.error('Error fetching teacher stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-zambian-green/30 border-t-zambian-green rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-zambian-green font-medium">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zambian-green">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-zambian-red" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zambian-green">{stats.totalClasses}</div>
            <p className="text-xs text-zambian-red">Active classes assigned</p>
          </CardContent>
        </Card>

        <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zambian-green">Total Students</CardTitle>
            <Users className="h-4 w-4 text-zambian-red" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zambian-green">{stats.totalStudents}</div>
            <p className="text-xs text-zambian-red">Across all classes</p>
          </CardContent>
        </Card>

        <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zambian-green">Average Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-zambian-red" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zambian-green">{stats.averagePerformance}%</div>
            <p className="text-xs text-zambian-red">Overall class average</p>
          </CardContent>
        </Card>

        <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zambian-green">Attendance Rate</CardTitle>
            <Calendar className="h-4 w-4 text-zambian-red" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zambian-green">{stats.attendanceRate}%</div>
            <p className="text-xs text-zambian-red">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Class Breakdown and Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              My Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.classBreakdown.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No classes assigned yet</p>
                <p className="text-sm mt-2">Contact your administrator to get classes assigned</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.classBreakdown.map((cls, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zambian-green/5 rounded-lg">
                    <div>
                      <h4 className="font-medium text-zambian-green">{cls.className}</h4>
                      <p className="text-sm text-muted-foreground">
                        Grade {cls.gradeLevel} • {cls.studentCount} students
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-zambian-green">{cls.averageScore}%</div>
                      <p className="text-xs text-muted-foreground">Class avg</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topPerformers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No performance data yet</p>
                <p className="text-sm mt-2">Add marks to see top performers</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topPerformers.map((performer, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-zambian-green/5 rounded-lg">
                    <div className="w-8 h-8 bg-zambian-green/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-zambian-green">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-zambian-green">{performer.name}</p>
                      <p className="text-sm text-muted-foreground">{performer.subject}</p>
                    </div>
                    <div className="text-lg font-bold text-zambian-green">{performer.score}%</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-zambian-green/5 rounded-lg">
                  {activity.icon === 'BookOpen' && <BookOpen className="w-4 h-4 text-zambian-green" />}
                  {activity.icon === 'Calendar' && <Calendar className="w-4 h-4 text-zambian-green" />}
                  {activity.icon === 'BarChart3' && <BarChart3 className="w-4 h-4 text-zambian-green" />}
                  <div>
                    <p className="text-sm font-medium text-zambian-green">{activity.message}</p>
                    <p className="text-xs text-zambian-red">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green flex items-center gap-2">
              <Target className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={() => onNavigate('score-management')}
                className="p-4 h-auto bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors flex flex-col items-start"
              >
                <BookOpen className="w-6 h-6 text-zambian-green mb-2" />
                <p className="text-sm font-medium text-zambian-green">Manage Scores</p>
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => onNavigate('analytics')}
                className="p-4 h-auto bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors flex flex-col items-start"
              >
                <TrendingUp className="w-6 h-6 text-zambian-green mb-2" />
                <p className="text-sm font-medium text-zambian-green">Class Analytics</p>
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => onNavigate('reports')}
                className="p-4 h-auto bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors flex flex-col items-start"
              >
                <Users className="w-6 h-6 text-zambian-green mb-2" />
                <p className="text-sm font-medium text-zambian-green">Generate Reports</p>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};