import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Users, BookOpen, Award, Target, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface PerformanceData {
  subject_name: string;
  average_score: number;
  student_count: number;
  pass_rate: number;
}

interface TrendData {
  term_name: string;
  average_score: number;
  pass_rate: number;
}

interface StudentTrend {
  student_id: string;
  student_name: string;
  terms: { term_name: string; average: number }[];
  trend: 'improving' | 'declining' | 'stable';
}

interface PerformanceAnalyticsProps {
  user?: User;
}

const PerformanceAnalytics = ({ user }: PerformanceAnalyticsProps) => {
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [children, setChildren] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [studentStats, setStudentStats] = useState({
    totalSubjects: 0,
    averageScore: 0,
    passRate: 0,
    bestSubject: '',
    needsImprovement: '',
    classRank: 0,
    totalStudents: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild && selectedTerm) {
      fetchAnalyticsData();
    }
  }, [selectedChild, selectedTerm]);

  const fetchInitialData = async () => {
    if (!user) return;
    
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
        toast({
          title: "Error",
          description: "Parent account not found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Fetch parent's children - parent_user_id references admin_users.id, not auth.users.id
      const { data: childrenData, error: childrenError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .eq('parent_user_id', parentAdminUser.id);

      if (childrenError) throw childrenError;

      // Fetch terms
      const { data: termsData, error: termsError } = await supabase
        .from('terms')
        .select('*')
        .order('start_date', { ascending: false });

      if (termsError) throw termsError;

      setChildren(childrenData || []);
      setTerms(termsData || []);

      // Auto-select first child and active term
      if (childrenData && childrenData.length > 0) {
        setSelectedChild(childrenData[0].id);
      }

      const activeTerm = termsData?.find(term => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      } else if (termsData && termsData.length > 0) {
        setSelectedTerm(termsData[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAnalyticsData = async () => {
    if (!selectedChild || !selectedTerm) return;

    setIsLoading(true);
    try {
      // Fetch performance by subject for the selected child
      const { data: marksData, error: marksError } = await supabase
        .from('marks')
        .select(`
          marks, grade,
          subjects(name),
          terms(name)
        `)
        .eq('student_id', selectedChild)
        .eq('term_id', selectedTerm)
        .order('marks', { ascending: false });

      if (marksError) throw marksError;

      if (!marksData || marksData.length === 0) {
        setPerformanceData([]);
        setTrendData([]);
        setStudentStats({
          totalSubjects: 0,
          averageScore: 0,
          passRate: 0,
          bestSubject: '',
          needsImprovement: ''
        });
        setIsLoading(false);
        return;
      }

      // Process performance data by subject for this child
      const subjectPerformance: { [key: string]: { scores: number[], name: string, grades: string[] } } = {};
      
      marksData.forEach(mark => {
        const subjectName = mark.subjects?.name || 'Unknown';
        if (!subjectPerformance[subjectName]) {
          subjectPerformance[subjectName] = { scores: [], name: subjectName, grades: [] };
        }
        subjectPerformance[subjectName].scores.push(mark.marks);
        if (mark.grade) {
          subjectPerformance[subjectName].grades.push(mark.grade);
        }
      });

      const performanceArray: PerformanceData[] = Object.values(subjectPerformance).map(subject => {
        const average = subject.scores.reduce((sum, score) => sum + score, 0) / subject.scores.length;
        const passCount = subject.scores.filter(score => score >= 50).length;
        const passRate = (passCount / subject.scores.length) * 100;

        return {
          subject_name: subject.name,
          average_score: Number(average.toFixed(1)),
          student_count: 1, // For parent view, this is always 1 (their child)
          pass_rate: Number(passRate.toFixed(1))
        };
      });

      setPerformanceData(performanceArray);

      // Fetch trend data across all terms for this child
      const { data: trendMarksData } = await supabase
        .from('marks')
        .select(`
          marks,
          terms(id, name, created_at)
        `)
        .eq('student_id', selectedChild)
        .order('terms(created_at)', { ascending: true });

      const termTrends: { [key: string]: { scores: number[], name: string } } = {};
      
      trendMarksData?.forEach(mark => {
        const termName = mark.terms?.name || 'Unknown';
        if (!termTrends[termName]) {
          termTrends[termName] = { scores: [], name: termName };
        }
        termTrends[termName].scores.push(mark.marks);
      });

      const trendArray: TrendData[] = Object.values(termTrends).map(term => {
        const average = term.scores.reduce((sum, score) => sum + score, 0) / term.scores.length;
        const passCount = term.scores.filter(score => score >= 50).length;
        const passRate = (passCount / term.scores.length) * 100;

        return {
          term_name: term.name,
          average_score: Number(average.toFixed(1)),
          pass_rate: Number(passRate.toFixed(1))
        };
      });

      setTrendData(trendArray);

      // Calculate student statistics
      const allScores = marksData.map(m => m.marks);
      const averageScore = allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
      const passCount = allScores.filter(score => score >= 50).length;
      const passRate = allScores.length > 0 ? (passCount / allScores.length) * 100 : 0;

      // Find best and worst subjects
      let bestSubject = '';
      let bestScore = 0;
      let worstSubject = '';
      let worstScore = 100;

      performanceArray.forEach(subject => {
        if (subject.average_score > bestScore) {
          bestScore = subject.average_score;
          bestSubject = subject.subject_name;
        }
        if (subject.average_score < worstScore) {
          worstScore = subject.average_score;
          worstSubject = subject.subject_name;
        }
      });

      // Fetch class rank from cumulative_scores or reports
      let classRank = 0;
      let totalStudents = 0;
      
      // Try to get rank from cumulative_scores
      const { data: cumulativeData } = await supabase
        .from('cumulative_scores')
        .select('rank_in_class, average_percentage')
        .eq('student_id', selectedChild)
        .eq('term_id', selectedTerm)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cumulativeData?.rank_in_class) {
        classRank = cumulativeData.rank_in_class;
      }

      // Try to get class size from reports
      const { data: reportData } = await supabase
        .from('reports')
        .select('report_data')
        .eq('student_id', selectedChild)
        .eq('term_id', selectedTerm)
        .maybeSingle();

      if (reportData?.report_data) {
        const report = reportData.report_data as any;
        totalStudents = report.class_size || 0;
        if (report.position) {
          classRank = report.position;
        }
      }

      // If we don't have rank, try to calculate it
      if (!classRank && selectedChild) {
        // Get the student's class
        const { data: studentData } = await supabase
          .from('students')
          .select('current_class_id')
          .eq('id', selectedChild)
          .single();

        if (studentData?.current_class_id) {
          // Get all students in the same class
          const { data: classStudents } = await supabase
            .from('students')
            .select('id')
            .eq('current_class_id', studentData.current_class_id);

          totalStudents = classStudents?.length || 0;

          // Get all marks for students in this class for this term
          const { data: allClassMarks } = await supabase
            .from('marks')
            .select('student_id, marks')
            .eq('term_id', selectedTerm)
            .in('student_id', classStudents?.map(s => s.id) || []);

          if (allClassMarks && allClassMarks.length > 0) {
            // Calculate average for each student
            const studentAverages: { [key: string]: { total: number; count: number } } = {};
            allClassMarks.forEach(mark => {
              if (!studentAverages[mark.student_id]) {
                studentAverages[mark.student_id] = { total: 0, count: 0 };
              }
              studentAverages[mark.student_id].total += mark.marks;
              studentAverages[mark.student_id].count += 1;
            });

            // Calculate average for each student
            const studentAvgScores: { [key: string]: number } = {};
            Object.keys(studentAverages).forEach(studentId => {
              const data = studentAverages[studentId];
              studentAvgScores[studentId] = data.count > 0 ? data.total / data.count : 0;
            });

            // Count how many students have higher averages
            const currentStudentAverage = averageScore;
            const higherScores = Object.values(studentAvgScores).filter(avg => avg > currentStudentAverage).length;
            classRank = higherScores + 1;
          }
        }
      }

      setStudentStats({
        totalSubjects: performanceArray.length,
        averageScore: Number(averageScore.toFixed(1)),
        passRate: Number(passRate.toFixed(1)),
        bestSubject: bestSubject || 'N/A',
        needsImprovement: worstSubject || 'N/A',
        classRank: classRank || 0,
        totalStudents: totalStudents || 0
      });

    } catch (error: any) {
      toast({
        title: "Error fetching analytics data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const gradeDistribution = performanceData.reduce((acc, subject) => {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    
    // This is a simplified calculation - would need actual student data for accurate distribution
    const avg = subject.average_score;
    if (avg >= 80) grades.A = 1;
    else if (avg >= 70) grades.B = 1;
    else if (avg >= 60) grades.C = 1;
    else if (avg >= 50) grades.D = 1;
    else grades.F = 1;

    Object.keys(grades).forEach(grade => {
      if (!acc[grade]) acc[grade] = 0;
      acc[grade] += grades[grade as keyof typeof grades];
    });

    return acc;
  }, {} as { [key: string]: number });

  const gradeChartData = Object.entries(gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
    percentage: performanceData.length > 0 ? (count / performanceData.length) * 100 : 0
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zambian-green">Performance Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Child</label>
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger>
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.length === 0 ? (
                <SelectItem value="no-children" disabled>No children found</SelectItem>
              ) : (
                children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name} {child.last_name} ({child.student_number})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Select Term</label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger>
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  {term.name} {term.is_active && '(Current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedChild && selectedTerm && (
        <>
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zambian-green">{studentStats.totalSubjects}</div>
                <p className="text-xs text-muted-foreground">Subjects with marks</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zambian-green">{studentStats.averageScore}%</div>
                <p className="text-xs text-muted-foreground">Overall performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zambian-green">{studentStats.passRate}%</div>
                <p className="text-xs text-muted-foreground">Subjects scoring 50%+</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Subject</CardTitle>
                <Award className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-zambian-green truncate">{studentStats.bestSubject}</div>
                <p className="text-xs text-muted-foreground">Highest performing</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="subjects" className="space-y-4">
            <TabsList>
              <TabsTrigger value="subjects">Subject Performance</TabsTrigger>
              <TabsTrigger value="trends">Performance Trends</TabsTrigger>
              <TabsTrigger value="distribution">Grade Distribution</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="subjects">
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Subject</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center p-8">Loading analytics data...</div>
                  ) : performanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="subject_name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="average_score" fill="#10b981" name="Average Score %" />
                        <Bar dataKey="pass_rate" fill="#3b82f6" name="Pass Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center p-8 text-gray-600">
                      No performance data available for the selected child and term.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="term_name" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="average_score" stroke="#10b981" strokeWidth={3} name="Average Score %" />
                        <Line type="monotone" dataKey="pass_rate" stroke="#3b82f6" strokeWidth={3} name="Pass Rate %" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center p-8 text-gray-600">
                      Insufficient data to show trends. Need data from multiple terms.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Grade Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gradeChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={gradeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ grade, percentage }) => `${grade}: ${percentage.toFixed(1)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {gradeChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center p-8 text-gray-600">
                        No grade distribution data available.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Grade Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {gradeChartData.map((grade, index) => (
                        <div key={grade.grade} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">Grade {grade.grade}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{grade.count} subjects</div>
                            <div className="text-sm text-gray-600">{grade.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Performance Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Best Subject</h4>
                      <p className="text-green-700">{studentStats.bestSubject || 'No data available'}</p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Overall Average</h4>
                      <p className="text-blue-700 text-2xl font-bold">{studentStats.averageScore}%</p>
                    </div>

                    {studentStats.needsImprovement && studentStats.needsImprovement !== 'N/A' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-800 mb-2">Needs Improvement</h4>
                        <p className="text-orange-700">
                          {studentStats.needsImprovement} may need additional support and practice.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {performanceData.length > 0 && performanceData.some(s => s.average_score < 50) && (
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Focus on Struggling Subjects</p>
                            <p className="text-sm text-gray-600">
                              Subjects with low performance need additional attention and practice at home.
                            </p>
                          </div>
                        </div>
                      )}

                      {studentStats.passRate < 70 && (
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <p className="font-medium">Improve Overall Performance</p>
                            <p className="text-sm text-gray-600">
                              Consider additional tutoring or study time for subjects below 50%.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Monitor Progress</p>
                          <p className="text-sm text-gray-600">
                            Regular assessment and feedback will help maintain and improve performance.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Parent Engagement</p>
                          <p className="text-sm text-gray-600">
                            Share progress reports with parents to encourage home support.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default PerformanceAnalytics;