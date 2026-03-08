import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, BookOpen, Edit, Save, X } from 'lucide-react';

interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  current_class_id: string | null;
  date_of_birth: string | null;
  school_id: string;
}

interface ClassInfo {
  id: string;
  name: string;
  student_count: number;
}

interface TeacherStudentManagerProps {
  user: User;
}

export const TeacherStudentManager = ({ user }: TeacherStudentManagerProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
  });

  useEffect(() => {
    fetchTeacherClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
    }
  }, [selectedClass]);

  const fetchTeacherClasses = async () => {
    try {
      setLoading(true);
      
      // First, get the teacher's admin_users record to get their id
      const { data: teacherData, error: teacherError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .single();

      if (teacherError) throw teacherError;
      if (!teacherData) {
        throw new Error('Teacher record not found');
      }

      // Fetch classes assigned to this teacher
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name
        `)
        .eq('class_teacher_id', teacherData.id);

      if (classesError) throw classesError;

      // Fetch student counts for each class
      const classesWithStats = await Promise.all(
        (classesData || []).map(async (cls) => {
          const { count, error: countError } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('current_class_id', cls.id);

          if (countError) {
            console.error('Error counting students:', countError);
            return { ...cls, student_count: 0 };
          }

          return {
            id: cls.id,
            name: cls.name,
            student_count: count || 0
          };
        })
      );

      setClasses(classesWithStats);
      
      if (classesWithStats.length > 0 && !selectedClass) {
        setSelectedClass(classesWithStats[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load your classes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStudents = async () => {
    if (!selectedClass) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('current_class_id', selectedClass)
        .order('student_number');

      if (error) throw error;
      setStudents((data || []) as Student[]);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to load students. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.student_number}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return '-';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleOpenEditDialog = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
      gender: student.gender || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!editingStudent) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('students')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
        })
        .eq('id', editingStudent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student information updated successfully.',
      });

      setEditDialogOpen(false);
      setEditingStudent(null);
      fetchClassStudents();
    } catch (error: any) {
      console.error('Error updating student:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update student information.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (classes.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Classes Assigned</h3>
          <p className="text-muted-foreground text-center">
            You don't have any classes assigned yet. Please contact your school administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My Students</CardTitle>
          <CardDescription>
            View and manage students in your classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Select Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.student_count} students
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {searchTerm ? 'No students found matching your search' : 'No students in this class'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-mono">{student.student_number}</TableCell>
                          <TableCell className="font-medium">
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell>
                            {student.gender && (
                              <Badge variant="outline">{student.gender}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{calculateAge(student.date_of_birth)} years</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenEditDialog(student)}
                              className="border-purple-primary/30 text-purple-primary hover:bg-purple-light"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Class Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Students</div>
                <div className="text-2xl font-bold text-primary">{students.length}</div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm text-muted-foreground">Male Students</div>
                <div className="text-2xl font-bold text-primary">
                  {students.filter(s => s.gender?.toLowerCase() === 'male').length}
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm text-muted-foreground">Female Students</div>
                <div className="text-2xl font-bold text-primary">
                  {students.filter(s => s.gender?.toLowerCase() === 'female').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-purple-primary">Edit Student Information</DialogTitle>
            <DialogDescription>
              Update student details for {editingStudent?.first_name} {editingStudent?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-purple-primary">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="border-purple-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-purple-primary">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="border-purple-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth" className="text-purple-primary">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="border-purple-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-purple-primary">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger className="border-purple-primary/30">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-purple-primary">Student Number</Label>
              <Input
                value={editingStudent?.student_number || ''}
                disabled
                className="border-purple-primary/30 bg-gray-50"
              />
              <p className="text-xs text-gray-500">Student number cannot be changed</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveStudent}
              disabled={saving}
              className="bg-purple-primary hover:bg-purple-dark"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
