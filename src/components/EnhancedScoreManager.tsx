import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAcademicSettings, calculateGrade } from '@/hooks/useAcademicSettings';
import { Save, Upload, Download, Calculator, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  weight?: number;
}

interface Term {
  id: string;
  name: string;
  is_active: boolean;
  weight?: number;
}

interface Mark {
  id?: string;
  student_id: string;
  subject_id: string;
  term_id: string;
  marks: number;
  grade: string;
  assessment_type?: string;
}

interface StudentPerformance {
  student_id: string;
  student_name: string;
  student_number: string;
  total_marks: number;
  average: number;
  grade: string;
  rank: number;
  subject_marks: { [subject_id: string]: number };
}

interface EnhancedScoreManagerProps {
  user?: any;
}

const EnhancedScoreManager = ({ user }: EnhancedScoreManagerProps) => {
  const { settings: academicSettings } = useAcademicSettings(user);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>('exam');
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [rankings, setRankings] = useState<StudentPerformance[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTerm && selectedClass) {
      fetchStudentsAndMarks();
    }
  }, [selectedTerm, selectedClass, selectedAssessmentType]);

  useEffect(() => {
    if (marks.length > 0) {
      calculateRankings();
    }
  }, [marks, academicSettings.grade_scale]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Build classes query based on user role
      let classesQuery = supabase.from('classes').select('*').order('name');
      
      // Get user's admin_users record to determine role and school
      if (user && user.id) {
        const { data: adminUserData, error: adminUserError } = await supabase
          .from('admin_users')
          .select('id, role, school_id, is_super_admin')
          .eq('user_id', user.id)
          .single();

        if (adminUserError) {
          console.error('Error fetching admin_users record:', adminUserError);
          // Don't throw error - allow to continue for super admins or if record doesn't exist
        }

        if (adminUserData) {
          // If user is a teacher, only show their assigned classes
          if (adminUserData.role === 'teacher') {
            classesQuery = classesQuery.eq('class_teacher_id', adminUserData.id);
          } 
          // If user is an admin (not super admin), filter by school
          else if (adminUserData.role === 'admin' && !adminUserData.is_super_admin && adminUserData.school_id) {
            classesQuery = classesQuery.eq('school_id', adminUserData.school_id);
          }
          // Super admins see all classes (no filter)
        }
      }

      // Build terms and subjects queries based on user role
      let termsQuery = supabase.from('terms').select('*').order('created_at', { ascending: false });
      let subjectsQuery = supabase.from('subjects').select('*').order('name');

      // If user is an admin (not super admin), filter terms and subjects by school
      if (user && user.id) {
        const { data: adminUserData } = await supabase
          .from('admin_users')
          .select('school_id, is_super_admin, role')
          .eq('user_id', user.id)
          .single();

        if (adminUserData && adminUserData.role === 'admin' && !adminUserData.is_super_admin && adminUserData.school_id) {
          termsQuery = termsQuery.eq('school_id', adminUserData.school_id);
          subjectsQuery = subjectsQuery.eq('school_id', adminUserData.school_id);
        }
      }

      const [termsResult, subjectsResult, classesResult] = await Promise.all([
        termsQuery,
        subjectsQuery,
        classesQuery
      ]);

      // Check each result individually for better error messages
      if (termsResult.error) {
        console.error('Error fetching terms:', termsResult.error);
        throw new Error(`Failed to load terms: ${termsResult.error.message}`);
      }
      if (subjectsResult.error) {
        console.error('Error fetching subjects:', subjectsResult.error);
        throw new Error(`Failed to load subjects: ${subjectsResult.error.message}`);
      }
      if (classesResult.error) {
        console.error('Error fetching classes:', classesResult.error);
        throw new Error(`Failed to load classes: ${classesResult.error.message}`);
      }

      setTerms(termsResult.data || []);
      setSubjects(subjectsResult.data || []);
      setClasses(classesResult.data || []);

      // If no classes found, show helpful message
      if (user && user.id && (!classesResult.data || classesResult.data.length === 0)) {
        toast({
          title: "No Classes Available",
          description: "No classes are available for your account. Please contact your administrator.",
          variant: "default",
        });
      }

      const activeTerm = termsResult.data?.find(term => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }
    } catch (error: any) {
      console.error('Error in fetchInitialData:', error);
      toast({
        title: "Failed to load data",
        description: error.message || "Please try again or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentsAndMarks = async () => {
    if (!selectedTerm || !selectedClass) return;

    setIsLoading(true);
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .eq('current_class_id', selectedClass)
        .order('student_number');

      if (studentsError) throw studentsError;

      const { data: marksData, error: marksError } = await supabase
        .from('marks')
        .select('*')
        .eq('term_id', selectedTerm)
        .in('student_id', studentsData?.map(s => s.id) || []);

      if (marksError) throw marksError;

      setStudents(studentsData || []);
      setMarks(marksData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateGradeLocal = useCallback((marks: number): string => {
    return calculateGrade(marks, academicSettings.grade_scale);
  }, [academicSettings.grade_scale]);

  const calculateWeightedAverage = (studentMarks: Mark[]): number => {
    // Only calculate average for subjects the student actually takes (has marks for)
    // Students don't take all subjects, so we only count subjects with marks
    if (studentMarks.length === 0) return 0;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    // Only process marks that exist (subjects the student takes)
    studentMarks.forEach(mark => {
      const subject = subjects.find(s => s.id === mark.subject_id);
      const weight = subject?.weight || 1;
      totalWeightedScore += mark.marks * weight;
      totalWeight += weight;
    });
    
    // Average is calculated only from subjects the student takes
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  };

  const calculateRankings = () => {
    const studentPerformances: StudentPerformance[] = students.map(student => {
      // Only get marks for subjects this student actually takes
      // Students don't take all subjects, so we only count subjects with marks
      const studentMarks = marks.filter(m => m.student_id === student.id);
      const subjectMarks: { [key: string]: number } = {};
      
      // Build subject marks map - only include subjects where student has marks
      // Subjects without marks are not included in calculations
      subjects.forEach(subject => {
        const mark = studentMarks.find(m => m.subject_id === subject.id);
        // Only add to map if mark exists (student takes this subject)
        if (mark) {
          subjectMarks[subject.id] = mark.marks;
        }
      });
      
      // Calculate totals and averages using ONLY subjects the student takes
      const totalMarks = studentMarks.reduce((sum, mark) => sum + mark.marks, 0);
      // calculateWeightedAverage only uses marks that exist, so it's correct
      const average = calculateWeightedAverage(studentMarks);
      
      return {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
        student_number: student.student_number,
        total_marks: totalMarks,
        average,
        grade: calculateGradeLocal(average),
        rank: 0,
        subject_marks: subjectMarks
      };
    });

    // Sort by average and assign ranks
    studentPerformances.sort((a, b) => b.average - a.average);
    studentPerformances.forEach((performance, index) => {
      performance.rank = index + 1;
    });

    setRankings(studentPerformances);
  };

  const validateMark = (value: number, studentId: string, subjectId: string): string[] => {
    const errors: string[] = [];
    
    if (value < 0 || value > 100) {
      errors.push(`Invalid score: ${value}. Scores must be between 0-100`);
    }
    
    // Check for duplicates
    const existingMark = marks.find(m => 
      m.student_id === studentId && 
      m.subject_id === subjectId && 
      m.term_id === selectedTerm
    );
    
    return errors;
  };

  const updateMark = (studentId: string, subjectId: string, value: number) => {
    // Allow empty/zero values
    if (isNaN(value) || value === null || value === undefined) {
      value = 0;
    }

    // Only validate if value is greater than 0
    if (value > 0) {
      const errors = validateMark(value, studentId, subjectId);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
    }
    
    setValidationErrors([]);
    
    // Find existing mark for this student, subject, term, and assessment type
    const existingMarkIndex = marks.findIndex(
      m => m.student_id === studentId 
        && m.subject_id === subjectId 
        && m.term_id === selectedTerm
        && m.assessment_type === selectedAssessmentType
    );

    if (existingMarkIndex >= 0) {
      // Update existing mark
      const updatedMarks = [...marks];
      if (value === 0) {
        // Remove mark if value is 0
        updatedMarks.splice(existingMarkIndex, 1);
      } else {
        updatedMarks[existingMarkIndex] = {
          ...updatedMarks[existingMarkIndex],
          marks: value,
          grade: calculateGradeLocal(value)
        };
      }
      setMarks(updatedMarks);
    } else if (value > 0) {
      // Create new mark only if value is greater than 0
      const newMark: Mark = {
        student_id: studentId,
        subject_id: subjectId,
        term_id: selectedTerm,
        marks: value,
        grade: calculateGradeLocal(value),
        assessment_type: selectedAssessmentType
      };
      setMarks([...marks, newMark]);
    }
  };

  const getMarkValue = (studentId: string, subjectId: string): number | '' => {
    const mark = marks.find(
      m => m.student_id === studentId 
        && m.subject_id === subjectId 
        && m.term_id === selectedTerm
        && m.assessment_type === selectedAssessmentType
    );
    return mark?.marks || '';
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      // Sanitize input - remove any potential script tags or malicious content
      const sanitizedText = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      const rows = sanitizedText.split('\n').filter(row => row.trim());
      const newMarks: Mark[] = [];
      const errors: string[] = [];

      // Validate header row exists
      if (rows.length < 2) {
        setValidationErrors(['CSV file must contain a header row and at least one data row']);
        return;
      }

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const [studentNumber, ...subjectScores] = rows[i].split(',');
        
        if (!studentNumber) continue;
        
        const student = students.find(s => s.student_number === studentNumber.trim());
        if (!student) {
          errors.push(`Student not found: ${studentNumber}`);
          continue;
        }

        subjects.forEach((subject, subjectIndex) => {
          const score = parseInt(subjectScores[subjectIndex]);
          if (!isNaN(score)) {
            const validationErrors = validateMark(score, student.id, subject.id);
            if (validationErrors.length === 0) {
              newMarks.push({
                student_id: student.id,
                subject_id: subject.id,
                term_id: selectedTerm,
                marks: score,
                grade: calculateGradeLocal(score),
                assessment_type: selectedAssessmentType
              });
            } else {
              errors.push(...validationErrors);
            }
          }
        });
      }

      if (errors.length > 0) {
        setValidationErrors(errors);
      } else {
        setMarks(prevMarks => [...prevMarks.filter(m => m.term_id !== selectedTerm), ...newMarks]);
        toast({
          title: "Bulk upload successful",
          description: `Uploaded ${newMarks.length} marks`,
        });
      }
    };

    reader.readAsText(file);
  };

  const exportTemplate = () => {
    let csv = 'Student Number,' + subjects.map(s => s.code).join(',') + '\n';
    students.forEach(student => {
      csv += student.student_number + ',' + subjects.map(() => '').join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marks_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveMarks = async () => {
    if (!selectedTerm || !selectedClass) {
      toast({
        title: "Missing Information",
        description: "Please select both a term and a class.",
        variant: "destructive",
      });
      return;
    }

    // Filter marks for current term and assessment type
    const marksToSave = marks
      .filter(mark => 
        mark.term_id === selectedTerm && 
        mark.assessment_type === selectedAssessmentType &&
        mark.marks > 0 // Only save marks greater than 0
      )
      .map(mark => ({
        student_id: mark.student_id,
        subject_id: mark.subject_id,
        term_id: selectedTerm,
        marks: mark.marks,
        grade: calculateGradeLocal(mark.marks),
        assessment_type: selectedAssessmentType
      }));

    if (marksToSave.length === 0) {
      toast({
        title: "No Marks to Save",
        description: "Please enter at least one mark before saving.",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use upsert to update existing marks or insert new ones
      // The unique constraint should be on (student_id, subject_id, term_id, assessment_type)
      const { error } = await supabase
        .from('marks')
        .upsert(marksToSave, {
          onConflict: 'student_id,subject_id,term_id,assessment_type'
        });

      if (error) throw error;

      toast({
        title: "Marks saved successfully!",
        description: `Saved ${marksToSave.length} mark${marksToSave.length > 1 ? 's' : ''} for ${selectedAssessmentType}.`,
      });

      // Refresh the marks to show saved data
      await fetchStudentsAndMarks();
    } catch (error: any) {
      console.error('Error saving marks:', error);
      toast({
        title: "Error saving marks",
        description: error.message || "Failed to save marks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zambian-green">Enhanced Score Management</h2>
        <div className="flex gap-2">
          <Button onClick={exportTemplate} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Template
          </Button>
          <Button onClick={saveMarks} disabled={!selectedTerm || isLoading} className="bg-zambian-green hover:bg-zambian-green/90">
            <Save className="w-4 h-4 mr-2" />
            Save All Marks
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Term</label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger>
              <SelectValue placeholder="Select term" />
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
        <div>
          <label className="block text-sm font-medium mb-1">Select Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
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
          <label className="block text-sm font-medium mb-1">Assessment Type</label>
          <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exam">Exam</SelectItem>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bulk Upload</label>
          <label className="flex items-center justify-center w-full h-10 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
            <Upload className="w-4 h-4 mr-2" />
            <span className="text-sm">Upload CSV</span>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleBulkUpload} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {selectedTerm && selectedClass && (
        <Tabs defaultValue="entry" className="space-y-4">
          <TabsList>
            <TabsTrigger value="entry">Score Entry</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="entry">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Score Entry Sheet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center p-8">Loading students...</div>
                ) : students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 bg-zambian-green/10">Student</th>
                          {subjects.map((subject) => (
                            <th key={subject.id} className="text-center p-3 bg-zambian-green/10 min-w-[100px]">
                              {subject.code}
                            </th>
                          ))}
                          <th className="text-center p-3 bg-zambian-green/10">Average</th>
                          <th className="text-center p-3 bg-zambian-green/10">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const studentMarks = marks.filter(m => m.student_id === student.id);
                          const average = calculateWeightedAverage(studentMarks);
                          return (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 font-medium">
                                <div>{student.first_name} {student.last_name}</div>
                                <div className="text-sm text-gray-600">{student.student_number}</div>
                              </td>
                              {subjects.map((subject) => (
                                <td key={subject.id} className="p-3 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={getMarkValue(student.id, subject.id)}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      updateMark(student.id, subject.id, isNaN(value) ? 0 : value);
                                    }}
                                    onBlur={(e) => {
                                      // Validate on blur
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && (value < 0 || value > 100)) {
                                        toast({
                                          title: "Invalid Score",
                                          description: `Score must be between 0 and 100.`,
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="w-full text-center focus:ring-2 focus:ring-zambian-green"
                                    placeholder="Enter score"
                                    disabled={isLoading}
                                  />
                                </td>
                              ))}
                              <td className="p-3 text-center font-medium">
                                {average.toFixed(1)}%
                              </td>
                              <td className="p-3 text-center font-medium">
                                <span className={`px-2 py-1 rounded text-sm font-bold ${
                                  calculateGradeLocal(average) === 'A' || calculateGradeLocal(average) === '5' ? 'bg-green-100 text-green-800' :
                                  calculateGradeLocal(average) === 'B' || calculateGradeLocal(average) === '4' ? 'bg-blue-100 text-blue-800' :
                                  calculateGradeLocal(average) === 'C' || calculateGradeLocal(average) === '3' ? 'bg-yellow-100 text-yellow-800' :
                                  calculateGradeLocal(average) === 'D' || calculateGradeLocal(average) === '2' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {calculateGradeLocal(average)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-8 text-gray-600">
                    No students found in the selected class.
                  </div>
                )}
                <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                  <Button 
                    onClick={saveMarks} 
                    disabled={!selectedTerm || !selectedClass || isLoading || marks.filter(m => m.marks > 0 && m.term_id === selectedTerm && m.assessment_type === selectedAssessmentType).length === 0}
                    className="bg-zambian-green hover:bg-zambian-green/90 text-white px-6 py-2"
                    size="lg"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Save All Marks
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rankings">
            <Card>
              <CardHeader>
                <CardTitle>Class Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 bg-zambian-green/10">Rank</th>
                        <th className="text-left p-3 bg-zambian-green/10">Student</th>
                        <th className="text-center p-3 bg-zambian-green/10">Average</th>
                        <th className="text-center p-3 bg-zambian-green/10">Grade</th>
                        <th className="text-center p-3 bg-zambian-green/10">Total Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((performance) => (
                        <tr key={performance.student_id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-bold text-zambian-green">#{performance.rank}</td>
                          <td className="p-3">
                            <div>{performance.student_name}</div>
                            <div className="text-sm text-gray-600">{performance.student_number}</div>
                          </td>
                          <td className="p-3 text-center font-medium">{performance.average.toFixed(1)}%</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-sm font-bold ${
                              performance.grade === 'A' ? 'bg-green-100 text-green-800' :
                              performance.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              performance.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              performance.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {performance.grade}
                            </span>
                          </td>
                          <td className="p-3 text-center">{performance.total_marks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Class Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Class Average:</span>
                      <span className="font-bold">
                        {rankings.length > 0 ? (rankings.reduce((sum, p) => sum + p.average, 0) / rankings.length).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Highest Score:</span>
                      <span className="font-bold text-green-600">
                        {rankings.length > 0 ? rankings[0]?.average.toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lowest Score:</span>
                      <span className="font-bold text-red-600">
                        {rankings.length > 0 ? rankings[rankings.length - 1]?.average.toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pass Rate (50%+):</span>
                      <span className="font-bold">
                        {rankings.length > 0 ? 
                          ((rankings.filter(p => p.average >= 50).length / rankings.length) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D', 'F'].map(grade => {
                      const count = rankings.filter(p => p.grade === grade).length;
                      const percentage = rankings.length > 0 ? (count / rankings.length) * 100 : 0;
                      return (
                        <div key={grade} className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                            grade === 'A' ? 'bg-green-100 text-green-800' :
                            grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            grade === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade}
                          </span>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span>{count} students</span>
                              <span>{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  grade === 'A' ? 'bg-green-500' :
                                  grade === 'B' ? 'bg-blue-500' :
                                  grade === 'C' ? 'bg-yellow-500' :
                                  grade === 'D' ? 'bg-orange-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Grading Scale ({academicSettings.grade_scale})</CardTitle>
        </CardHeader>
        <CardContent>
          {academicSettings.grade_scale === 'A-F' && (
            <div className="grid grid-cols-5 gap-4 text-center">
              <div className="bg-green-100 p-3 rounded">
                <div className="font-bold text-green-800">A</div>
                <div className="text-sm">80-100</div>
                <div className="text-xs">Excellent</div>
              </div>
              <div className="bg-blue-100 p-3 rounded">
                <div className="font-bold text-blue-800">B</div>
                <div className="text-sm">70-79</div>
                <div className="text-xs">Very Good</div>
              </div>
              <div className="bg-yellow-100 p-3 rounded">
                <div className="font-bold text-yellow-800">C</div>
                <div className="text-sm">60-69</div>
                <div className="text-xs">Good</div>
              </div>
              <div className="bg-orange-100 p-3 rounded">
                <div className="font-bold text-orange-800">D</div>
                <div className="text-sm">50-59</div>
                <div className="text-xs">Satisfactory</div>
              </div>
              <div className="bg-red-100 p-3 rounded">
                <div className="font-bold text-red-800">F</div>
                <div className="text-sm">0-49</div>
                <div className="text-xs">Needs Improvement</div>
              </div>
            </div>
          )}
          {academicSettings.grade_scale === '1-5' && (
            <div className="grid grid-cols-5 gap-4 text-center">
              <div className="bg-green-100 p-3 rounded">
                <div className="font-bold text-green-800">5</div>
                <div className="text-sm">90-100</div>
                <div className="text-xs">Excellent</div>
              </div>
              <div className="bg-blue-100 p-3 rounded">
                <div className="font-bold text-blue-800">4</div>
                <div className="text-sm">80-89</div>
                <div className="text-xs">Very Good</div>
              </div>
              <div className="bg-yellow-100 p-3 rounded">
                <div className="font-bold text-yellow-800">3</div>
                <div className="text-sm">70-79</div>
                <div className="text-xs">Good</div>
              </div>
              <div className="bg-orange-100 p-3 rounded">
                <div className="font-bold text-orange-800">2</div>
                <div className="text-sm">60-69</div>
                <div className="text-xs">Satisfactory</div>
              </div>
              <div className="bg-red-100 p-3 rounded">
                <div className="font-bold text-red-800">0-1</div>
                <div className="text-sm">0-59</div>
                <div className="text-xs">Needs Improvement</div>
              </div>
            </div>
          )}
          {academicSettings.grade_scale === 'percentage' && (
            <div className="grid grid-cols-5 gap-4 text-center">
              <div className="bg-green-100 p-3 rounded">
                <div className="font-bold text-green-800">90-100%</div>
                <div className="text-sm">Excellent</div>
                <div className="text-xs">Outstanding</div>
              </div>
              <div className="bg-blue-100 p-3 rounded">
                <div className="font-bold text-blue-800">80-89%</div>
                <div className="text-sm">Very Good</div>
                <div className="text-xs">Above Average</div>
              </div>
              <div className="bg-yellow-100 p-3 rounded">
                <div className="font-bold text-yellow-800">70-79%</div>
                <div className="text-sm">Good</div>
                <div className="text-xs">Average</div>
              </div>
              <div className="bg-orange-100 p-3 rounded">
                <div className="font-bold text-orange-800">60-69%</div>
                <div className="text-sm">Satisfactory</div>
                <div className="text-xs">Below Average</div>
              </div>
              <div className="bg-red-100 p-3 rounded">
                <div className="font-bold text-red-800">0-59%</div>
                <div className="text-sm">Needs Improvement</div>
                <div className="text-xs">Below Standard</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedScoreManager;