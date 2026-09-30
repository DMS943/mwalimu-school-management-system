import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, BookOpen, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { studentsApi } from '@/api/students';
import { toast } from '@/hooks/use-toast';

interface Class {
  id: number;
  name: string;
  grade_level: number;
  department?: number;
  class_teacher?: string;
}

const TeacherClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const [classesData, studentsData] = await Promise.all([
        schoolsApi.getClasses(),
        studentsApi.getStudents(),
      ]);

      const classesArray = Array.isArray(classesData) ? classesData : (classesData.results || []);
      const studentsArray = Array.isArray(studentsData) ? studentsData : (studentsData.results || []);

      // Filter classes where this teacher is assigned
      const myClasses = classesArray.filter((c: any) => c.class_teacher_user === user.id);
      setClasses(myClasses);

      // Count students per class
      const counts: Record<number, number> = {};
      myClasses.forEach((cls: any) => {
        counts[cls.id] = studentsArray.filter((s: any) => s.class_assigned === cls.id).length;
      });
      setStudentCounts(counts);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-green-800">My Classes</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Classes you are currently teaching</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Classes ({classes.length})</CardTitle>
            <CardDescription>Classes assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No classes assigned yet.</p>
                <p className="text-sm mt-2">Contact your administrator to get assigned to classes.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <Card key={cls.id} className="hover:shadow-lg transition">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{cls.name}</CardTitle>
                          <CardDescription>Grade {cls.grade_level}</CardDescription>
                        </div>
                        <BookOpen className="h-5 w-5 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{studentCounts[cls.id] || 0} students</span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => navigate('/teacher/grades')}
                        >
                          Enter Grades
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate('/teacher/attendance')}
                        >
                          Attendance
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TeacherClasses;
