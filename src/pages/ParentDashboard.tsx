import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, Calendar, FileText } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-800">Parent Dashboard</h1>
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
        {/* Linked Students */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Children</CardTitle>
            <CardDescription>Students linked to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">No students linked yet. Please contact the school administrator.</p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>View Grades</CardTitle>
              <CardDescription>Check your child's academic performance</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>Monitor attendance and absences</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Report Cards</CardTitle>
              <CardDescription>Download academic reports</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Class Schedule</CardTitle>
              <CardDescription>View your child's timetable</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>See progress over time</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition cursor-pointer">
            <CardHeader>
              <CardTitle>Contact Teachers</CardTitle>
              <CardDescription>Get in touch with educators</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ParentDashboard;
