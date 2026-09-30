import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, FileText, Download, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { studentsApi } from '@/api/students';
import { toast } from '@/hooks/use-toast';

interface Class {
  id: number;
  name: string;
  grade_level: number;
}

interface Term {
  id: number;
  name: string;
  is_active: boolean;
}

interface Student {
  id: number;
  student_number: string;
  first_name: string;
  last_name: string;
}

const AdminReports = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesData, termsData] = await Promise.all([
        schoolsApi.getClasses(),
        schoolsApi.getTerms(),
      ]);
      
      const classesArray = Array.isArray(classesData) ? classesData : (classesData.results || []);
      const termsArray = Array.isArray(termsData) ? termsData : (termsData.results || []);
      
      setClasses(classesArray);
      setTerms(termsArray);
      
      const activeTerm = termsArray.find((t: Term) => t.is_active);
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
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast({
        title: 'Error',
        description: 'Please select a report type',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);

    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Success',
        description: 'Report generated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    { value: 'student', label: 'Student Report Card', requiresStudent: true },
    { value: 'class', label: 'Class Performance Report', requiresClass: true },
    { value: 'term', label: 'Term Summary Report', requiresTerm: true },
    { value: 'attendance', label: 'Attendance Report', requiresClass: true },
    { value: 'performance', label: 'Performance Analytics', requiresTerm: true },
  ];

  const selectedReportType = reportTypes.find(r => r.value === selectedReport);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-green-800">Reports</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Select report type and parameters</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select value={selectedReport} onValueChange={setSelectedReport}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedReportType?.requiresTerm && (
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
                )}

                {selectedReportType?.requiresClass && (
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
                )}

                {selectedReportType?.requiresStudent && selectedClass && (
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
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
                )}

                <Button 
                  onClick={handleGenerateReport} 
                  className="w-full" 
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((type) => (
            <Card 
              key={type.value}
              className="hover:shadow-lg transition cursor-pointer"
              onClick={() => setSelectedReport(type.value)}
            >
              <CardHeader>
                <FileText className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>{type.label}</CardTitle>
                <CardDescription>
                  {type.requiresStudent && 'Requires student selection'}
                  {type.requiresClass && 'Requires class selection'}
                  {type.requiresTerm && 'Requires term selection'}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminReports;
