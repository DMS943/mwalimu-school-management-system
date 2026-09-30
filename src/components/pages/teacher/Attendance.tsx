import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, Loader2, Save } from 'lucide-react';
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

interface Student {
  id: number;
  student_number: string;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
  student_id: number;
  status: string;
}

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [attendance, setAttendance] = useState<Record<number, string>>({});

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const classesData = await schoolsApi.getClasses();
      const classesArray = Array.isArray(classesData) ? classesData : (classesData.results || []);
      setClasses(classesArray);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const studentsData = await studentsApi.getStudents({ class_assigned: selectedClass });
      const studentsArray = Array.isArray(studentsData) ? studentsData : (studentsData.results || []);
      setStudents(studentsArray);
      
      // Initialize attendance with 'present' as default
      const initialAttendance: Record<number, string> = {};
      studentsArray.forEach((student: Student) => {
        initialAttendance[student.id] = 'present';
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    }
  };

  const handleAttendanceChange = (studentId: number, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClass) {
      toast({
        title: 'Error',
        description: 'Please select a class',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
        student: parseInt(studentId),
        date: selectedDate,
        status: status,
        notes: '',
      }));

      // Save attendance records
      await Promise.all(
        attendanceRecords.map(record => studentsApi.createAttendance(record))
      );

      toast({
        title: 'Success',
        description: `Attendance saved for ${attendanceRecords.length} students`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save attendance',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'excused':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const canTakeAttendance = selectedClass && students.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-green-800">Take Attendance</h1>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {today}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Class and Date</CardTitle>
            <CardDescription>Choose the class and date for attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label>Date</Label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {canTakeAttendance && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Register</CardTitle>
              <CardDescription>
                {students.length} students in {classes.find(c => c.id.toString() === selectedClass)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="space-y-3 mb-6">
                  {students.map((student) => (
                    <div key={student.id} className={`flex items-center gap-4 p-3 border-2 rounded-lg ${getStatusColor(attendance[student.id] || 'present')}`}>
                      <div className="flex-1">
                        <p className="font-medium">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="text-sm opacity-75">{student.student_number}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceChange(student.id, 'present')}
                          className={attendance[student.id] === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                          Present
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceChange(student.id, 'absent')}
                          className={attendance[student.id] === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          Absent
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceChange(student.id, 'late')}
                          className={attendance[student.id] === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                        >
                          Late
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={attendance[student.id] === 'excused' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceChange(student.id, 'excused')}
                          className={attendance[student.id] === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                        >
                          Excused
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Attendance
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {!loading && !canTakeAttendance && selectedClass && students.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <p>No students found in the selected class.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TeacherAttendance;
