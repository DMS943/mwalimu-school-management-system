import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, BookOpen, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { studentsApi } from '@/api/students';
import { academicsApi } from '@/api/academics';
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

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Term {
  id: number;
  name: string;
  is_active: boolean;
}

interface Mark {
  id?: number;
  student: number;
  subject: number;
  term: number;
  marks: string;
  grade?: string;
}

const TeacherGrades = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [existingMarks, setExistingMarks] = useState<Mark[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [editingMarks, setEditingMarks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedTerm) {
      loadExistingMarks();
    }
  }, [selectedClass, selectedSubject, selectedTerm]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const [classesData, subjectsData, termsData] = await Promise.all([
        schoolsApi.getClasses(),
        schoolsApi.getSubjects(),
        schoolsApi.getTerms(),
      ]);

      const classesArray = Array.isArray(classesData) ? classesData : (classesData.results || []);
      const subjectsArray = Array.isArray(subjectsData) ? subjectsData : (subjectsData.results || []);
      const termsArray = Array.isArray(termsData) ? termsData : (termsData.results || []);

      // Filter classes where this teacher is assigned
      const myClasses = classesArray.filter((c: any) => c.class_teacher_user === user.id);
      setClasses(myClasses);
      setSubjects(subjectsArray);
      setTerms(termsArray);

      // Auto-select active term
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

  const loadExistingMarks = async () => {
    try {
      const marksData = await academicsApi.getMarks({
        subject: selectedSubject,
        term: selectedTerm,
      });
      
      const marksArray = Array.isArray(marksData) ? marksData : (marksData.results || []);
      setExistingMarks(marksArray);

      // Populate marks state with existing marks
      const marksMap: Record<number, string> = {};
      marksArray.forEach((mark: Mark) => {
        marksMap[mark.student] = mark.marks;
      });
      setMarks(marksMap);
    } catch (error) {
      console.error('Error loading marks:', error);
    }
  };

  const handleMarkChange = (studentId: number, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const getExistingMark = (studentId: number): Mark | undefined => {
    return existingMarks.find(m => m.student === studentId);
  };

  const handleSaveMark = async (studentId: number) => {
    if (!selectedSubject || !selectedTerm) {
      toast({
        title: 'Error',
        description: 'Please select subject and term',
        variant: 'destructive',
      });
      return;
    }

    const markValue = marks[studentId];
    if (!markValue || markValue === '') {
      toast({
        title: 'Error',
        description: 'Please enter a mark',
        variant: 'destructive',
      });
      return;
    }

    const numericMark = parseFloat(markValue);
    if (isNaN(numericMark) || numericMark < 0 || numericMark > 100) {
      toast({
        title: 'Error',
        description: 'Mark must be between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const existingMark = getExistingMark(studentId);
      const markData = {
        student: studentId,
        subject: parseInt(selectedSubject),
        term: parseInt(selectedTerm),
        marks: markValue,
      };

      if (existingMark?.id) {
        await academicsApi.updateMark(existingMark.id.toString(), markData);
        toast({
          title: 'Success',
          description: 'Mark updated successfully',
        });
      } else {
        await academicsApi.createMark(markData);
        toast({
          title: 'Success',
          description: 'Mark saved successfully',
        });
      }

      setEditingMarks(prev => ({ ...prev, [studentId]: false }));
      await loadExistingMarks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save mark',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMark = async (studentId: number) => {
    const existingMark = getExistingMark(studentId);
    if (!existingMark?.id) return;

    if (!confirm('Are you sure you want to delete this mark?')) return;

    setSaving(true);

    try {
      await academicsApi.deleteMark(existingMark.id.toString());
      toast({
        title: 'Success',
        description: 'Mark deleted successfully',
      });
      
      setMarks(prev => {
        const newMarks = { ...prev };
        delete newMarks[studentId];
        return newMarks;
      });
      
      await loadExistingMarks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete mark',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateGrade = (mark: number): string => {
    if (mark >= 90) return 'A+';
    if (mark >= 80) return 'A';
    if (mark >= 70) return 'B';
    if (mark >= 60) return 'C';
    if (mark >= 50) return 'D';
    return 'F';
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

  const canEnterGrades = selectedClass && selectedSubject && selectedTerm && students.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-green-800">Enter Grades</h1>
              <p className="text-sm text-gray-600">Record student marks and assessments</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Class, Subject, and Term</CardTitle>
            <CardDescription>Choose the class, subject, and term to enter grades</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name} ({subject.code})
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
              </div>
            )}
          </CardContent>
        </Card>

        {canEnterGrades && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Grade Entry
              </CardTitle>
              <CardDescription>
                {students.length} students in {classes.find(c => c.id.toString() === selectedClass)?.name} - 
                {' '}{subjects.find(s => s.id.toString() === selectedSubject)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {students.map((student) => {
                  const existingMark = getExistingMark(student.id);
                  const isEditing = editingMarks[student.id];
                  const currentMark = marks[student.id];
                  const numericMark = currentMark ? parseFloat(currentMark) : null;
                  const grade = numericMark !== null && !isNaN(numericMark) ? calculateGrade(numericMark) : existingMark?.grade;

                  return (
                    <div key={student.id} className="flex items-center gap-4 p-4 border rounded-lg bg-white">
                      <div className="flex-1">
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{student.student_number}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0-100"
                            value={currentMark || ''}
                            onChange={(e) => {
                              handleMarkChange(student.id, e.target.value);
                              setEditingMarks(prev => ({ ...prev, [student.id]: true }));
                            }}
                            className="text-center"
                          />
                        </div>
                        
                        {grade && (
                          <div className={`w-12 text-center ${getGradeColor(grade)}`}>
                            {grade}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          {(isEditing || !existingMark) && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveMark(student.id)}
                              disabled={saving || !currentMark}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                          )}
                          
                          {existingMark && !isEditing && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMarks(prev => ({ ...prev, [student.id]: true }))}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {existingMark && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteMark(student.id)}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !canEnterGrades && selectedClass && students.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <p>No students found in the selected class.</p>
            </CardContent>
          </Card>
        )}

        {!loading && !selectedClass && (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <p>Please select a class, subject, and term to begin entering grades.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TeacherGrades;
