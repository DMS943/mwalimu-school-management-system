import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, ClipboardCheck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { studentsApi } from '@/api/students';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

interface Stats {
  myClasses: number;
  myStudents: number;
  activeTerm: string;
}

const TeacherDashboard = ({ user, onLogout }: TeacherDashboardProps) => {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('School Management System');
  const [stats, setStats] = useState<Stats>({
    myClasses: 0,
    myStudents: 0,
    activeTerm: '-',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, classesData, studentsData, termsData] = await Promise.all([
        schoolsApi.getSettings().catch(() => null),
        schoolsApi.getClasses().catch(() => []),
        studentsApi.getStudents().catch(() => []),
        schoolsApi.getTerms().catch(() => []),
      ]);

      if (settingsData?.name) {
        setSchoolName(settingsData.name);
      }

      const classesArray = Array.isArray(classesData) ? classesData : (classesData?.results || []);
      const studentsArray = Array.isArray(studentsData) ? studentsData : (studentsData?.results || []);
      const termsArray = Array.isArray(termsData) ? termsData : (termsData?.results || []);

      // Filter classes where this teacher is assigned
      const myClasses = classesArray.filter((c: any) => c.class_teacher_user === user.id);
      
      // Get students in teacher's classes
      const myClassIds = myClasses.map((c: any) => c.id);
      const myStudents = studentsArray.filter((s: any) => myClassIds.includes(s.class_assigned));

      const activeTerm = termsArray.find((t: any) => t.is_active);

      setStats({
        myClasses: myClasses.length,
        myStudents: myStudents.length,
        activeTerm: activeTerm?.name || 'No active term',
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-green-800">Teacher Dashboard</h1>
              <p className="text-sm text-gray-600">{schoolName}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.first_name || user.username}</span>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.myClasses}</div>
              <p className="text-xs text-gray-500">
                {stats.myClasses === 0 ? 'No classes assigned' : `${stats.myClasses} class${stats.myClasses > 1 ? 'es' : ''}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Students</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.myStudents}</div>
              <p className="text-xs text-gray-500">
                {stats.myStudents === 0 ? 'No students yet' : `${stats.myStudents} student${stats.myStudents > 1 ? 's' : ''}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Term</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.activeTerm}</div>
              <p className="text-xs text-gray-500">
                {stats.activeTerm === 'No active term' ? 'No term set' : 'Current term'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-gray-500">Available actions</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/teacher/classes')}
          >
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>View and manage your assigned classes</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/teacher/grades')}
          >
            <CardHeader>
              <CardTitle>Enter Grades</CardTitle>
              <CardDescription>Record student marks and assessments</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/teacher/attendance')}
          >
            <CardHeader>
              <CardTitle>Take Attendance</CardTitle>
              <CardDescription>Mark student attendance for today</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/teacher/students')}
          >
            <CardHeader>
              <CardTitle>View Students</CardTitle>
              <CardDescription>See all students in your classes</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/teacher/reports')}
          >
            <CardHeader>
              <CardTitle>Generate Reports</CardTitle>
              <CardDescription>Create and preview student report cards</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Class Schedule</CardTitle>
              <CardDescription>View your teaching schedule</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
