import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Award, Calendar, FileText, BookOpen, TrendingUp, User, GraduationCap, CheckCircle, XCircle, Clock, AlertCircle, Download, Eye } from 'lucide-react';
import { studentsApi } from '@/api/students';
import { academicsApi } from '@/api/academics';
import { reportsApi } from '@/api/reports';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface ParentDashboardProps {
  user: User;
  onLogout: () => void;
}

const ParentDashboard = ({ user, onLogout }: ParentDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [previewReport, setPreviewReport] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchChildData(selectedChild.id);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await studentsApi.getStudents();
      console.log('API response:', response);
      console.log('Current user ID:', user.id);
      
      // Handle paginated response - the actual data is in response.results
      const students = response.results || response;
      console.log('Students array:', students);
      
      // Filter students linked to this parent
      // The parent_user field contains the user ID
      const myChildren = students.filter((student: any) => {
        console.log(`Student ${student.first_name} ${student.last_name} - parent_user:`, student.parent_user);
        return student.parent_user === user.id;
      });
      
      console.log('My children:', myChildren);
      setChildren(myChildren);
      
      if (myChildren.length > 0) {
        setSelectedChild(myChildren[0]);
      }
    } catch (error: any) {
      console.error('Error fetching children:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load student information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = async (studentId: number) => {
    try {
      // Fetch grades
      const gradesResponse = await academicsApi.getMarks({ student: studentId });
      const gradesData = gradesResponse.results || gradesResponse;
      setGrades(Array.isArray(gradesData) ? gradesData : []);

      // Fetch attendance
      const attendanceResponse = await studentsApi.getAttendance({ student: studentId });
      const attendanceData = attendanceResponse.results || attendanceResponse;
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);

      // Fetch reports
      const reportsResponse = await reportsApi.getReports({ student: studentId });
      const reportsData = reportsResponse.results || reportsResponse;
      setReports(Array.isArray(reportsData) ? reportsData : []);
    } catch (error) {
      console.error('Error fetching child data:', error);
    }
  };

  const calculateAverageGrade = () => {
    if (!grades || grades.length === 0) return 'N/A';
    const total = grades.reduce((sum, grade) => sum + (grade.total_marks || 0), 0);
    const avg = total / grades.length;
    return avg.toFixed(1);
  };

  const getAttendanceStats = () => {
    if (!attendance || attendance.length === 0) {
      return { total: 0, present: 0, absent: 0, late: 0, percentage: '0' };
    }
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
    return { total, present, absent, late, percentage };
  };

  const getGradeColor = (grade: string) => {
    if (['A+', 'A'].includes(grade)) return 'text-green-600';
    if (['B+', 'B'].includes(grade)) return 'text-blue-600';
    if (['C+', 'C'].includes(grade)) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'excused': return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };

  const handlePreviewReport = async (reportId: number) => {
    try {
      const report = await reportsApi.previewReport(reportId.toString());
      setPreviewReport(report);
      setShowPreview(true);
    } catch (error: any) {
      console.error('Error previewing report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report preview',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadReport = () => {
    if (!previewReport) return;
    
    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Report Card - ${previewReport.student?.first_name || 'Student'} ${previewReport.student?.last_name || ''}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .summary { margin-top: 20px; }
              @media print {
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Academic Report Card</h1>
              <h3>${previewReport.term?.name || 'Term'}</h3>
            </div>
            <div class="info">
              <p><strong>Student:</strong> ${previewReport.student?.first_name || ''} ${previewReport.student?.last_name || ''}</p>
              <p><strong>Student Number:</strong> ${previewReport.student?.student_number || 'N/A'}</p>
              <p><strong>Class:</strong> ${previewReport.class_assigned?.name || 'N/A'}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                ${previewReport.marks?.map((mark: any) => `
                  <tr>
                    <td>${mark.subject?.name || mark.subject_name || 'N/A'}</td>
                    <td>${mark.total_marks || 0}%</td>
                    <td>${mark.grade || 'N/A'}</td>
                  </tr>
                `).join('') || '<tr><td colspan="3">No marks available</td></tr>'}
              </tbody>
            </table>
            <div class="summary">
              <p><strong>Total Marks:</strong> ${previewReport.total_marks || 0}</p>
              <p><strong>Average:</strong> ${previewReport.average || 0}%</p>
              <p><strong>Grade:</strong> ${previewReport.grade || 'N/A'}</p>
              <p><strong>Class Position:</strong> ${previewReport.class_position || 'N/A'}</p>
              ${previewReport.teacher_comment ? `<p><strong>Teacher's Comment:</strong> ${previewReport.teacher_comment}</p>` : ''}
            </div>
            <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer;">Print / Download PDF</button>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-purple-800">Parent Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.full_name || user.username}</span>
              <Button onClick={onLogout} variant="destructive">Logout</Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>No Children Linked</CardTitle>
              <CardDescription>You don't have any children linked to your account yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Please contact the school administrator to link your child's account, or use the signup process with your child's student ID or name.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-800">Parent Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.full_name || user.username}</span>
            <Button onClick={onLogout} variant="destructive">Logout</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Child Selector */}
        {children.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Child</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {children.map((child) => (
                  <Button
                    key={child.id}
                    variant={selectedChild?.id === child.id ? 'default' : 'outline'}
                    onClick={() => setSelectedChild(child)}
                  >
                    {child.first_name} {child.last_name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Info Card */}
        {selectedChild && (
          <Card className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedChild.first_name} {selectedChild.last_name}</h2>
                  <p className="text-purple-100">Student Number: {selectedChild.student_number}</p>
                  <p className="text-purple-100">Class: {selectedChild.class_name || 'Not Assigned'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calculateAverageGrade()}%</div>
              <p className="text-xs text-muted-foreground">Across all subjects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.percentage}%</div>
              <p className="text-xs text-muted-foreground">{stats.present} of {stats.total} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{grades.length}</div>
              <p className="text-xs text-muted-foreground">Enrolled subjects</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed information */}
        <Tabs defaultValue="grades" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grades">Grades</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="grades" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Academic Performance</CardTitle>
                <CardDescription>Current grades across all subjects</CardDescription>
              </CardHeader>
              <CardContent>
                {grades.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No grades available yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead className="text-right">Total Marks</TableHead>
                        <TableHead className="text-right">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="font-medium">{grade.subject_name}</TableCell>
                          <TableCell>{grade.term_name}</TableCell>
                          <TableCell className="text-right">{grade.total_marks}%</TableCell>
                          <TableCell className={`text-right font-bold ${getGradeColor(grade.grade)}`}>
                            {grade.grade}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>Recent attendance history</CardDescription>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No attendance records available</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.slice(0, 10).map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getAttendanceIcon(record.status)}
                              <span className="capitalize">{record.status}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{record.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Report Cards</CardTitle>
                <CardDescription>View and download academic reports</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No reports available yet</p>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="font-medium">{report.term_name} Report Card</p>
                            <p className="text-sm text-gray-600">
                              Average: {report.average}% | Grade: {report.grade} | Position: {report.class_position}
                            </p>
                            {report.teacher_comment && (
                              <p className="text-sm text-gray-500 mt-1">Comment: {report.teacher_comment}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePreviewReport(report.id)}
                          >
                            Preview
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleDownloadReport(report.id)}
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Report Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
            <DialogDescription>
              {previewReport?.term?.name || 'Academic Report'}
            </DialogDescription>
          </DialogHeader>
          {previewReport && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Student Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-medium">Name:</span> {previewReport.student?.first_name} {previewReport.student?.last_name}</p>
                  <p><span className="font-medium">Student Number:</span> {previewReport.student?.student_number}</p>
                  <p><span className="font-medium">Class:</span> {previewReport.class_assigned?.name || 'N/A'}</p>
                  <p><span className="font-medium">Term:</span> {previewReport.term?.name}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Subject Grades</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                      <TableHead className="text-right">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewReport.marks?.map((mark: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{mark.subject?.name || mark.subject_name || 'N/A'}</TableCell>
                        <TableCell className="text-right">{mark.total_marks || 0}%</TableCell>
                        <TableCell className="text-right font-bold">{mark.grade || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-medium">Total Marks:</span> {previewReport.total_marks || 0}</p>
                  <p><span className="font-medium">Average:</span> {previewReport.average || 0}%</p>
                  <p><span className="font-medium">Grade:</span> {previewReport.grade || 'N/A'}</p>
                  <p><span className="font-medium">Class Position:</span> {previewReport.class_position || 'N/A'}</p>
                </div>
                {previewReport.teacher_comment && (
                  <div className="mt-3">
                    <p className="font-medium">Teacher's Comment:</p>
                    <p className="text-sm mt-1">{previewReport.teacher_comment}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
                <Button onClick={handleDownloadReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Print / Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentDashboard;
