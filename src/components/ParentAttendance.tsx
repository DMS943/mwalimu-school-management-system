import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAcademicSettings } from '@/hooks/useAcademicSettings';
import { Calendar, CheckCircle2, XCircle, Clock, UserCheck, TrendingUp } from 'lucide-react';

interface ParentAttendanceProps {
  user: User;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  reason?: string;
}

const ParentAttendance = ({ user }: ParentAttendanceProps) => {
  const { settings: academicSettings } = useAcademicSettings(user);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Default to last month
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendanceRate: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChild && startDate && endDate) {
      fetchAttendance();
    }
  }, [selectedChild, startDate, endDate]);

  const fetchChildren = async () => {
    try {
      // Get the parent's admin_users.id
      const { data: parentAdminUser, error: adminUserError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'parent')
        .single();

      if (adminUserError || !parentAdminUser) {
        console.error('Parent admin user not found:', adminUserError);
        return;
      }

      // Fetch children
      const { data: childrenData, error: childrenError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .eq('parent_user_id', parentAdminUser.id)
        .order('first_name, last_name');

      if (childrenError) throw childrenError;

      setChildren(childrenData || []);
      if (childrenData && childrenData.length > 0) {
        setSelectedChild(childrenData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching children:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch children',
        variant: 'destructive',
      });
    }
  };

  const fetchAttendance = async () => {
    if (!selectedChild) return;

    setLoading(true);
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, date, status, reason')
        .eq('student_id', selectedChild)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (attendanceError) {
        // If attendance table doesn't exist or has RLS issues, show empty state
        console.error('Error fetching attendance:', attendanceError);
        setAttendanceRecords([]);
        setStats({
          totalDays: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0
        });
        toast({
          title: 'No Attendance Data',
          description: 'Attendance records are not available for the selected period.',
          variant: 'default',
        });
        return;
      }

      setAttendanceRecords(attendanceData || []);

      // Calculate statistics
      const totalDays = attendanceData?.length || 0;
      const present = attendanceData?.filter(a => a.status === 'present').length || 0;
      const absent = attendanceData?.filter(a => a.status === 'absent').length || 0;
      const late = attendanceData?.filter(a => a.status === 'late').length || 0;
      const excused = attendanceData?.filter(a => a.status === 'excused').length || 0;
      const attendanceRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

      setStats({
        totalDays,
        present,
        absent,
        late,
        excused,
        attendanceRate
      });
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch attendance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'excused':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      default:
        return null;
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

  if (children.length === 0) {
    return (
      <Card className="border-zambian-green/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-zambian-red">No children linked to your account.</p>
            <p className="text-sm text-gray-500 mt-2">Please link your children first to view their attendance.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-zambian-green/20">
        <CardHeader>
          <CardTitle className="text-zambian-green flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            View Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="child-select">Select Child</Label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger id="child-select">
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.first_name} {child.last_name} ({child.student_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedChild && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="border-zambian-green/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className={`w-6 h-6 mx-auto mb-2 ${stats.attendanceRate >= academicSettings.attendance_required_percentage ? 'text-green-600' : 'text-red-600'}`} />
                <p className="text-sm text-zambian-red">Attendance Rate</p>
                <p className={`text-2xl font-bold ${stats.attendanceRate >= academicSettings.attendance_required_percentage ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.attendanceRate}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Required: {academicSettings.attendance_required_percentage}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-zambian-green/20">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-zambian-red">Present</p>
                <p className="text-2xl font-bold text-zambian-green">{stats.present}</p>
              </CardContent>
            </Card>

            <Card className="border-zambian-green/20">
              <CardContent className="p-4 text-center">
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-zambian-red">Absent</p>
                <p className="text-2xl font-bold text-zambian-green">{stats.absent}</p>
              </CardContent>
            </Card>

            <Card className="border-zambian-green/20">
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-zambian-red">Late</p>
                <p className="text-2xl font-bold text-zambian-green">{stats.late}</p>
              </CardContent>
            </Card>

            <Card className="border-zambian-green/20">
              <CardContent className="p-4 text-center">
                <UserCheck className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-zambian-red">Excused</p>
                <p className="text-2xl font-bold text-zambian-green">{stats.excused}</p>
              </CardContent>
            </Card>

            <Card className="border-zambian-green/20">
              <CardContent className="p-4 text-center">
                <Calendar className="w-6 h-6 text-zambian-green mx-auto mb-2" />
                <p className="text-sm text-zambian-red">Total Days</p>
                <p className="text-2xl font-bold text-zambian-green">{stats.totalDays}</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Records */}
          <Card className="border-zambian-green/20">
            <CardHeader>
              <CardTitle className="text-zambian-green">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-4 border-zambian-green/30 border-t-zambian-green rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-zambian-green">Loading attendance...</p>
                </div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No attendance records found for the selected period.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attendanceRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-zambian-green/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium text-zambian-green">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {record.reason && (
                            <p className="text-sm text-gray-500 mt-1">{record.reason}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ParentAttendance;

