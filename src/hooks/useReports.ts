import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseReportsProps {
  studentId?: string;
  termId?: string;
  classId?: string;
  user?: any;
}

export const useReports = ({ studentId, termId, classId, user }: UseReportsProps = {}) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          students (
            id, first_name, last_name, student_number,
            classes (name, grade_level)
          ),
          terms (name, start_date, end_date)
        `)
        .order('generated_at', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }
      
      if (termId) {
        query = query.eq('term_id', termId);
      }

      if (classId && !studentId) {
        // If we have classId but no specific studentId, get reports for all students in the class
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId);
        
        if (classStudents && classStudents.length > 0) {
          query = query.in('student_id', classStudents.map(s => s.id));
        }
      }

      // If user is a teacher, only show reports for their assigned classes
      if (user && user.id && !classId && !studentId) {
        const { data: teacherClasses } = await supabase
          .from('classes')
          .select('id')
          .eq('class_teacher_id', user.id);
        
        if (teacherClasses && teacherClasses.length > 0) {
          const { data: classStudents } = await supabase
            .from('students')
            .select('id')
            .in('class_id', teacherClasses.map(c => c.id));
          
          if (classStudents && classStudents.length > 0) {
            query = query.in('student_id', classStudents.map(s => s.id));
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setReports(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error fetching reports",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (studentId: string, termId: string) => {
    setLoading(true);
    try {
      // Fetch student data
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, student_number, class_id,
          classes (name, grade_level, class_teacher)
        `)
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // Fetch marks for the student in the selected term
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select(`
          marks, grade,
          subjects (name, code)
        `)
        .eq('student_id', studentId)
        .eq('term_id', termId);

      if (marksError) throw marksError;

      if (!marks || marks.length === 0) {
        throw new Error('No marks found for this student in the selected term');
      }

      // Calculate report data
      const totalMarks = marks.reduce((sum, mark) => sum + mark.marks, 0);
      const subjectCount = marks.length;
      const averagePercentage = totalMarks / subjectCount;
      const overallGrade = calculateOverallGrade(averagePercentage);

      // Get class size for position calculation
      const { data: classStudents, error: classError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', student.class_id);

      if (classError) throw classError;

      const classSize = classStudents?.length || 1;

      // Calculate position based on average percentage
      const { data: classReports, error: rankingError } = await supabase
        .from('reports')
        .select('student_id, average_percentage')
        .eq('term_id', termId)
        .in('student_id', classStudents?.map(s => s.id) || []);

      let position = 1;
      if (!rankingError && classReports) {
        const higherScores = classReports.filter(report => 
          report.student_id !== studentId && report.average_percentage > averagePercentage
        ).length;
        position = higherScores + 1;
      }

      const reportData = {
        student_id: studentId,
        term_id: termId,
        total_marks: totalMarks,
        average_percentage: parseFloat(averagePercentage.toFixed(2)),
        overall_grade: overallGrade,
        position: position,
        class_size: classSize
      };

      // Save report to database
      const { data: savedReport, error: reportError } = await supabase
        .from('reports')
        .upsert([reportData], {
          onConflict: 'student_id,term_id'
        })
        .select()
        .single();

      if (reportError) throw reportError;

      toast({
        title: "Report generated successfully!",
        description: `Report card ready for ${student.first_name} ${student.last_name}`,
      });

      // Refresh reports list
      await fetchReports();
      
      return savedReport;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error generating report",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallGrade = (percentage: number): string => {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  useEffect(() => {
    if (studentId || termId || classId) {
      fetchReports();
    }
  }, [studentId, termId, classId]);

  return {
    reports,
    loading,
    error,
    fetchReports,
    generateReport,
    calculateOverallGrade
  };
};