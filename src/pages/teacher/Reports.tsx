import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Loader2, Download, Eye, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { studentsApi } from '@/api/students';
import { reportsApi } from '@/api/reports';
import { toast } from '@/hooks/use-toast';

interface Class {
  id: number;
  name: string;
  grade_level: number;
}

interface Student {
  id: number;
  student_number: string;
  first_name: string;
  last_name: string;
}

interface Term {
  id: number;
  name: string;
  is_active: boolean;
}

interface ReportPreview {
  id: number;
  student: {
    id: number;
    student_number: string;
    first_name: string;
    last_name: string;
    class_name: string;
    grade_level: number;
  };
  term: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  marks: Array<{
    subject: string;
    subject_code: string;
    marks: number;
    grade: string;
  }>;
  total_marks: number;
  average_percentage: number;
  overall_grade: string;
  position: number | null;
  class_size: number | null;
  teacher_comment: string | null;
  headteacher_comment: string | null;
  generated_at: string;
}

const TeacherReports = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [teacherComment, setTeacherComment] = useState('');
  
  const [reportPreview, setReportPreview] = useState<ReportPreview | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const [classesData, termsData] = await Promise.all([
        schoolsApi.getClasses(),
        schoolsApi.getTerms(),
      ]);

      const classesArray = Array.isArray(classesData) ? classesData : (classesData.results || []);
      const termsArray = Array.isArray(termsData) ? termsData : (termsData.results || []);

      const myClasses = classesArray.filter((c: any) => c.class_teacher_user === user.id);
      setClasses(myClasses);
      setTerms(termsArray);

      const activeTerm = termsArray.find((t: any) => t.is_active);
      if (activeTerm) {
        setSelectedTerm(activeTerm.id.toString());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const studentsData = await studentsApi.getStudents({ class_assigned: selectedClass });
      const studentsArray = Array.isArray(studentsData) ? studentsData : (studentsData.results || []);
      setStudents(studentsArray);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedStudent || !selectedTerm) {
      toast({
        title: 'Error',
        description: 'Please select a student and term',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);

    try {
      const response = await reportsApi.generateReport({
        student_id: parseInt(selectedStudent),
        term_id: parseInt(selectedTerm),
      });

      setReportId(response.report.id);
      
      toast({
        title: 'Success',
        description: response.message,
      });

      await handlePreviewReport(response.report.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewReport = async (id?: number) => {
    const previewId = id || reportId;
    
    if (!previewId) {
      toast({
        title: 'Error',
        description: 'No report to preview',
        variant: 'destructive',
      });
      return;
    }

    setPreviewing(true);

    try {
      const preview = await reportsApi.previewReport(previewId.toString());
      setReportPreview(preview);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to preview report',
        variant: 'destructive',
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSaveComment = async () => {
    if (!reportId) {
      toast({
        title: 'Error',
        description: 'No report to update',
        variant: 'destructive',
      });
      return;
    }

    try {
      await reportsApi.updateReport(reportId.toString(), {
        teacher_comment: teacherComment,
      });

      toast({
        title: 'Success',
        description: 'Comment saved successfully',
      });

      await handlePreviewReport();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save comment',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReport = () => {
    if (!reportPreview) return;

    window.print();
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'text-green-600 font-bold';
      case 'B':
        return 'text-blue-600 font-bold';
      case 'C':
        return 'text-yellow-600 font-bold';
      case 'D':
        return 'text-orange-600 font-bold';
      case 'F':
        return 'text-red-600 font-bold';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-green-800">Generate Reports</h1>
              <p className="text-sm text-gray-600">Create and preview student reports</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Selection */}
          <div className="lg:col-span-1 print:hidden">
            <Card>
              <CardHeader>
                <CardTitle>Select Student</CardTitle>
                <CardDescription>Choose class, student, and term</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                              {cls.name} - Grade {cls.grade_level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Student</Label>
                      <Select 
                        value={selectedStudent} 
                        onValueChange={setSelectedStudent}
                        disabled={!selectedClass}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.first_name} {student.last_name} ({student.student_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Term</Label>
                      <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          {terms.map((term) => (
                            <SelectItem key={term.id} value={term.id.toString()}>
                              {term.name} {term.is_active && '(Active)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleGenerateReport} 
                      className="w-full"
                      disabled={!selectedStudent || !selectedTerm || generating}
                    >
                      {generating ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        <><RefreshCw className="h-4 w-4 mr-2" /> Generate Report</>
                      )}
                    </Button>

                    {reportId && (
                      <>
                        <Button 
                          onClick={() => handlePreviewReport()} 
                          variant="outline"
                          className="w-full"
                          disabled={previewing}
                        >
                          {previewing ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
                          ) : (
                            <><Eye className="h-4 w-4 mr-2" /> Preview Report</>
                          )}
                        </Button>

                        <div className="space-y-2">
                          <Label>Teacher Comment</Label>
                          <Textarea
                            placeholder="Enter your comment about the student's performance..."
                            value={teacherComment}
                            onChange={(e) => setTeacherComment(e.target.value)}
                            rows={4}
                          />
                          <Button 
                            onClick={handleSaveComment}
                            variant="secondary"
                            className="w-full"
                          >
                            Save Comment
                          </Button>
                        </div>

                        <Button 
                          onClick={handleDownloadReport}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={!reportPreview}
                        >
                          <Download className="h-4 w-4 mr-2" /> Download PDF
                        </Button>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-2">
            {reportPreview ? (
              <Card className="print:shadow-none print:border-0">
                <CardHeader className="print:pb-4">
                  <div className="text-center">
                    <CardTitle className="text-2xl">Student Report Card</CardTitle>
                    <CardDescription className="text-lg mt-2">
                      {reportPreview.term.name}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Student Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg print:bg-white print:border">
                    <div>
                      <p className="text-sm text-gray-600">Student Name</p>
                      <p className="font-semibold">
                        {reportPreview.student.first_name} {reportPreview.student.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Student Number</p>
                      <p className="font-semibold">{reportPreview.student.student_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Class</p>
                      <p className="font-semibold">
                        {reportPreview.student.class_name} - Grade {reportPreview.student.grade_level}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Term</p>
                      <p className="font-semibold">{reportPreview.term.name}</p>
                    </div>
                  </div>

                  {/* Marks Table */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Subject Performance</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left p-3 border-b">Subject</th>
                            <th className="text-center p-3 border-b">Code</th>
                            <th className="text-center p-3 border-b">Marks</th>
                            <th className="text-center p-3 border-b">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportPreview.marks.map((mark, index) => (
                            <tr key={index} className="border-b last:border-0">
                              <td className="p-3">{mark.subject}</td>
                              <td className="text-center p-3">{mark.subject_code}</td>
                              <td className="text-center p-3">{mark.marks}</td>
                              <td className={`text-center p-3 ${getGradeColor(mark.grade)}`}>
                                {mark.grade}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Total Marks</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {reportPreview.total_marks}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Average</p>
                      <p className="text-2xl font-bold text-green-600">
                        {reportPreview.average_percentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Overall Grade</p>
                      <p className={`text-2xl font-bold ${getGradeColor(reportPreview.overall_grade)}`}>
                        {reportPreview.overall_grade}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg text-center">
                      <p className="text-sm text-gray-600">Position</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {reportPreview.position || 'N/A'} / {reportPreview.class_size || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Comments */}
                  {reportPreview.teacher_comment && (
                    <div className="p-4 bg-gray-50 rounded-lg print:bg-white print:border">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Teacher's Comment</p>
                      <p className="text-gray-800">{reportPreview.teacher_comment}</p>
                    </div>
                  )}

                  {reportPreview.headteacher_comment && (
                    <div className="p-4 bg-gray-50 rounded-lg print:bg-white print:border">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Headteacher's Comment</p>
                      <p className="text-gray-800">{reportPreview.headteacher_comment}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-center text-sm text-gray-500 pt-4 border-t">
                    <p>Generated on {new Date(reportPreview.generated_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No Report Preview</p>
                  <p className="text-sm mt-2">
                    Select a student and term, then click "Generate Report" to preview
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none, .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TeacherReports;
