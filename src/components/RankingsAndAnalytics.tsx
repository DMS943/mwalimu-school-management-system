import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAcademicSettings, calculateGrade } from '@/hooks/useAcademicSettings';
import { 
  Trophy, 
  Medal, 
  Award, 
  Download, 
  RefreshCw, 
  Users, 
  TrendingUp,
  BarChart3,
  LineChart,
  PieChart,
  Target,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StudentRanking {
  student_id: string;
  student_name: string;
  student_number: string;
  class_name: string;
  total_score: number;
  average_percentage: number;
  grade: string;
  rank: number;
  previous_rank?: number;
  rank_change?: number;
  subject_scores: Array<{
    subject_name: string;
    percentage: number;
    grade: string;
  }>;
}

interface SubjectRanking {
  subject_id: string;
  subject_name: string;
  student_rankings: Array<{
    student_id: string;
    student_name: string;
    student_number: string;
    percentage: number;
    grade: string;
    rank: number;
  }>;
  class_average: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
}

interface AnalyticsData {
  totalStudents: number;
  averageScore: number;
  passRate: number;
  gradeDistribution: { [grade: string]: number };
  topPerformers: StudentRanking[];
  improvementTrends: Array<{
    student_name: string;
    improvement: number;
  }>;
}

interface RankingsAndAnalyticsProps {
  user: User;
}

const RankingsAndAnalytics = ({ user }: RankingsAndAnalyticsProps) => {
  const { settings: academicSettings } = useAcademicSettings(user);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [overallRankings, setOverallRankings] = useState<StudentRanking[]>([]);
  const [subjectRankings, setSubjectRankings] = useState<SubjectRanking[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overall' | 'subjects' | 'analytics'>('overall');
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTerm) {
      fetchRankings();
      fetchAnalytics();
    }
  }, [selectedTerm, selectedClass, selectedSubject]);

  const fetchInitialData = async () => {
    try {
      // Get user's admin_users record to determine role
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('school_id, is_super_admin, role')
        .eq('user_id', user.id)
        .single();

      let classesQuery = supabase.from('classes').select('*').order('name');
      let termsQuery = supabase.from('terms').select('*').order('created_at', { ascending: false });
      let subjectsQuery = supabase.from('subjects').select('*').order('name');

      // Handle parent users - only show their children's classes and terms
      if (adminUser && adminUser.role === 'parent') {
        // Get parent's children
        const { data: childrenData } = await supabase
          .from('students')
          .select('current_class_id, school_id')
          .eq('parent_user_id', user.id);

        if (childrenData && childrenData.length > 0) {
          const classIds = [...new Set(childrenData.map(c => c.current_class_id).filter(Boolean))];
          const schoolIds = [...new Set(childrenData.map(c => c.school_id).filter(Boolean))];

          if (classIds.length > 0) {
            classesQuery = classesQuery.in('id', classIds);
          } else {
            classesQuery = classesQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // No classes
          }

          if (schoolIds.length > 0) {
            termsQuery = termsQuery.in('school_id', schoolIds);
            subjectsQuery = subjectsQuery.in('school_id', schoolIds);
          }
        } else {
          // No children linked, return empty
          setTerms([]);
          setClasses([]);
          setSubjects([]);
          return;
        }
      }
      // If not super admin, filter by school
      else if (adminUser && !adminUser.is_super_admin && adminUser.school_id) {
        classesQuery = classesQuery.eq('school_id', adminUser.school_id);
        termsQuery = termsQuery.eq('school_id', adminUser.school_id);
        subjectsQuery = subjectsQuery.eq('school_id', adminUser.school_id);
      }

      const [termsResult, classesResult, subjectsResult] = await Promise.all([
        termsQuery,
        classesQuery,
        subjectsQuery
      ]);

      if (termsResult.error) throw termsResult.error;
      if (classesResult.error) throw classesResult.error;
      if (subjectsResult.error) throw subjectsResult.error;

      setTerms(termsResult.data || []);
      setClasses(classesResult.data || []);
      setSubjects(subjectsResult.data || []);

      // Set default active term
      const activeTerm = termsResult.data?.find(term => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      } else if (termsResult.data && termsResult.data.length > 0) {
        setSelectedTerm(termsResult.data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchRankings = async () => {
    if (!selectedTerm) return;

    setIsLoading(true);
    try {
      // Get user's admin_users record to determine role
      const { data: adminUserData } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      let teacherAdminId: string | null = null;
      let parentChildrenIds: string[] = [];

      if (adminUserData) {
        if (adminUserData.role === 'teacher') {
          teacherAdminId = adminUserData.id;
        } else if (adminUserData.role === 'parent') {
          // Get parent's children
          const { data: childrenData } = await supabase
            .from('students')
            .select('id')
            .eq('parent_user_id', user.id);
          
          if (childrenData && childrenData.length > 0) {
            parentChildrenIds = childrenData.map(c => c.id);
          } else {
            // No children linked, return empty
            setOverallRankings([]);
            setSubjectRankings([]);
            setIsLoading(false);
            return;
          }
        }
      }

      // Build query for cumulative scores
      // First, get cumulative scores with related data
      let query = supabase
        .from('cumulative_scores')
        .select(`
          *,
          students!inner(id, first_name, last_name, student_number, current_class_id),
          subjects!inner(id, name),
          terms!inner(id, name)
        `)
        .eq('term_id', selectedTerm);

      // Filter by subject if selected
      if (selectedSubject && selectedSubject !== 'all') {
        query = query.eq('subject_id', selectedSubject);
      }

      // Get class data separately if filtering by class
      if (selectedClass && selectedClass !== 'all') {
        query = query.eq('students.current_class_id', selectedClass);
      } else if (teacherAdminId) {
        // If teacher, filter by their classes
        const { data: teacherClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('class_teacher_id', teacherAdminId);
        
        if (teacherClasses && teacherClasses.length > 0) {
          const classIds = teacherClasses.map(c => c.id);
          query = query.in('students.current_class_id', classIds);
        } else {
          // Teacher has no classes, return empty
          setOverallRankings([]);
          setSubjectRankings([]);
          setIsLoading(false);
          return;
        }
      }

      // If parent, filter by their children
      if (parentChildrenIds.length > 0) {
        query = query.in('student_id', parentChildrenIds);
      }

      const { data: cumulativeScores, error } = await query;

      if (error) {
        console.error('Error fetching cumulative_scores:', error);
        throw error;
      }

      if (!cumulativeScores || cumulativeScores.length === 0) {
        setOverallRankings([]);
        setSubjectRankings([]);
        setIsLoading(false);
        return;
      }

      // Process overall rankings (average across all subjects per student)
      const studentMap = new Map<string, {
        student_id: string;
        student_name: string;
        student_number: string;
        class_name: string;
        total_score: number;
        total_percentage: number;
        subject_count: number;
        subject_scores: Array<{ subject_name: string; percentage: number; grade: string }>;
        rank: number;
      }>();

      // Get class information for each student
      const studentIds = [...new Set(cumulativeScores.map((cs: any) => cs.student_id))];
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, current_class_id, classes!current_class_id(id, name)')
        .in('id', studentIds);

      const classMap = new Map();
      studentsData?.forEach((student: any) => {
        if (student.classes && Array.isArray(student.classes) && student.classes.length > 0) {
          classMap.set(student.id, student.classes[0]);
        } else if (student.classes && !Array.isArray(student.classes)) {
          classMap.set(student.id, student.classes);
        }
      });

      cumulativeScores.forEach((cs: any) => {
        const studentId = cs.student_id;
        const student = cs.students;
        const classData = classMap.get(studentId) || { name: 'Unknown' };
        const subject = cs.subjects;

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_id: studentId,
            student_name: `${student.first_name} ${student.last_name}`,
            student_number: student.student_number,
            class_name: classData.name,
            total_score: 0,
            total_percentage: 0,
            subject_count: 0,
            subject_scores: [],
            rank: 0
          });
        }

        const studentData = studentMap.get(studentId)!;
        studentData.total_score += cs.total_score || 0;
        studentData.total_percentage += cs.percentage || 0;
        studentData.subject_count += 1;
        studentData.subject_scores.push({
          subject_name: subject.name,
          percentage: cs.percentage || 0,
          grade: cs.grade || 'N/A'
        });
      });

      // Calculate averages and create rankings
      // IMPORTANT: Only count subjects where students have marks
      // Students don't take all subjects, so averages are calculated only from subjects they take
      const rankings: StudentRanking[] = Array.from(studentMap.values())
        .map(student => {
          // Only average subjects the student actually takes (has marks for)
          const avgPercentage = student.subject_count > 0 
            ? Number((student.total_percentage / student.subject_count).toFixed(2))
            : 0;
          
          return {
            student_id: student.student_id,
            student_name: student.student_name,
            student_number: student.student_number,
            class_name: student.class_name,
            total_score: student.total_score,
            average_percentage: avgPercentage,
            grade: student.subject_count > 0 ? calculateGradeLocal(avgPercentage) : 'N/A',
            rank: 0,
            subject_scores: student.subject_scores // Only includes subjects with marks
          };
        })
        .sort((a, b) => b.average_percentage - a.average_percentage);

      // Assign ranks
      rankings.forEach((ranking, index) => {
        if (index > 0 && ranking.average_percentage < rankings[index - 1].average_percentage) {
          ranking.rank = index + 1;
        } else {
          ranking.rank = index === 0 ? 1 : rankings[index - 1].rank;
        }
      });

      setOverallRankings(rankings);

      // Process subject rankings
      const subjectMap = new Map<string, {
        subject_id: string;
        subject_name: string;
        student_rankings: Array<{
          student_id: string;
          student_name: string;
          student_number: string;
          percentage: number;
          grade: string;
          rank: number;
        }>;
        scores: number[];
      }>();

      cumulativeScores.forEach((cs: any) => {
        const subjectId = cs.subjects.id;
        const subjectName = cs.subjects.name;
        const student = cs.students;

        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subject_id: subjectId,
            subject_name: subjectName,
            student_rankings: [],
            scores: []
          });
        }

        const subjectData = subjectMap.get(subjectId)!;
        subjectData.student_rankings.push({
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_number,
          percentage: cs.percentage || 0,
          grade: cs.grade || 'N/A',
          rank: cs.rank_in_class || 0
        });
        subjectData.scores.push(cs.percentage || 0);
      });

      // Sort and assign ranks for each subject
      const subjectRankingsArray: SubjectRanking[] = Array.from(subjectMap.values()).map(subject => {
        subject.student_rankings.sort((a, b) => b.percentage - a.percentage);
        subject.student_rankings.forEach((student, index) => {
          if (index > 0 && student.percentage < subject.student_rankings[index - 1].percentage) {
            student.rank = index + 1;
          } else {
            student.rank = index === 0 ? 1 : subject.student_rankings[index - 1].rank;
          }
        });

        const scores = subject.scores;
        const passCount = scores.filter(s => s >= 50).length;

        return {
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          student_rankings: subject.student_rankings,
          class_average: scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)) : 0,
          highest_score: scores.length > 0 ? Math.max(...scores) : 0,
          lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
          pass_rate: scores.length > 0 ? Number(((passCount / scores.length) * 100).toFixed(2)) : 0
        };
      });

      setSubjectRankings(subjectRankingsArray);

    } catch (error: any) {
      console.error('Error fetching rankings:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: error.message || "Failed to load rankings. Please ensure scores have been entered for the selected term.",
        variant: "destructive",
      });
      setOverallRankings([]);
      setSubjectRankings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedTerm || overallRankings.length === 0) return;

    try {
      // Calculate analytics from rankings
      const totalStudents = overallRankings.length;
      const totalScore = overallRankings.reduce((sum, r) => sum + r.average_percentage, 0);
      const averageScore = totalStudents > 0 ? Number((totalScore / totalStudents).toFixed(2)) : 0;
      const passCount = overallRankings.filter(r => r.average_percentage >= 50).length;
      const passRate = totalStudents > 0 ? Number(((passCount / totalStudents) * 100).toFixed(2)) : 0;

      // Grade distribution
      const gradeDistribution: { [grade: string]: number } = {};
      overallRankings.forEach(r => {
        gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1;
      });

      // Top performers (top 10)
      const topPerformers = overallRankings.slice(0, 10);

      setAnalytics({
        totalStudents,
        averageScore,
        passRate,
        gradeDistribution,
        topPerformers,
        improvementTrends: [] // Can be enhanced with previous term comparison
      });
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  };

  const calculateGrade = (percentage: number): string => {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-zambian-green">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank === 3) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-zambian-green/10 text-zambian-green border-zambian-green/30';
  };

  const exportRankings = () => {
    if (overallRankings.length === 0) {
      toast({
        title: "No data",
        description: "No rankings to export",
        variant: "destructive",
      });
      return;
    }

    let csv = 'Rank,Student Number,Student Name,Class,Average %,Grade,Total Score\n';
    overallRankings.forEach(ranking => {
      csv += `${ranking.rank},${ranking.student_number},"${ranking.student_name}","${ranking.class_name}",${ranking.average_percentage},${ranking.grade},${ranking.total_score}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rankings_${selectedTerm}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Rankings exported to CSV",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zambian-green">Rankings & Analytics</h2>
          <p className="text-gray-600 mt-1">Student performance rankings and detailed analytics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchRankings} 
            disabled={!selectedTerm || isLoading} 
            variant="outline"
            className="border-zambian-green/30 text-zambian-green hover:bg-zambian-green/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={exportRankings} 
            disabled={overallRankings.length === 0}
            className="bg-zambian-green hover:bg-zambian-green/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-zambian-green/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-zambian-green mb-2 block">Academic Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="border-zambian-green/30">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(term => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} ({term.academic_year || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-zambian-green mb-2 block">Class (Optional)</label>
              <Select value={selectedClass || 'all'} onValueChange={setSelectedClass}>
                <SelectTrigger className="border-zambian-green/30">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} (Grade {cls.grade_level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-zambian-green mb-2 block">Subject (Optional)</label>
              <Select value={selectedSubject || 'all'} onValueChange={setSelectedSubject}>
                <SelectTrigger className="border-zambian-green/30">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-zambian-green/10">
          <TabsTrigger value="overall" className="data-[state=active]:bg-zambian-green data-[state=active]:text-white">
            Overall Rankings
          </TabsTrigger>
          <TabsTrigger value="subjects" className="data-[state=active]:bg-zambian-green data-[state=active]:text-white">
            Subject Rankings
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-zambian-green data-[state=active]:text-white">
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overall Rankings Tab */}
        <TabsContent value="overall" className="space-y-6">
          <Card className="border-zambian-green/20">
            <CardHeader>
              <CardTitle className="text-zambian-green flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Overall Student Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 mx-auto mb-4 text-zambian-green animate-spin" />
                  <p className="text-zambian-green">Loading rankings...</p>
                </div>
              ) : overallRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zambian-green/20">
                        <th className="text-left p-3 text-sm font-semibold text-zambian-green">Rank</th>
                        <th className="text-left p-3 text-sm font-semibold text-zambian-green">Student</th>
                        <th className="text-left p-3 text-sm font-semibold text-zambian-green">Class</th>
                        <th className="text-center p-3 text-sm font-semibold text-zambian-green">Average %</th>
                        <th className="text-center p-3 text-sm font-semibold text-zambian-green">Grade</th>
                        <th className="text-center p-3 text-sm font-semibold text-zambian-green">Total Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallRankings.map((ranking, index) => (
                        <tr 
                          key={ranking.student_id} 
                          className={`border-b hover:bg-zambian-green/5 transition-colors ${
                            index < 3 ? 'bg-yellow-50/50' : ''
                          }`}
                        >
                          <td className="p-3">
                            <Badge className={getRankBadgeColor(ranking.rank)}>
                              <div className="flex items-center gap-1">
                                {getRankIcon(ranking.rank)}
                              </div>
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-gray-900">{ranking.student_name}</div>
                              <div className="text-sm text-gray-600">{ranking.student_number}</div>
                            </div>
                          </td>
                          <td className="p-3 text-gray-700">{ranking.class_name}</td>
                          <td className="p-3 text-center">
                            <span className="font-semibold text-zambian-green">
                              {ranking.average_percentage}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge 
                              variant={
                                ranking.grade === 'A' ? 'default' :
                                ranking.grade === 'B' ? 'secondary' :
                                ranking.grade === 'C' ? 'outline' : 'destructive'
                              }
                            >
                              {ranking.grade}
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-gray-700">{ranking.total_score.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-600">No rankings available</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Select a term and ensure scores have been entered for students.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subject Rankings Tab */}
        <TabsContent value="subjects" className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 text-zambian-green animate-spin" />
              <p className="text-zambian-green">Loading subject rankings...</p>
            </div>
          ) : subjectRankings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {subjectRankings.map((subject) => (
                <Card key={subject.subject_id} className="border-zambian-green/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-zambian-green">{subject.subject_name} Rankings</CardTitle>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Class Avg: </span>
                          <span className="font-semibold text-zambian-green">{subject.class_average}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Pass Rate: </span>
                          <span className="font-semibold text-zambian-green">{subject.pass_rate}%</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-zambian-green/20">
                            <th className="text-left p-3 text-sm font-semibold text-zambian-green">Rank</th>
                            <th className="text-left p-3 text-sm font-semibold text-zambian-green">Student</th>
                            <th className="text-center p-3 text-sm font-semibold text-zambian-green">Score %</th>
                            <th className="text-center p-3 text-sm font-semibold text-zambian-green">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subject.student_rankings.slice(0, 20).map((student, index) => (
                            <tr 
                              key={student.student_id}
                              className={`border-b hover:bg-zambian-green/5 ${
                                index < 3 ? 'bg-yellow-50/50' : ''
                              }`}
                            >
                              <td className="p-3">
                                <Badge className={getRankBadgeColor(student.rank)}>
                                  {getRankIcon(student.rank)}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div>
                                  <div className="font-medium text-gray-900">{student.student_name}</div>
                                  <div className="text-sm text-gray-600">{student.student_number}</div>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className="font-semibold text-zambian-green">{student.percentage}%</span>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant={student.grade === 'A' ? 'default' : 'outline'}>
                                  {student.grade}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {subject.student_rankings.length > 20 && (
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        Showing top 20 of {subject.student_rankings.length} students
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-zambian-green/20">
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-600">No subject rankings available</p>
                <p className="text-sm text-gray-500 mt-2">Select a term to view subject-wise rankings.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-zambian-green/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Students</p>
                        <p className="text-3xl font-bold text-zambian-green mt-2">{analytics.totalStudents}</p>
                      </div>
                      <Users className="w-10 h-10 text-zambian-green/30" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zambian-green/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Average Score</p>
                        <p className="text-3xl font-bold text-zambian-green mt-2">{analytics.averageScore}%</p>
                      </div>
                      <Target className="w-10 h-10 text-zambian-green/30" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zambian-green/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Pass Rate</p>
                        <p className="text-3xl font-bold text-zambian-green mt-2">{analytics.passRate}%</p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-zambian-green/30" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-zambian-green/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Top Performers</p>
                        <p className="text-3xl font-bold text-zambian-green mt-2">
                          {analytics.topPerformers.filter(p => p.grade === 'A').length}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Grade A students</p>
                      </div>
                      <Trophy className="w-10 h-10 text-yellow-500/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Grade Distribution */}
              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Grade Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {['A', 'B', 'C', 'D', 'F'].map(grade => (
                      <div key={grade} className="text-center p-4 bg-zambian-green/5 rounded-lg">
                        <div className="text-3xl font-bold text-zambian-green">
                          {analytics.gradeDistribution[grade] || 0}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Grade {grade}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {analytics.totalStudents > 0 
                            ? ((analytics.gradeDistribution[grade] || 0) / analytics.totalStudents * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performers */}
              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Top 10 Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topPerformers.map((performer, index) => (
                      <div 
                        key={performer.student_id}
                        className="flex items-center justify-between p-4 bg-zambian-green/5 rounded-lg hover:bg-zambian-green/10 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Badge className={getRankBadgeColor(performer.rank)}>
                            {getRankIcon(performer.rank)}
                          </Badge>
                          <div>
                            <div className="font-medium text-gray-900">{performer.student_name}</div>
                            <div className="text-sm text-gray-600">{performer.class_name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-zambian-green">{performer.average_percentage}%</div>
                          <Badge variant={performer.grade === 'A' ? 'default' : 'outline'}>
                            Grade {performer.grade}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-zambian-green/20">
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-600">No analytics data available</p>
                <p className="text-sm text-gray-500 mt-2">Select a term and generate rankings to view analytics.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RankingsAndAnalytics;

