import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, BookOpen, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { studentsApi } from '@/api/students';
import { usersApi } from '@/api/users';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeTerm: string;
}

const AdminDashboard = ({ user, onLogout }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState('School Management System');
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeTerm: '-',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, studentsData, usersData, classesData, termsData] = await Promise.all([
        schoolsApi.getSettings().catch(() => null),
        studentsApi.getStudents().catch(() => []),
        usersApi.getUsers().catch(() => []),
        schoolsApi.getClasses().catch(() => []),
        schoolsApi.getTerms().catch(() => []),
      ]);

      if (settingsData?.name) {
        setSchoolName(settingsData.name);
      }

      const studentsArray = Array.isArray(studentsData) ? studentsData : (studentsData?.results || []);
      const usersArray = Array.isArray(usersData) ? usersData : (usersData?.results || []);
      const classesArray = Array.isArray(classesData) ? classesData : (classesData?.results || []);
      const termsArray = Array.isArray(termsData) ? termsData : (termsData?.results || []);

      const teachers = usersArray.filter((u: any) => u.role === 'teacher' || u.role === 'hod' || u.role === 'headteacher');
      const activeTerm = termsArray.find((t: any) => t.is_active);

      setStats({
        totalStudents: studentsArray.length,
        totalTeachers: teachers.length,
        totalClasses: classesArray.length,
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
              <h1 className="text-2xl font-bold text-green-800">Admin Dashboard</h1>
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
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalStudents}</div>
              <p className="text-xs text-gray-500">
                {stats.totalStudents === 0 ? 'No students yet' : `${stats.totalStudents} enrolled`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalTeachers}</div>
              <p className="text-xs text-gray-500">
                {stats.totalTeachers === 0 ? 'No teachers yet' : `${stats.totalTeachers} staff members`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.totalClasses}</div>
              <p className="text-xs text-gray-500">
                {stats.totalClasses === 0 ? 'No classes yet' : `${stats.totalClasses} classes`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Term</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '...' : stats.activeTerm}</div>
              <p className="text-xs text-gray-500">
                {stats.activeTerm === 'No active term' ? 'Set up terms' : 'Current academic term'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/admin/users')}
          >
            <CardHeader>
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>Add and manage teachers, students, and parents</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/admin/classes')}
          >
            <CardHeader>
              <CardTitle>Manage Classes</CardTitle>
              <CardDescription>Create and organize classes and subjects</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/admin/students')}
          >
            <CardHeader>
              <CardTitle>Manage Students</CardTitle>
              <CardDescription>Student enrollment and class assignments</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/admin/terms')}
          >
            <CardHeader>
              <CardTitle>Academic Terms</CardTitle>
              <CardDescription>Set up and manage academic terms</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/admin/reports')}
          >
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>Generate and view academic reports</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/admin/settings')}
          >
            <CardHeader>
              <CardTitle>School Settings</CardTitle>
              <CardDescription>Configure school information and preferences</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="hover:shadow-lg transition cursor-pointer"
            onClick={() => navigate('/admin/academic-settings')}
          >
            <CardHeader>
              <CardTitle>Academic Settings</CardTitle>
              <CardDescription>Manage subjects and departments</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
