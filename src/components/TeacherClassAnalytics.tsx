import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, BookOpen, Award, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeacherClassAnalyticsProps {
  user: User;
}

interface ClassData {
  id: string;
  name: string;
  student_count: number;
}

interface AnalyticsData {
  subjectPerformance: Array<{
    subject: string;
    average: number;
    highest: number;
    lowest: number;
    studentCount: number;
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  performanceTrend: Array<{
    month: string;
    average: number;
    attendance: number;
  }>;
  studentPerformance: Array<{
    name: string;
    average: number;
    trend: 'up' | 'down' | 'stable';
    subjects: number;
  }>;
  classComparison: Array<{
    className: string;
    average: number;
    studentCount: number;
  }>;
}

const COLORS = ['#006633', '#FF6B35', '#F7931E', '#000000', '#8B4513'];

export const TeacherClassAnalytics = ({ user }: TeacherClassAnalyticsProps) => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [terms, setTerms] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    subjectPerformance: [],
    gradeDistribution: [],
    performanceTrend: [],
    studentPerformance: [],
    classComparison: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedClass && selectedTerm) {
      fetchAnalytics();
    }
  }, [selectedClass, selectedTerm]);

  const fetchInitialData = async () => {
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
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_teacher_id', teacherData.id);

      if (classesError) throw classesError;

      // Get student counts for each class
      const classesWithCounts = await Promise.all(
        (classesData || []).map(async (cls) => {
          const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('id')
            .eq('current_class_id', cls.id);

          if (studentsError) throw studentsError;

          return {
            ...cls,
            student_count: students?.length || 0
          };
        })
      );

      setClasses(classesWithCounts);

      // Set default class
      if (classesWithCounts.length > 0) {
        setSelectedClass(classesWithCounts[0].id);
      }

      // Fetch terms
      const { data: termsData, error: termsError } = await supabase
        .from('terms')
        .select('*')
        .order('created_at', { ascending: false });

      if (termsError) throw termsError;
      setTerms(termsData || []);

      // Set default active term
      const activeTerm = termsData?.find(term => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      } else if (termsData && termsData.length > 0) {
        setSelectedTerm(termsData[0].id);
      }

    } catch (error: any) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load class data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Get students in selected class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('current_class_id', selectedClass);

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setAnalytics({
          subjectPerformance: [],
          gradeDistribution: [],
          performanceTrend: [],
          studentPerformance: [],
          classComparison: []
        });
        return;
      }

      const studentIds = students.map(s => s.id);

      // Fetch marks for selected term
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select(`
          marks, grade,
          students (first_name, last_name),
          subjects (name, code)
        `)
        .in('student_id', studentIds)
        .eq('term_id', selectedTerm);

      if (marksError) throw marksError;

      // Process subject performance
      const subjectMap = new Map();
      marks?.forEach(mark => {
        const subjectName = mark.subjects?.name || 'Unknown';
        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, {
            subject: subjectName,
            scores: [],
            studentCount: 0
          });
        }
        subjectMap.get(subjectName).scores.push(mark.marks);
      });

      const subjectPerformance = Array.from(subjectMap.values()).map(subject => ({
        subject: subject.subject,
        average: Math.round(subject.scores.reduce((a, b) => a + b, 0) / subject.scores.length),
        highest: Math.max(...subject.scores),
        lowest: Math.min(...subject.scores),
        studentCount: subject.scores.length
      }));

      // Process grade distribution
      const gradeMap = new Map();
      marks?.forEach(mark => {
        const grade = mark.grade || 'N/A';
        gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);
      });

      const totalMarks = marks?.length || 1;
      const gradeDistribution = Array.from(gradeMap.entries()).map(([grade, count]) => ({
        grade,
        count,
        percentage: Math.round((count / totalMarks) * 100)
      }));

      // Generate performance trend from real data
      // Fetch marks from all terms for this class to show trend
      const { data: allTermsMarks, error: trendError } = await supabase
        .from('marks')
        .select(`
          marks,
          term_id,
          terms!inner(name, created_at)
        `)
        .in('student_id', studentIds);

      // Group marks by term and calculate averages
      const termPerformanceMap = new Map<string, { termName: string; scores: number[]; termId: string; created_at?: string }>();
      
      if (allTermsMarks && allTermsMarks.length > 0) {
        allTermsMarks.forEach((mark: any) => {
          const termId = mark.term_id;
          const termName = mark.terms?.name || 'Unknown';
          const termCreatedAt = mark.terms?.created_at || '';
          
          if (!termPerformanceMap.has(termId)) {
            termPerformanceMap.set(termId, {
              termName,
              scores: [],
              termId,
              created_at: termCreatedAt
            });
          }
          termPerformanceMap.get(termId)!.scores.push(mark.marks);
        });
      }

      // Convert to array and calculate averages, then sort by term creation date
      const performanceTrendData = Array.from(termPerformanceMap.values())
        .map(termData => ({
          month: termData.termName,
          average: termData.scores.length > 0
            ? Math.round(termData.scores.reduce((a: number, b: number) => a + b, 0) / termData.scores.length)
            : 0,
          attendance: 0, // Attendance data not available in current schema
          created_at: termData.created_at || ''
        }))
        .sort((a, b) => {
          // Sort by term creation date (oldest first)
          if (a.created_at && b.created_at) {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
          return a.month.localeCompare(b.month);
        })
        .slice(-6); // Get last 6 terms for readability

      // If no trend data, show placeholder
      const performanceTrend = performanceTrendData.length > 0 
        ? performanceTrendData 
        : [{ month: 'No Data', average: 0, attendance: 0 }];

      // Process student performance
      const studentMap = new Map();
      marks?.forEach(mark => {
        const studentName = `${mark.students?.first_name} ${mark.students?.last_name}`;
        if (!studentMap.has(studentName)) {
          studentMap.set(studentName, {
            name: studentName,
            scores: [],
            subjects: 0
          });
        }
        studentMap.get(studentName).scores.push(mark.marks);
        studentMap.get(studentName).subjects++;
      });

      const studentPerformance = Array.from(studentMap.values()).map(student => ({
        name: student.name,
        average: Math.round(student.scores.reduce((a, b) => a + b, 0) / student.scores.length),
        trend: 'stable' as 'up' | 'down' | 'stable', // Would need historical data for real trend
        subjects: student.subjects
      })).sort((a, b) => b.average - a.average);

      // Get class comparison data
      const classComparison = await Promise.all(
        classes.map(async (cls) => {
          const { data: classStudents } = await supabase
            .from('students')
            .select('id')
            .eq('current_class_id', cls.id);

          if (!classStudents || classStudents.length === 0) {
            return {
              className: cls.name,
              average: 0,
              studentCount: 0
            };
          }

          const { data: classMarks } = await supabase
            .from('marks')
            .select('marks')
            .in('student_id', classStudents.map(s => s.id))
            .eq('term_id', selectedTerm);

          const average = classMarks && classMarks.length > 0
            ? Math.round(classMarks.reduce((sum, mark) => sum + mark.marks, 0) / classMarks.length)
            : 0;

          return {
            className: cls.name,
            average,
            studentCount: classStudents.length
          };
        })
      );

      setAnalytics({
        subjectPerformance,
        gradeDistribution,
        performanceTrend,
        studentPerformance,
        classComparison
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
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
          <div className="text-lg text-zambian-green font-medium">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-zambian-green mb-2">No Classes Assigned</h3>
        <p className="text-muted-foreground">You don't have any classes assigned yet. Contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choose class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.student_count} students)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Select Term</label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Choose term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={fetchAnalytics} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Class Average</p>
                <p className="text-2xl font-bold text-zambian-green">
                  {analytics.subjectPerformance.length > 0
                    ? Math.round(analytics.subjectPerformance.reduce((sum, s) => sum + s.average, 0) / analytics.subjectPerformance.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-zambian-green" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold text-zambian-green">
                  {analytics.studentPerformance[0]?.average || 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {analytics.studentPerformance[0]?.name || 'No data'}
                </p>
              </div>
              <Award className="h-8 w-8 text-zambian-orange" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students</p>
                <p className="text-2xl font-bold text-zambian-green">
                  {classes.find(c => c.id === selectedClass)?.student_count || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-zambian-red" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subjects</p>
                <p className="text-2xl font-bold text-zambian-green">
                  {analytics.subjectPerformance.length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-zambian-black" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#006633" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                  <p>No subject data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, percentage }) => `${grade}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                  <p>No grade data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend and Student Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#006633" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Students */}
        <Card>
          <CardHeader>
            <CardTitle>Student Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.studentPerformance.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {analytics.studentPerformance.slice(0, 10).map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-zambian-green/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zambian-green/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-zambian-green">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-zambian-green">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.subjects} subjects</p>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-zambian-green">{student.average}%</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p>No student data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Class Comparison */}
      {analytics.classComparison.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Class Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.classComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="className" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="average" fill="#006633" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};