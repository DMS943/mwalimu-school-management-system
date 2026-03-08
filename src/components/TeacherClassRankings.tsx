import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus, Users, BookOpen, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAcademicSettings, calculateGrade } from '@/hooks/useAcademicSettings';

interface TeacherClassRankingsProps {
  user: User;
}

interface ClassData {
  id: string;
  name: string;
  grade_level: number;
  student_count: number;
}

interface StudentRanking {
  student_id: string;
  student_name: string;
  student_number: string;
  total_marks: number;
  average_percentage: number;
  grade: string;
  rank: number;
  previous_rank?: number;
  rank_change?: 'up' | 'down' | 'same' | 'new';
  subject_scores: { [subject: string]: number };
  subjects_count: number;
}

interface SubjectRanking {
  subject_name: string;
  student_rankings: Array<{
    student_name: string;
    student_number: string;
    marks: number;
    grade: string;
    rank: number;
  }>;
  class_average: number;
  highest_score: number;
  lowest_score: number;
}

export const TeacherClassRankings = ({ user }: TeacherClassRankingsProps) => {
  const { settings: academicSettings } = useAcademicSettings(user);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [terms, setTerms] = useState<any[]>([]);
  const [overallRankings, setOverallRankings] = useState<StudentRanking[]>([]);
  const [subjectRankings, setSubjectRankings] = useState<SubjectRanking[]>([]);
  const [activeTab, setActiveTab] = useState<'overall' | 'subjects'>('overall');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (selectedClass && selectedTerm) {
      fetchRankings();
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
        .order('start_date', { ascending: false });

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

  const fetchRankings = async () => {
    try {
      setLoading(true);

      // Get students in selected class
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .eq('current_class_id', selectedClass);

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        setOverallRankings([]);
        setSubjectRankings([]);
        return;
      }

      const studentIds = students.map(s => s.id);

      // Fetch marks for selected term
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select(`
          marks, grade, student_id,
          subjects (name, code)
        `)
        .in('student_id', studentIds)
        .eq('term_id', selectedTerm);

      if (marksError) throw marksError;

      // Process overall rankings
      const studentMap = new Map();
      
      students.forEach(student => {
        studentMap.set(student.id, {
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_number,
          total_marks: 0,
          subjects_count: 0,
          subject_scores: {},
          grades: []
        });
      });

      marks?.forEach(mark => {
        const student = studentMap.get(mark.student_id);
        if (student) {
          student.total_marks += mark.marks;
          student.subjects_count += 1;
          student.subject_scores[mark.subjects?.name || 'Unknown'] = mark.marks;
          student.grades.push(mark.grade);
        }
      });

      // Calculate averages and assign ranks
      const studentRankings: StudentRanking[] = Array.from(studentMap.values())
        .map(student => ({
          ...student,
          average_percentage: student.subjects_count > 0 
            ? Math.round((student.total_marks / student.subjects_count))
            : 0,
          grade: calculateOverallGrade(student.subjects_count > 0 
            ? student.total_marks / student.subjects_count 
            : 0)
        }))
        .sort((a, b) => b.average_percentage - a.average_percentage)
        .map((student, index) => ({
          ...student,
          rank: index + 1,
          rank_change: 'same' as 'up' | 'down' | 'same' | 'new' // Would need historical data for real changes
        }));

      setOverallRankings(studentRankings);

      // Process subject rankings
      const subjectMap = new Map();
      
      marks?.forEach(mark => {
        const subjectName = mark.subjects?.name || 'Unknown';
        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, {
            subject_name: subjectName,
            student_rankings: [],
            scores: []
          });
        }
        
        const student = students.find(s => s.id === mark.student_id);
        if (student) {
          subjectMap.get(subjectName).student_rankings.push({
            student_name: `${student.first_name} ${student.last_name}`,
            student_number: student.student_number,
            marks: mark.marks,
            grade: mark.grade,
            rank: 0 // Will be calculated below
          });
          subjectMap.get(subjectName).scores.push(mark.marks);
        }
      });

      const subjectRankings: SubjectRanking[] = Array.from(subjectMap.values()).map(subject => {
        // Sort students by marks and assign ranks
        subject.student_rankings.sort((a, b) => b.marks - a.marks);
        subject.student_rankings.forEach((student, index) => {
          student.rank = index + 1;
        });

        const scores = subject.scores;
        return {
          subject_name: subject.subject_name,
          student_rankings: subject.student_rankings,
          class_average: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
          highest_score: scores.length > 0 ? Math.max(...scores) : 0,
          lowest_score: scores.length > 0 ? Math.min(...scores) : 0
        };
      });

      setSubjectRankings(subjectRankings);

    } catch (error: any) {
      console.error('Error fetching rankings:', error);
      toast({
        title: "Error",
        description: "Failed to load rankings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallGrade = (percentage: number): string => {
    return calculateGrade(percentage, academicSettings.grade_scale);
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
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-zambian-green">{rank}</span>;
    }
  };

  const getRankChangeIcon = (change?: 'up' | 'down' | 'same' | 'new') => {
    switch (change) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'same':
        return <Minus className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-zambian-green/30 border-t-zambian-green rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-zambian-green font-medium">Loading rankings...</div>
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

        <Button onClick={fetchRankings} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Rankings
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-zambian-green/10 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'overall' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overall')}
          className={activeTab === 'overall' ? 'bg-zambian-green text-white' : 'text-zambian-green'}
        >
          Overall Rankings
        </Button>
        <Button
          variant={activeTab === 'subjects' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('subjects')}
          className={activeTab === 'subjects' ? 'bg-zambian-green text-white' : 'text-zambian-green'}
        >
          Subject Rankings
        </Button>
      </div>

      {/* Overall Rankings */}
      {activeTab === 'overall' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Overall Class Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overallRankings.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zambian-green mb-2">No Rankings Available</h3>
                <p className="text-muted-foreground">No student marks found for the selected class and term.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Student Number</TableHead>
                      <TableHead className="text-center">Total Marks</TableHead>
                      <TableHead className="text-center">Average</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Subjects</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overallRankings.map((student) => (
                      <TableRow key={student.student_id} className="hover:bg-zambian-green/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getRankIcon(student.rank)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-zambian-green">
                          {student.student_name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {student.student_number}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {student.total_marks}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-zambian-green">
                            {student.average_percentage}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={`
                              ${student.grade === 'A' ? 'border-green-500 text-green-700' : ''}
                              ${student.grade === 'B' ? 'border-blue-500 text-blue-700' : ''}
                              ${student.grade === 'C' ? 'border-yellow-500 text-yellow-700' : ''}
                              ${student.grade === 'D' ? 'border-orange-500 text-orange-700' : ''}
                              ${student.grade === 'F' ? 'border-red-500 text-red-700' : ''}
                            `}
                          >
                            {student.grade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {student.subjects_count}
                        </TableCell>
                        <TableCell className="text-center">
                          {getRankChangeIcon(student.rank_change)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subject Rankings */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          {subjectRankings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zambian-green mb-2">No Subject Data</h3>
                <p className="text-muted-foreground">No subject marks found for the selected class and term.</p>
              </CardContent>
            </Card>
          ) : (
            subjectRankings.map((subject) => (
              <Card key={subject.subject_name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {subject.subject_name}
                    </CardTitle>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Class Avg: <strong className="text-zambian-green">{subject.class_average}%</strong></span>
                      <span>Highest: <strong className="text-green-600">{subject.highest_score}%</strong></span>
                      <span>Lowest: <strong className="text-red-600">{subject.lowest_score}%</strong></span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Rank</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Student Number</TableHead>
                          <TableHead className="text-center">Marks</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subject.student_rankings.map((student) => (
                          <TableRow key={`${subject.subject_name}-${student.student_number}`} className="hover:bg-zambian-green/5">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {getRankIcon(student.rank)}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-zambian-green">
                              {student.student_name}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {student.student_number}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {student.marks}%
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant="outline" 
                                className={`
                                  ${student.grade === 'A' ? 'border-green-500 text-green-700' : ''}
                                  ${student.grade === 'B' ? 'border-blue-500 text-blue-700' : ''}
                                  ${student.grade === 'C' ? 'border-yellow-500 text-yellow-700' : ''}
                                  ${student.grade === 'D' ? 'border-orange-500 text-orange-700' : ''}
                                  ${student.grade === 'F' ? 'border-red-500 text-red-700' : ''}
                                `}
                              >
                                {student.grade}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};