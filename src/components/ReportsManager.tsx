
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Eye, Calculator, Upload, X } from 'lucide-react';
import SimpleReportCard from '@/components/SimpleReportCard';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import { useAcademicSettings, calculateGrade } from '@/hooks/useAcademicSettings';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  date_of_birth: string;
  school_id?: string;
  classes?: { name: string };
  schools?: { id: string; name: string; logo_url: string | null };
}

interface Mark {
  marks: number;
  grade: string;
  subjects: { name: string; code: string };
}

interface Report {
  id: string;
  student_id: string;
  term_id: string;
  report_data: {
    total_marks: number;
    average_percentage: number;
    overall_grade: string;
    position: number;
    class_size: number;
  };
  generated_at: string;
  students?: {
    first_name: string;
    last_name: string;
  };
  terms?: {
    name: string;
  };
}

interface Template {
  id: string;
  name: string;
  school_type: string;
  header_text: string;
  logo_url: string | null;
  show_grade_scale: boolean;
  show_position: boolean;
  show_attendance: boolean;
  show_behavior: boolean;
}

interface ReportsManagerProps {
  user?: any;
}

const ReportsManager = ({ user }: ReportsManagerProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [studentMarks, setStudentMarks] = useState<Mark[]>([]);
  const [studentReport, setStudentReport] = useState<Report | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [termData, setTermData] = useState<any>(null);
  const [showReportCard, setShowReportCard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [existingReports, setExistingReports] = useState<any[]>([]);
  const [showExistingReports, setShowExistingReports] = useState(false);
  const [reportComments, setReportComments] = useState<string>('');
  const { toast } = useToast();
  const { school } = useCurrentSchool(user);
  const { settings: academicSettings } = useAcademicSettings(user);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsInClass();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedStudent && selectedTerm) {
      fetchExistingReports();
      // Reset comments when student/term changes
      setReportComments('');
    }
  }, [selectedStudent, selectedTerm]);

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

      const [termsResult, classesResult, templatesResult] = await Promise.all([
        supabase.from('terms').select('*').order('created_at', { ascending: false }),
        classesQuery,
        supabase.from('report_templates').select('*').order('name')
      ]);



      if (termsResult.error) {
        console.error('Terms error:', termsResult.error);
        throw termsResult.error;
      }
      if (classesResult.error) {
        console.error('Classes error:', classesResult.error);
        throw classesResult.error;
      }
      if (templatesResult.error) {
        console.error('Templates error:', templatesResult.error);
        throw templatesResult.error;
      }

      setTerms(termsResult.data || []);
      setClasses(classesResult.data || []);
      setTemplates(templatesResult.data || []);

      // Check if teacher has no assigned classes
      if (user && user.id && (!classesResult.data || classesResult.data.length === 0)) {
        toast({
          title: "No classes assigned",
          description: "You don't have any classes assigned to you. Please contact the administrator.",
          variant: "destructive",
        });
      }

      // Set default active term
      const activeTerm = termsResult.data?.find(term => term.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id);
      }

      // Set default template
      if (templatesResult.data && templatesResult.data.length > 0) {
        setSelectedTemplate(templatesResult.data[0].id);
      }
    } catch (error: any) {
      console.error('Error in fetchInitialData:', error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchStudentsInClass = async () => {
    if (!selectedClass) return;

    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, student_number, date_of_birth,
          classes!current_class_id (name)
        `)
        .eq('current_class_id', selectedClass)
        .order('student_number');

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchExistingReports = async () => {
    if (!selectedStudent || !selectedTerm) return;

    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          students (first_name, last_name, student_number),
          terms (name)
        `)
        .eq('student_id', selectedStudent)
        .eq('term_id', selectedTerm)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setExistingReports(data || []);
    } catch (error: any) {
      console.error('Error fetching existing reports:', error);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogoToTemplate = async () => {
    if (!logoFile || !selectedTemplate) return;

    setIsUploadingLogo(true);
    try {
      // Upload to Supabase Storage
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `template-${selectedTemplate}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      // Update template with logo URL
      const { error: updateError } = await supabase
        .from('report_templates')
        .update({ logo_url: publicUrl })
        .eq('id', selectedTemplate);

      if (updateError) throw updateError;

      toast({
        title: "Logo uploaded successfully!",
        description: "The logo has been added to the selected template.",
      });

      // Refresh templates
      fetchInitialData();
      setLogoFile(null);
      setLogoPreview(null);

    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const generateReport = async () => {
    if (!selectedStudent || !selectedTerm) return;

    setIsLoading(true);
    try {
      // Fetch student data with school information
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, student_number, date_of_birth, school_id,
          classes!current_class_id (name),
          schools!school_id (id, name, logo_url)
        `)
        .eq('id', selectedStudent)
        .single();

      if (studentError) throw studentError;

      // Fetch term data
      const { data: term, error: termError } = await supabase
        .from('terms')
        .select('*')
        .eq('id', selectedTerm)
        .single();

      if (termError) throw termError;

      // Fetch marks for the student in the selected term
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select(`
          marks, grade,
          subjects (name, code)
        `)
        .eq('student_id', selectedStudent)
        .eq('term_id', selectedTerm);

      if (marksError) throw marksError;

      // Check if student has any marks for this term
      if (!marks || marks.length === 0) {
        toast({
          title: "No marks found",
          description: `No marks have been recorded for ${student.first_name} ${student.last_name} in ${term.name}. Please add marks first.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Calculate report data
      // IMPORTANT: Only count subjects where the student has marks
      // Students don't take all subjects, so we only average subjects they actually take
      const totalMarks = marks?.reduce((sum, mark) => sum + mark.marks, 0) || 0;
      const subjectCount = marks?.length || 1; // Only count subjects with marks
      const averagePercentage = subjectCount > 0 ? totalMarks / subjectCount : 0;
      const overallGrade = calculateOverallGrade(averagePercentage);

      // Get class size for position calculation
      const { data: classStudents, error: classError } = await supabase
        .from('students')
        .select('id')
        .eq('current_class_id', selectedClass);

      if (classError) throw classError;

      // Calculate position based on average percentage compared to classmates
      const classSize = classStudents?.length || 1;

      // Get all students' averages in the same class and term for ranking
      const { data: classReports, error: rankingError } = await supabase
        .from('reports')
        .select('student_id, report_data')
        .eq('term_id', selectedTerm)
        .in('student_id', classStudents?.map(s => s.id) || []);

      let position = 1;
      if (!rankingError && classReports) {
        // Count how many students have higher averages (extract from report_data)
        const higherScores = classReports.filter(report => {
          const reportData = report.report_data as any;
          const avgPercent = reportData?.average_percentage || 0;
          return report.student_id !== selectedStudent && avgPercent > averagePercentage;
        }).length;
        position = higherScores + 1;
      }

      // Store report data in the report_data JSONB column
      const reportData = {
        student_id: selectedStudent,
        class_id: classStudents?.[0]?.current_class_id || null,
        term_id: selectedTerm,
        report_data: {
          total_marks: totalMarks,
          average_percentage: parseFloat(averagePercentage.toFixed(2)),
          overall_grade: overallGrade,
          position: position,
          class_size: classSize,
          comments: reportComments || generateComments(averagePercentage, overallGrade)
        }
      };

      // Check if report already exists
      const { data: existingReport } = await supabase
        .from('reports')
        .select('id')
        .eq('student_id', selectedStudent)
        .eq('term_id', selectedTerm)
        .single();

      let savedReport;
      if (existingReport) {
        // Update existing report
        const { data: updatedReport, error: updateError } = await supabase
          .from('reports')
          .update(reportData)
          .eq('id', existingReport.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        savedReport = updatedReport;
      } else {
        // Insert new report
        const { data: newReport, error: insertError } = await supabase
          .from('reports')
          .insert([reportData])
          .select()
          .single();
        
        if (insertError) throw insertError;
        savedReport = newReport;
      }

      setStudentData(student);
      setTermData(term);
      setStudentMarks(marks || []);
      // Ensure savedReport has report_data structure
      const formattedReport = {
        ...savedReport,
        report_data: savedReport.report_data || reportData.report_data
      };
      setStudentReport(formattedReport);
      setShowReportCard(true);

      toast({
        title: "Report generated successfully!",
        description: `Report card ready for ${student.first_name} ${student.last_name}`,
      });

    } catch (error: any) {
      toast({
        title: "Error generating report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOverallGrade = (percentage: number): string => {
    return calculateGrade(percentage, academicSettings.grade_scale);
  };

  const generateComments = (percentage: number, grade: string): string => {
    if (percentage >= 90) {
      return "Excellent performance! Keep up the outstanding work and continue to challenge yourself.";
    } else if (percentage >= 80) {
      return "Very good performance. Continue working hard to maintain this high standard.";
    } else if (percentage >= 70) {
      return "Good performance overall. Focus on areas that need improvement for better results.";
    } else if (percentage >= 60) {
      return "Satisfactory performance. More effort is needed to improve in weaker subjects.";
    } else if (percentage >= 50) {
      return "Below average performance. Additional support and practice are recommended.";
    } else {
      return "Performance needs significant improvement. Please seek additional help and support.";
    }
  };

  const printReport = () => {
    window.print();
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const viewExistingReport = async (report: any) => {
    setIsLoading(true);
    try {
      // Fetch student data with school information
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, student_number, date_of_birth, school_id,
          classes!current_class_id (name),
          schools!school_id (id, name, logo_url)
        `)
        .eq('id', report.student_id)
        .single();

      if (studentError) throw studentError;

      // Fetch term data
      const { data: term, error: termError } = await supabase
        .from('terms')
        .select('*')
        .eq('id', report.term_id)
        .single();

      if (termError) throw termError;

      // Fetch marks for the student in the selected term
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select(`
          marks, grade,
          subjects (name, code)
        `)
        .eq('student_id', report.student_id)
        .eq('term_id', report.term_id);

      if (marksError) throw marksError;

      setStudentData(student);
      setTermData(term);
      setStudentMarks(marks || []);
      setStudentReport(report);
      // Load existing comments if available
      const reportData = report.report_data as any;
      setReportComments(reportData?.comments || generateComments(reportData?.average_percentage || 0, reportData?.overall_grade || 'N/A'));
      setShowReportCard(true);
      setShowExistingReports(false);

    } catch (error: any) {
      toast({
        title: "Error loading report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zambian-green">Reports Management</h2>
          {user && classes.length > 0 && (
            <p className="text-sm text-zambian-green/70 mt-1">
              Managing {classes.length} assigned class{classes.length > 1 ? 'es' : ''}: {classes.map(c => c.name).join(', ')}
            </p>
          )}
        </div>
        {showReportCard && (
          <Button
            onClick={printReport}
            className="bg-zambian-green hover:bg-zambian-green/90 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Print Report
          </Button>
        )}
      </div>

      {!showReportCard ? (
        <div className="space-y-6">
          {/* Show message if teacher has no assigned classes */}
          {user && classes.length === 0 && (
            <Card className="border-zambian-red/20">
              <CardContent className="p-6 text-center">
                <div className="flex flex-col items-center gap-4">
                  <FileText className="w-12 h-12 text-zambian-red/50" />
                  <div>
                    <h3 className="text-lg font-semibold text-zambian-red">No Classes Assigned</h3>
                    <p className="text-zambian-red/70 mt-2">
                      You don't have any classes assigned to you yet. Please contact the administrator to get classes assigned.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Only show report generation if teacher has classes or user is admin */}
          {(!user || classes.length > 0) && (
            <Card className="border-zambian-green/20">
              <CardHeader className="bg-zambian-green/5">
                <CardTitle className="flex items-center gap-2 text-zambian-green">
                  <Calculator className="w-5 h-5" />
                  Generate Student Report Card
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <label className="block text-sm font-medium mb-1">Select Student</label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} ({student.student_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Template</label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.school_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Comments Section - Only show when student and term are selected */}
                {selectedStudent && selectedTerm && (
                  <div className="space-y-2">
                    <Label htmlFor="report-comments">Teacher Comments (Optional)</Label>
                    <Textarea
                      id="report-comments"
                      placeholder="Add personalized comments for this student's report card. If left empty, default comments will be generated based on performance."
                      value={reportComments}
                      onChange={(e) => setReportComments(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      These comments will appear on the student's report card. You can edit them after generating the report.
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={generateReport}
                    disabled={!selectedStudent || !selectedTerm || isLoading}
                    className="bg-zambian-green hover:bg-zambian-green/90 text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {isLoading ? 'Generating...' : 'Generate Report Card'}
                  </Button>

                  {existingReports.length > 0 && (
                    <Button
                      onClick={() => setShowExistingReports(!showExistingReports)}
                      variant="outline"
                      className="border-zambian-green text-zambian-green hover:bg-zambian-green/10"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {showExistingReports ? 'Hide' : 'View'} Existing Reports ({existingReports.length})
                    </Button>
                  )}
                </div>

                {showExistingReports && existingReports.length > 0 && (
                  <div className="mt-4 p-4 bg-zambian-green/5 rounded-lg border border-zambian-green/20">
                    <h4 className="font-medium text-zambian-green mb-3">Previously Generated Reports</h4>
                    <div className="space-y-2">
                      {existingReports.map((report) => (
                        <div key={report.id} className="flex items-center justify-between p-3 bg-white rounded border border-zambian-green/10">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-zambian-green" />
                            <div>
                              <p className="text-sm font-medium text-zambian-green">
                                {report.students?.first_name} {report.students?.last_name} - {report.terms?.name}
                              </p>
                              <p className="text-xs text-zambian-green/70">
                                Generated: {new Date(report.generated_at).toLocaleDateString()} |
                                Average: {report.report_data?.average_percentage || 0}% |
                                Grade: {report.report_data?.overall_grade || 'N/A'} |
                                Position: {report.report_data?.position || 0}/{report.report_data?.class_size || 0}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => viewExistingReport(report)}
                            size="sm"
                            variant="outline"
                            className="border-zambian-green text-zambian-green hover:bg-zambian-green/10"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Logo Upload Section - Only for admin users */}
          <Card className="border-zambian-orange/20">
            <CardHeader className="bg-zambian-orange/5">
              <CardTitle className="flex items-center gap-2 text-zambian-orange">
                <Upload className="w-5 h-5" />
                Upload Logo for Template
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template to add logo" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.school_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Upload Logo</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={!selectedTemplate || isUploadingLogo}
                  />
                </div>
              </div>

              {logoPreview && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <button
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <Button
                    onClick={uploadLogoToTemplate}
                    disabled={isUploadingLogo || !selectedTemplate}
                    className="bg-zambian-orange hover:bg-zambian-orange/90 text-white"
                  >
                    {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </Button>
                </div>
              )}

              {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.logo_url && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Current Logo:</p>
                  <img
                    src={templates.find(t => t.id === selectedTemplate)?.logo_url!}
                    alt="Current logo"
                    className="w-20 h-20 object-cover rounded-lg border"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4 no-print">
            <Button
              onClick={() => setShowReportCard(false)}
              variant="outline"
            >
              <Eye className="w-4 h-4 mr-2" />
              Back to Selection
            </Button>
            <Button
              onClick={async () => {
                if (!studentReport || !selectedStudent || !selectedTerm) return;
                try {
                  setIsLoading(true);
                  const reportData = studentReport.report_data as any;
                  const updatedReportData = {
                    ...reportData,
                    comments: reportComments
                  };
                  
                  const { error } = await supabase
                    .from('reports')
                    .update({ report_data: updatedReportData })
                    .eq('id', studentReport.id);

                  if (error) throw error;

                  // Update local state
                  setStudentReport({
                    ...studentReport,
                    report_data: updatedReportData
                  });

                  toast({
                    title: "Comments Updated",
                    description: "Report comments have been saved successfully.",
                  });
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to update comments",
                    variant: "destructive",
                  });
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="bg-zambian-green hover:bg-zambian-green/90 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Save Comments
            </Button>
          </div>

          {/* Comments Editor - Only show when viewing report */}
          {studentReport && (
            <Card className="border-zambian-green/20 no-print">
              <CardHeader>
                <CardTitle className="text-zambian-green">Edit Report Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add personalized comments for this student's report card..."
                  value={reportComments}
                  onChange={(e) => setReportComments(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  These comments will appear on the student's report card. Click "Save Comments" to update.
                </p>
              </CardContent>
            </Card>
          )}

          {studentData && studentReport && termData && (
            <SimpleReportCard
              template={academicSettings.report_card_template}
              gradeScale={academicSettings.grade_scale}
              data={{
                studentName: `${studentData.first_name} ${studentData.last_name}`,
                studentId: studentData.student_number || studentData.id,
                class: studentData.classes?.name || 'N/A',
                term: termData.name,
                // Only include subjects where the student has marks
                // Students don't take all subjects, so we only show subjects they actually take
                subjects: studentMarks.map(mark => ({
                  name: mark.subjects?.name || 'Unknown Subject',
                  score: mark.marks,
                  maxScore: 100, // Assuming 100 is max score, could be configurable
                  grade: mark.grade
                })),
                totalScore: studentReport.report_data?.total_marks || 0,
                // Only count subjects the student actually takes (has marks for)
                totalMaxScore: studentMarks.length * 100, // Only subjects with marks
                averagePercentage: studentReport.report_data?.average_percentage || 0,
                rank: studentReport.report_data?.position || 0,
                totalStudents: studentReport.report_data?.class_size || 0,
                comments: reportComments || (studentReport.report_data as any)?.comments || generateComments(studentReport.report_data?.average_percentage || 0, studentReport.report_data?.overall_grade || 'N/A'),
                schoolName: (studentData?.schools as any)?.name || school?.name,
                schoolLogoUrl: (studentData?.schools as any)?.logo_url || school?.logo_url
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsManager;
