import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Award, 
  BookOpen, 
  Target,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  classPerformance: {
    class_average: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
    grade_distribution: { [grade: string]: number };
  };
  studentRankings: Array<{
    rank: number;
    student_name: string;
    student_number: string;
    total_marks: number;
    average_percentage: number;
    grade: string;
    rank_change: 'up' | 'down' | 'same' | 'new';
  }>;
  subjectStatistics: Array<{
    subject_name: string;
    subject_code: string;
    class_average: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
  }>;
  performanceTrends: Array<{
    term: string;
    class_average: number;
    student_average: number;
    improvement: number;
  }>;
  attendanceData: {
    total_days: number;
    present_days: number;
    absent_days: number;
    attendance_rate: number;
  };
  topPerformers: Array<{
    rank: number;
    student_name: string;
    average_percentage: number;
    grade: string;
  }>;
  improvementAnalysis: Array<{
    student_name: string;
    previous_position: number;
    current_position: number;
    improvement: number;
  }>;
}

interface EnhancedAnalyticsProps {
  classId?: string;
  termId?: string;
  studentId?: string;
  userRole?: string;
  user?: User;
}

const EnhancedAnalytics: React.FC<EnhancedAnalyticsProps> = ({
  classId,
  termId,
  studentId,
  userRole = 'teacher',
  user
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>(termId || '');
  const [selectedClass, setSelectedClass] = useState<string>(classId || '');
  const [selectedStudent, setSelectedStudent] = useState<string>(studentId || '');
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedClass && selectedTerm) {
      loadAnalyticsData();
    }
  }, [selectedTerm, selectedClass, selectedStudent]);

  const fetchInitialData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get teacher's admin_users record
      const { data: teacherData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .single();

      if (!teacherData) {
        toast({
          title: "Error",
          description: "Teacher record not found",
          variant: "destructive",
        });
        return;
      }

      // Fetch teacher's classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_teacher_id', teacherData.id);

      setClasses(classesData || []);

      // Set default class
      if (classesData && classesData.length > 0 && !selectedClass) {
        setSelectedClass(classesData[0].id);
      }

      // Fetch terms
      const { data: termsData } = await supabase
        .from('terms')
        .select('*')
        .order('created_at', { ascending: false });

      setTerms(termsData || []);

      // Set default active term
      const activeTerm = termsData?.find(term => term.is_active);
      if (activeTerm && !selectedTerm) {
        setSelectedTerm(activeTerm.id);
      } else if (termsData && termsData.length > 0 && !selectedTerm) {
        setSelectedTerm(termsData[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load initial data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!selectedClass || !selectedTerm) return;
    
    setIsLoading(true);
    try {
      // Get students in selected class
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .eq('current_class_id', selectedClass);

      if (!students || students.length === 0) {
        setAnalyticsData(null);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Fetch marks for selected term
      const { data: marks } = await supabase
        .from('marks')
        .select(`
          marks, grade,
          students!inner(id, first_name, last_name, student_number),
          subjects!inner(id, name, code)
        `)
        .in('student_id', studentIds)
        .eq('term_id', selectedTerm);

      if (!marks || marks.length === 0) {
        setAnalyticsData(null);
        return;
      }

      // Calculate class performance
      const allScores = marks.map(m => m.marks);
      const classAverage = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      const highestScore = Math.max(...allScores);
      const lowestScore = Math.min(...allScores);
      const passMark = 50;
      const passRate = (allScores.filter(s => s >= passMark).length / allScores.length) * 100;

      // Calculate grade distribution
      const gradeDistribution: { [key: string]: number } = {};
      marks.forEach(mark => {
        const grade = mark.grade || 'N/A';
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      });
      
      // Ensure grade_distribution is always an object (not undefined)
      if (Object.keys(gradeDistribution).length === 0) {
        gradeDistribution['N/A'] = 0;
      }

      // Calculate student rankings
      const studentMap = new Map();
      marks.forEach(mark => {
        const studentId = mark.students.id;
        const studentName = `${mark.students.first_name} ${mark.students.last_name}`;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_name: studentName,
            student_number: mark.students.student_number,
            scores: [],
            grades: []
          });
        }
        studentMap.get(studentId).scores.push(mark.marks);
        studentMap.get(studentId).grades.push(mark.grade);
      });

      const studentRankings = Array.from(studentMap.values())
        .map(student => {
          const average = student.scores.reduce((a: number, b: number) => a + b, 0) / student.scores.length;
          const grade = average >= 80 ? 'A' : average >= 70 ? 'B' : average >= 60 ? 'C' : average >= 50 ? 'D' : 'F';
          return {
            student_name: student.student_name,
            student_number: student.student_number,
            total_marks: student.scores.reduce((a: number, b: number) => a + b, 0),
            average_percentage: Math.round(average),
            grade,
            rank_change: 'same' as const
          };
        })
        .sort((a, b) => b.average_percentage - a.average_percentage)
        .map((student, index) => ({
          ...student,
          rank: index + 1
        }));

      // Calculate subject statistics
      const subjectMap = new Map();
      marks.forEach(mark => {
        const subjectId = mark.subjects.id;
        const subjectName = mark.subjects.name;
        const subjectCode = mark.subjects.code;
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subject_name: subjectName,
            subject_code: subjectCode,
            scores: []
          });
        }
        subjectMap.get(subjectId).scores.push(mark.marks);
      });

      const subjectStatistics = Array.from(subjectMap.values()).map(subject => {
        const scores = subject.scores;
        const average = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        const highest = Math.max(...scores);
        const lowest = Math.min(...scores);
        const passRate = (scores.filter((s: number) => s >= passMark).length / scores.length) * 100;
        return {
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          class_average: Math.round(average),
          highest_score: highest,
          lowest_score: lowest,
          pass_rate: Math.round(passRate)
        };
      });

      // Fetch marks from all terms for performance trends
      const { data: allTermsMarks } = await supabase
        .from('marks')
        .select(`
          marks,
          term_id,
          terms!inner(name, created_at)
        `)
        .in('student_id', studentIds);

      const termMap = new Map();
      if (allTermsMarks) {
        allTermsMarks.forEach((mark: any) => {
          const termId = mark.term_id;
          const termName = mark.terms?.name || 'Unknown';
          if (!termMap.has(termId)) {
            termMap.set(termId, {
              term: termName,
              scores: [],
              created_at: mark.terms?.created_at || ''
            });
          }
          termMap.get(termId).scores.push(mark.marks);
        });
      }

      const performanceTrends = Array.from(termMap.values())
        .map(termData => {
          const average = termData.scores.reduce((a: number, b: number) => a + b, 0) / termData.scores.length;
          return {
            term: termData.term,
            class_average: Math.round(average),
            student_average: Math.round(average),
            improvement: 0
          };
        })
        .sort((a, b) => {
          // Sort by term name or creation date
          return a.term.localeCompare(b.term);
        });

      // Top performers
      const topPerformers = studentRankings.slice(0, 3).map((student, index) => ({
        rank: index + 1,
        student_name: student.student_name,
        average_percentage: student.average_percentage,
        grade: student.grade
      }));

      // Set analytics data
      setAnalyticsData({
        classPerformance: {
          class_average: Math.round(classAverage),
          highest_score: highestScore,
          lowest_score: lowestScore,
          pass_rate: Math.round(passRate),
          grade_distribution: gradeDistribution
        },
        studentRankings,
        subjectStatistics,
        performanceTrends,
        attendanceData: {
          total_days: 0,
          present_days: 0,
          absent_days: 0,
          attendance_rate: 0
        },
        topPerformers,
        improvementAnalysis: []
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRankChangeIcon = (change: string) => {
    switch (change) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getRankChangeColor = (change: string) => {
    switch (change) {
      case 'up':
        return 'bg-green-100 text-green-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const gradeColors = {
    A: '#10B981',
    B: '#3B82F6',
    C: '#F59E0B',
    D: '#EF4444',
    F: '#6B7280'
  };

  const renderOverviewCards = () => {
    if (!analyticsData || !analyticsData.classPerformance) return null;

    const { classPerformance } = analyticsData;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classPerformance.class_average}%</div>
            <p className="text-xs text-muted-foreground">
              Average performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classPerformance.pass_rate}%</div>
            <p className="text-xs text-muted-foreground">
              Students passing (≥50%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classPerformance.highest_score}%</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.studentRankings[0]?.student_name || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.studentRankings.length}</div>
            <p className="text-xs text-muted-foreground">
              Active students
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderGradeDistributionChart = () => {
    if (!analyticsData || !analyticsData.classPerformance || !analyticsData.classPerformance.grade_distribution) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>No grade distribution data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    const { grade_distribution } = analyticsData.classPerformance;
    const data = Object.entries(grade_distribution).map(([grade, count]) => ({
      grade,
      count,
      fill: gradeColors[grade as keyof typeof gradeColors] || '#8884d8'
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ grade, count, percent }) => `${grade}: ${count} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderPerformanceTrendsChart = () => {
    if (!analyticsData || !analyticsData.performanceTrends || analyticsData.performanceTrends.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>No performance trend data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.performanceTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="term" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="class_average"
                stackId="1"
                stroke="#8884d8"
                fill="#8884d8"
                name="Class Average"
              />
              <Area
                type="monotone"
                dataKey="student_average"
                stackId="2"
                stroke="#82ca9d"
                fill="#82ca9d"
                name="Student Average"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderSubjectStatisticsChart = () => {
    if (!analyticsData || !analyticsData.subjectStatistics || analyticsData.subjectStatistics.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <p>No subject statistics data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Subject Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.subjectStatistics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject_name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="class_average" fill="#8884d8" name="Class Average" />
              <Bar dataKey="highest_score" fill="#82ca9d" name="Highest Score" />
              <Bar dataKey="lowest_score" fill="#ffc658" name="Lowest Score" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderStudentRankings = () => {
    if (!analyticsData || !analyticsData.studentRankings || analyticsData.studentRankings.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Student Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4" />
                <p>No student rankings data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.studentRankings.map((student, index) => (
              <div key={student.student_number} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-primary">#{student.rank}</span>
                    {getRankChangeIcon(student.rank_change)}
                  </div>
                  <div>
                    <h4 className="font-semibold">{student.student_name}</h4>
                    <p className="text-sm text-muted-foreground">{student.student_number}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold">{student.average_percentage}%</p>
                    <Badge variant="outline" className={getRankChangeColor(student.rank_change)}>
                      {student.grade}
                    </Badge>
                  </div>
                  <Badge variant="outline" className={getRankChangeColor(student.rank_change)}>
                    {student.rank_change === 'up' && '+'}
                    {student.rank_change === 'down' && '-'}
                    {student.rank_change === 'same' && '='}
                    {student.rank_change === 'new' && 'NEW'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTopPerformers = () => {
    if (!analyticsData || !analyticsData.topPerformers || analyticsData.topPerformers.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <Award className="w-12 h-12 mx-auto mb-4" />
                <p>No top performers data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.topPerformers.map((performer, index) => (
              <div key={performer.student_name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold">{performer.student_name}</h4>
                    <p className="text-sm text-muted-foreground">Average: {performer.average_percentage}%</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {performer.grade}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderImprovementAnalysis = () => {
    if (!analyticsData || !analyticsData.improvementAnalysis || analyticsData.improvementAnalysis.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Improvement Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4" />
                <p>No improvement analysis data available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Improvement Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.improvementAnalysis.map((analysis, index) => (
              <div key={analysis.student_name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{analysis.student_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Position: {analysis.previous_position} → {analysis.current_position}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {analysis.improvement > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <Badge variant="outline" className={analysis.improvement > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {analysis.improvement > 0 ? '+' : ''}{analysis.improvement}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const exportAnalytics = () => {
    // In a real implementation, you would generate and download a report
    toast({
      title: "Export Started",
      description: "Analytics report is being generated...",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
          <p className="text-muted-foreground">Comprehensive analysis of academic performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadAnalyticsData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Class and Term Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Choose class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Select Term</label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger>
              <SelectValue placeholder="Choose term" />
            </SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name} {term.is_active && '(Active)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderGradeDistributionChart()}
            {renderPerformanceTrendsChart()}
          </div>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderStudentRankings()}
            {renderTopPerformers()}
          </div>
          {renderImprovementAnalysis()}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {renderPerformanceTrendsChart()}
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          {renderSubjectStatisticsChart()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAnalytics;
