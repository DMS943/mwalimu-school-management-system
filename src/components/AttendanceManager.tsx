import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle2, XCircle, Clock, UserCheck } from 'lucide-react';

interface AttendanceManagerProps {
  user: User;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
}

interface Class {
  id: string;
  name: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  reason?: string;
}

const AttendanceManager = ({ user }: AttendanceManagerProps) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceDate, setAttendanceDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [bulkStatus, setBulkStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeacherClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassStudents();
      fetchExistingAttendance();
    }
  }, [selectedClassId, attendanceDate]);

  const fetchTeacherClasses = async () => {
    try {
      setLoading(true);
      // Get teacher's admin_users.id
      const { data: teacherData, error: teacherError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .single();

      if (teacherError || !teacherData) {
        throw new Error('Teacher record not found');
      }

      // Fetch classes assigned to this teacher
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_teacher_id', teacherData.id)
        .order('name');

      if (classesError) throw classesError;

      setClasses(classesData || []);
      if (classesData && classesData.length > 0) {
        setSelectedClassId(classesData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    if (!selectedClassId) return;

    try {
      setLoading(true);
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, student_number')
        .eq('current_class_id', selectedClassId)
        .order('first_name, last_name');

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    if (!selectedClassId || !attendanceDate) return;

    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, student_id, status, reason')
        .eq('class_id', selectedClassId)
        .eq('date', attendanceDate);

      if (attendanceError) throw attendanceError;

      // Convert array to object keyed by student_id
      const records: Record<string, AttendanceRecord> = {};
      (attendanceData || []).forEach((record) => {
        records[record.student_id] = record;
      });

      setAttendanceRecords(records);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      // Don't show error toast for this - it's okay if no attendance exists yet
    }
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        id: prev[studentId]?.id, // Keep existing id if it exists, otherwise undefined
        student_id: studentId,
        status,
        reason: prev[studentId]?.reason || '',
      },
    }));
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        id: prev[studentId]?.id, // Keep existing id if it exists, otherwise undefined
        student_id: studentId,
        status: prev[studentId]?.status || 'absent',
        reason,
      },
    }));
  };

  const handleBulkMark = () => {
    const newRecords = { ...attendanceRecords };
    students.forEach((student) => {
      newRecords[student.id] = {
        ...newRecords[student.id],
        id: newRecords[student.id]?.id, // Keep existing id if it exists, otherwise undefined
        student_id: student.id,
        status: bulkStatus,
        reason: newRecords[student.id]?.reason || '',
      };
    });
    setAttendanceRecords(newRecords);
    toast({
      title: 'Bulk Mark Applied',
      description: `All students marked as ${bulkStatus}`,
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId) {
      toast({
        title: 'Error',
        description: 'Please select a class',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // Prepare records for upsert
      // Don't include id field - let Supabase handle it via the unique constraint (student_id, date)
      // This way, existing records will be updated and new ones will be inserted
      const recordsToSave = Object.values(attendanceRecords).map((record) => ({
        student_id: record.student_id,
        class_id: selectedClassId,
        date: attendanceDate,
        status: record.status,
        reason: record.reason || null,
        marked_by_user_id: user.id,
        // Explicitly omit id - Supabase will use the unique constraint (student_id, date) to determine insert vs update
      }));

      if (recordsToSave.length === 0) {
        toast({
          title: 'No Changes',
          description: 'No attendance records to save',
        });
        return;
      }

      // Use upsert to insert or update records
      // The unique constraint on (student_id, date) will handle conflicts
      const { error: upsertError } = await supabase
        .from('attendance')
        .upsert(recordsToSave, {
          onConflict: 'student_id,date',
          ignoreDuplicates: false,
        });

      if (upsertError) throw upsertError;

      toast({
        title: 'Success',
        description: `Attendance saved for ${recordsToSave.length} student(s)`,
      });

      // Refresh existing attendance to get the IDs
      await fetchExistingAttendance();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save attendance',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-zambian-green/30 border-t-zambian-green rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-zambian-green font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <Card className="border-zambian-green/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-zambian-red">No classes assigned to you yet.</p>
            <p className="text-sm text-gray-500 mt-2">Please contact your administrator to assign classes.</p>
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
            Mark Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class-select">Select Class</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-input">Date</Label>
              <Input
                id="date-input"
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>
          </div>

          {selectedClassId && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleBulkMark}
                variant="outline"
                size="sm"
                className="border-zambian-green text-zambian-green hover:bg-zambian-green hover:text-white"
              >
                Mark All as {bulkStatus.charAt(0).toUpperCase() + bulkStatus.slice(1)}
              </Button>
              <Select value={bulkStatus} onValueChange={(value: any) => setBulkStatus(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClassId && students.length > 0 && (
        <Card className="border-zambian-green/20">
          <CardHeader>
            <CardTitle className="text-zambian-green">Students ({students.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {students.map((student) => {
                const record = attendanceRecords[student.id];
                const currentStatus = record?.status || 'absent';

                return (
                  <div
                    key={student.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-zambian-green/5 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zambian-green">
                          {student.first_name} {student.last_name}
                        </p>
                        {record && getStatusIcon(record.status)}
                      </div>
                      <p className="text-sm text-gray-500">#{student.student_number}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={currentStatus === 'present' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, 'present')}
                        className={currentStatus === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        Present
                      </Button>
                      <Button
                        variant={currentStatus === 'absent' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, 'absent')}
                        className={currentStatus === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        Absent
                      </Button>
                      <Button
                        variant={currentStatus === 'late' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, 'late')}
                        className={currentStatus === 'late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                      >
                        Late
                      </Button>
                      <Button
                        variant={currentStatus === 'excused' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(student.id, 'excused')}
                        className={currentStatus === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      >
                        Excused
                      </Button>
                    </div>

                    {currentStatus !== 'present' && (
                      <div className="w-48">
                        <Textarea
                          placeholder="Reason (optional)"
                          value={record?.reason || ''}
                          onChange={(e) => handleReasonChange(student.id, e.target.value)}
                          rows={1}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="bg-zambian-green hover:bg-zambian-green/90"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClassId && students.length === 0 && !loading && (
        <Card className="border-zambian-green/20">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-zambian-red">No students found in this class.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceManager;

