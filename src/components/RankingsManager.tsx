import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAcademicSettings, calculateGrade } from '@/hooks/useAcademicSettings';
import { Trophy, Medal, Award, Download, RefreshCw, Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StudentRanking {
  student_id: string;
  student_name: string;
  student_number: string;
  class_name: string;
  total_marks: number;
  average_percentage: number;
  grade: string;
  rank: number;
  previous_rank?: number;
  rank_change?: 'up' | 'down' | 'same' | 'new';
  subject_scores: { [subject: string]: number };
}

interface SubjectRanking {
  subject_id: string;
  subject_name: string;
  student_rankings: {
    student_id: string;
    student_name: string;
    student_number: string;
    marks: number;
    grade: string;
    rank: number;
  }[];
  class_average: number;
  highest_score: number;
  lowest_score: number;
}

interface RankingsManagerProps {
  user?: any;
}

const RankingsManager = ({ user }: RankingsManagerProps) => {
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [grades, setGrades] = useState<number[]>([]);
  const [overallRankings, setOverallRankings] = useState<StudentRanking[]>([]);
  const [subjectRankings, setSubjectRankings] = useState<SubjectRanking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTerm) {
      generateRankings();
    }
  }, [selectedTerm, selectedClass, selectedGrade]);

  const fetchInitialData = async () => {
    try {
      // Build classes query based on user role
      let classesQuery = supabase.from('classes').select('*').order('name');
      
      // If user is a teacher, only show their assigned classes
      if (user && user.id) {
        // First get the teacher's admin_users record
        const { data: teacherData, error: teacherError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('role', 'teacher')
          .single();

        if (!teacherError && teacherData) {
          classesQuery = classesQuery.eq('class_teacher_id', teacherData.id);
        }
      }

      const [termsResult, classesResult] = await Promise.all([
        supabase.from('terms').select('*').order('start_date', { ascending: false }),
        classesQuery
      ]);

      if (termsResult.error) throw termsResult.error;
      if (classesResult.error) throw classesResult.error;

      setTerms(termsResult.data || []);
      setClasses(classesResult.data || []);

      // Extract unique grade levels
      const uniqueGrades = [...new Set((classesResult.data || []).map(c => c.grade_level))].sort((a, b) => a - b);
      setGrades(uniqueGrades);

      // Set default active term
      const activeTerm = termsResult.data?.find(term => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateRankings = async () => {
    if (!selectedTerm) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('marks')
        .select(`
          marks,
          grade,
          students!inner(
            id,
            first_name,
            last_name,
            student_number,
            classes!inner(
              id,
              name,
              grade_level
            )
          ),
          subjects(
            id,
            name,
            code
          )
        `)
        .eq('term_id', selectedTerm);

      // Apply filters
      if (selectedClass) {
        query = query.eq('students.class_id', selectedClass);
      }
      if (selectedGrade) {
        query = query.eq('students.classes.grade_level', parseInt(selectedGrade));
      }

      const { data: marksData, error } = await query;
      if (error) throw error;

      // Process overall rankings
      const studentData: { [key: string]: {
        student: any;
        marks: number[];
        subjects: { [key: string]: number };
        total: number;
      } } = {};

      marksData?.forEach(mark => {
        const studentId = mark.students.id;
        if (!studentData[studentId]) {
          studentData[studentId] = {
            student: mark.students,
            marks: [],
            subjects: {},
            total: 0
          };
        }
        studentData[studentId].marks.push(mark.marks);
        studentData[studentId].subjects[mark.subjects?.name || 'Unknown'] = mark.marks;
        studentData[studentId].total += mark.marks;
      });

      // Calculate rankings
      const rankings: StudentRanking[] = Object.entries(studentData).map(([studentId, data]) => {
        const average = data.marks.length > 0 ? data.total / data.marks.length : 0;
        const grade = calculateGradeLocal(average);

        return {
          student_id: studentId,
          student_name: `${data.student.first_name} ${data.student.last_name}`,
          student_number: data.student.student_number,
          class_name: data.student.classes.name,
          total_marks: data.total,
          average_percentage: Number(average.toFixed(2)),
          grade,
          rank: 0, // Will be set after sorting
          subject_scores: data.subjects
        };
      });

      // Sort by average percentage (descending) and assign ranks
      rankings.sort((a, b) => {
        if (b.average_percentage === a.average_percentage) {
          // Tie-breaker: use total marks
          return b.total_marks - a.total_marks;
        }
        return b.average_percentage - a.average_percentage;
      });

      // Assign ranks with tie handling
      let currentRank = 1;
      for (let i = 0; i < rankings.length; i++) {
        if (i > 0 && rankings[i].average_percentage < rankings[i - 1].average_percentage) {
          currentRank = i + 1;
        }
        rankings[i].rank = currentRank;
      }

      setOverallRankings(rankings);

      // Process subject rankings
      const subjectData: { [key: string]: {
        subject_id: string;
        subject_name: string;
        students: { student_id: string; student_name: string; student_number: string; marks: number; grade: string }[];
      } } = {};

      marksData?.forEach(mark => {
        const subjectId = mark.subjects?.id || 'unknown';
        const subjectName = mark.subjects?.name || 'Unknown';
        
        if (!subjectData[subjectId]) {
          subjectData[subjectId] = {
            subject_id: subjectId,
            subject_name: subjectName,
            students: []
          };
        }

        subjectData[subjectId].students.push({
          student_id: mark.students.id,
          student_name: `${mark.students.first_name} ${mark.students.last_name}`,
          student_number: mark.students.student_number,
          marks: mark.marks,
          grade: mark.grade
        });
      });

      const subjectRankingsArray: SubjectRanking[] = Object.values(subjectData).map(subject => {
        // Sort students by marks (descending)
        subject.students.sort((a, b) => b.marks - a.marks);
        
        // Assign ranks
        const rankedStudents = subject.students.map((student, index) => ({
          ...student,
          rank: index + 1
        }));

        // Calculate statistics
        const scores = subject.students.map(s => s.marks);
        const classAverage = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
        const highestScore = Math.max(...scores, 0);
        const lowestScore = Math.min(...scores, 0);

        return {
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          student_rankings: rankedStudents,
          class_average: Number(classAverage.toFixed(1)),
          highest_score: highestScore,
          lowest_score: lowestScore
        };
      });

      setSubjectRankings(subjectRankingsArray);
      setLastUpdated(new Date());

      toast({
        title: "Rankings generated successfully",
        description: `Processed ${rankings.length} students across ${subjectRankingsArray.length} subjects`,
      });

    } catch (error: any) {
      toast({
        title: "Error generating rankings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateGradeLocal = (percentage: number): string => {
    return calculateGrade(percentage, academicSettings.grade_scale);
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-amber-600 text-white';
    if (rank <= 10) return 'bg-blue-500 text-white';
    return 'bg-gray-200 text-gray-800';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4" />;
    if (rank === 2) return <Medal className="w-4 h-4" />;
    if (rank === 3) return <Award className="w-4 h-4" />;
    return null;
  };

  const exportRankings = () => {
    if (overallRankings.length === 0) return;

    let csv = 'Rank,Student Number,Student Name,Class,Total Marks,Average %,Grade\n';
    overallRankings.forEach(ranking => {
      csv += `${ranking.rank},${ranking.student_number},"${ranking.student_name}","${ranking.class_name}",${ranking.total_marks},${ranking.average_percentage},${ranking.grade}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rankings_${selectedTerm}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zambian-green">Student Rankings</h2>
        <div className="flex gap-2">
          <Button onClick={generateRankings} disabled={!selectedTerm || isLoading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Rankings
          </Button>
          <Button onClick={exportRankings} disabled={overallRankings.length === 0} className="bg-zambian-green hover:bg-zambian-green/90">
            <Download className="w-4 h-4 mr-2" />
            Export Rankings
          </Button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-sm text-gray-600">
          Last updated: {lastUpdated.toLocaleString()}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div>
          <label className="block text-sm font-medium mb-1">Filter by Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} (Grade {cls.grade_level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Filter by Grade</label>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger>
              <SelectValue placeholder="All grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((grade) => (
                <SelectItem key={grade} value={grade.toString()}>
                  Grade {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedTerm && (
        <Tabs defaultValue="overall" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overall">Overall Rankings</TabsTrigger>
            <TabsTrigger value="subjects">Subject Rankings</TabsTrigger>
            <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
          </TabsList>

          <TabsContent value="overall">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Overall Student Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center p-8">Generating rankings...</div>
                ) : overallRankings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 bg-zambian-green/10">Rank</th>
                          <th className="text-left p-3 bg-zambian-green/10">Student</th>
                          <th className="text-left p-3 bg-zambian-green/10">Class</th>
                          <th className="text-center p-3 bg-zambian-green/10">Average</th>
                          <th className="text-center p-3 bg-zambian-green/10">Grade</th>
                          <th className="text-center p-3 bg-zambian-green/10">Total Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overallRankings.map((ranking, index) => (
                          <tr key={ranking.student_id} className={`border-b hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50' : ''}`}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Badge className={getRankBadgeColor(ranking.rank)}>
                                  <div className="flex items-center gap-1">
                                    {getRankIcon(ranking.rank)}
                                    #{ranking.rank}
                                  </div>
                                </Badge>
                              </div>
                            </td>
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{ranking.student_name}</div>
                                <div className="text-sm text-gray-600">{ranking.student_number}</div>
                              </div>
                            </td>
                            <td className="p-3">{ranking.class_name}</td>
                            <td className="p-3 text-center font-medium">{ranking.average_percentage}%</td>
                            <td className="p-3 text-center">
                              <Badge variant={
                                ranking.grade === 'A' ? 'default' :
                                ranking.grade === 'B' ? 'secondary' :
                                ranking.grade === 'C' ? 'outline' :
                                'destructive'
                              }>
                                {ranking.grade}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">{ranking.total_marks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-8 text-gray-600">
                    No rankings available. Select a term and ensure there are marks entered.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects">
            <div className="space-y-6">
              {subjectRankings.map((subject) => (
                <Card key={subject.subject_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{subject.subject_name} Rankings</span>
                      <div className="text-sm font-normal text-gray-600">
                        Class Avg: {subject.class_average}% | 
                        Highest: {subject.highest_score}% | 
                        Lowest: {subject.lowest_score}%
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 bg-gray-50">Rank</th>
                            <th className="text-left p-2 bg-gray-50">Student</th>
                            <th className="text-center p-2 bg-gray-50">Marks</th>
                            <th className="text-center p-2 bg-gray-50">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subject.student_rankings.slice(0, 10).map((student) => (
                            <tr key={student.student_id} className="border-b hover:bg-gray-50">
                              <td className="p-2">
                                <Badge className={getRankBadgeColor(student.rank)}>
                                  #{student.rank}
                                </Badge>
                              </td>
                              <td className="p-2">
                                <div>
                                  <div className="font-medium text-sm">{student.student_name}</div>
                                  <div className="text-xs text-gray-600">{student.student_number}</div>
                                </div>
                              </td>
                              <td className="p-2 text-center font-medium">{student.marks}%</td>
                              <td className="p-2 text-center">
                                <Badge variant={
                                  student.grade === 'A' ? 'default' :
                                  student.grade === 'B' ? 'secondary' :
                                  student.grade === 'C' ? 'outline' :
                                  'destructive'
                                }>
                                  {student.grade}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {subject.student_rankings.length > 10 && (
                      <p className="text-center text-sm text-gray-600 mt-3">
                        Showing top 10 of {subject.student_rankings.length} students
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="top-performers">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top 10 Overall Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overallRankings.slice(0, 10).map((ranking, index) => (
                      <div key={ranking.student_id} className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                        index === 1 ? 'bg-gray-50 border border-gray-200' :
                        index === 2 ? 'bg-orange-50 border border-orange-200' :
                        'bg-white border border-gray-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Badge className={getRankBadgeColor(ranking.rank)}>
                            <div className="flex items-center gap-1">
                              {getRankIcon(ranking.rank)}
                              #{ranking.rank}
                            </div>
                          </Badge>
                          <div>
                            <div className="font-medium">{ranking.student_name}</div>
                            <div className="text-sm text-gray-600">{ranking.class_name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-zambian-green">{ranking.average_percentage}%</div>
                          <div className="text-sm text-gray-600">Grade {ranking.grade}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Performance Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Excellence</h4>
                      <p className="text-green-700">
                        {overallRankings.filter(r => r.grade === 'A').length} students achieved Grade A
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Overall Average</h4>
                      <p className="text-blue-700">
                        {overallRankings.length > 0 ? 
                          (overallRankings.reduce((sum, r) => sum + r.average_percentage, 0) / overallRankings.length).toFixed(1) : 0}%
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800 mb-2">Pass Rate</h4>
                      <p className="text-yellow-700">
                        {overallRankings.length > 0 ? 
                          ((overallRankings.filter(r => r.average_percentage >= 50).length / overallRankings.length) * 100).toFixed(1) : 0}%
                      </p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-800 mb-2">Total Students</h4>
                      <p className="text-purple-700">
                        {overallRankings.length} students ranked
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default RankingsManager;