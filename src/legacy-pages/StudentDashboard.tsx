import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Award, Calendar, FileText } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

const StudentDashboard = ({ user, onLogout }: StudentDashboardProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-800">Student Dashboard</h1>
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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-500">No subjects enrolled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <Award className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-gray-500">No grades yet</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-gray-500">No records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Class Rank</CardTitle>
              <Award className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-gray-500">Not ranked yet</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>My Grades</CardTitle>
              <CardDescription>View your marks and performance</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>My Attendance</CardTitle>
              <CardDescription>Check your attendance record</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Report Cards</CardTitle>
              <CardDescription>Download your academic reports</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Class Schedule</CardTitle>
              <CardDescription>View your class timetable</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>My Subjects</CardTitle>
              <CardDescription>See all your enrolled subjects</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>View detailed performance charts</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
