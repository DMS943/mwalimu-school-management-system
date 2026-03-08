import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Users, Loader2, X, RefreshCw } from 'lucide-react';
import { generateNextStudentNumber } from '@/lib/studentNumberGenerator';

interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  current_class_id: string | null;
  school_id: string;
  class_name?: string;
}

interface Class {
  id: string;
  name: string;
}

interface StudentManagementProps {
  user: User;
}

const StudentManagement = ({ user }: StudentManagementProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('');
  const [generatingNumber, setGeneratingNumber] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    student_number: '',
    date_of_birth: '',
    gender: '',
    current_class_id: '',
  });

  useEffect(() => {
    if (user) {
      fetchUserSchool();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (userSchoolId !== null) {
      fetchClasses();
      fetchStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSchoolId, selectedClass]);

  const fetchUserSchool = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('school_id, is_super_admin, schools(name)')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user school:', error);
        throw error;
      }
      setUserSchoolId(data?.school_id || null);
      if (data?.schools && Array.isArray(data.schools) && data.schools.length > 0) {
        setSchoolName(data.schools[0].name);
      } else if (data?.schools && typeof data.schools === 'object' && 'name' in data.schools) {
        setSchoolName((data.schools as any).name);
      }
    } catch (error: any) {
      console.error('Error fetching user school:', error);
      setUserSchoolId(null);
    }
  };

  const fetchClasses = async () => {
    try {
      let query = supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (userSchoolId) {
        query = query.eq('school_id', userSchoolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast({
        title: "Error",
        description: "Failed to load classes.",
        variant: "destructive",
      });
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('students')
        .select(`
          *,
          classes!current_class_id(id, name)
        `)
        .order('student_number');

      if (userSchoolId) {
        query = query.eq('school_id', userSchoolId);
      }

      if (selectedClass !== 'all') {
        query = query.eq('current_class_id', selectedClass);
      }

      const { data, error } = await query;
      if (error) throw error;

      const studentsData = (data || []).map((student: any) => ({
        ...student,
        class_name: student.classes?.name || 'Unassigned',
      }));

      setStudents(studentsData);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to load students.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = async (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        student_number: student.student_number,
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || 'none',
        current_class_id: student.current_class_id || 'none',
      });
    } else {
      setEditingStudent(null);
      // Auto-generate student number when adding new student
      if (userSchoolId && schoolName) {
        setGeneratingNumber(true);
        try {
          const autoNumber = await generateNextStudentNumber(userSchoolId, schoolName);
          setFormData({
            first_name: '',
            last_name: '',
            student_number: autoNumber,
            date_of_birth: '',
            gender: 'none',
            current_class_id: 'none',
          });
        } catch (error) {
          console.error('Error generating student number:', error);
          setFormData({
            first_name: '',
            last_name: '',
            student_number: '',
            date_of_birth: '',
            gender: 'none',
            current_class_id: 'none',
          });
        } finally {
          setGeneratingNumber(false);
        }
      } else {
        setFormData({
          first_name: '',
          last_name: '',
          student_number: '',
          date_of_birth: '',
          gender: 'none',
          current_class_id: 'none',
        });
      }
    }
    setDialogOpen(true);
  };

  const handleRegenerateStudentNumber = async () => {
    if (!userSchoolId || !schoolName) return;
    setGeneratingNumber(true);
    try {
      const autoNumber = await generateNextStudentNumber(userSchoolId, schoolName);
      setFormData({ ...formData, student_number: autoNumber });
      toast({
        title: "Student number generated",
        description: `New student number: ${autoNumber}`,
      });
    } catch (error) {
      console.error('Error generating student number:', error);
      toast({
        title: "Error",
        description: "Failed to generate student number",
        variant: "destructive",
      });
    } finally {
      setGeneratingNumber(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStudent(null);
    setFormData({
      first_name: '',
      last_name: '',
      student_number: '',
      date_of_birth: '',
      gender: '',
      current_class_id: '',
    });
  };

  const handleSaveStudent = async () => {
    // Validation
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in First Name and Last Name.",
        variant: "destructive",
      });
      return;
    }

    // Auto-generate student number if not provided
    let studentNumber = formData.student_number.trim();
    if (!studentNumber && userSchoolId && schoolName) {
      try {
        studentNumber = await generateNextStudentNumber(userSchoolId, schoolName);
        setFormData({ ...formData, student_number: studentNumber });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to generate student number. Please enter one manually.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!studentNumber) {
      toast({
        title: "Validation Error",
        description: "Student number is required.",
        variant: "destructive",
      });
      return;
    }

    if (!userSchoolId) {
      toast({
        title: "Error",
        description: "School ID not found. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const studentData: any = {
        school_id: userSchoolId,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        student_number: studentNumber,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender === 'none' ? null : (formData.gender || null),
        current_class_id: formData.current_class_id === 'none' ? null : (formData.current_class_id || null),
      };

      if (editingStudent) {
        // Update existing student
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent.id);

        if (error) {
          console.error('Update error:', error);
          if (error.code === '42501') {
            throw new Error('You do not have permission to update students. Please contact your administrator.');
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Student updated successfully.",
        });
      } else {
        // Create new student
        const { error } = await supabase
          .from('students')
          .insert([studentData]);

        if (error) {
          console.error('Insert error:', error);
          if (error.code === '23505') {
            throw new Error('A student with this student number already exists in your school.');
          }
          if (error.code === '42501') {
            throw new Error('You do not have permission to add students. Please contact your administrator.');
          }
          if (error.message) {
            throw new Error(error.message);
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Student added successfully.",
        });
      }

      handleCloseDialog();
      fetchStudents();
    } catch (error: any) {
      console.error('Error saving student:', error);
      // Don't log out on error - just show the error message
      toast({
        title: "Error",
        description: error.message || "Failed to save student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deletingStudent.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student deleted successfully.",
      });

      setDeleteDialogOpen(false);
      setDeletingStudent(null);
      fetchStudents();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete student. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-purple-primary">Student Management</h2>
          <p className="text-gray-600 mt-1">Add, edit, and manage students in your school</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-purple-primary hover:bg-purple-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-purple-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-purple-primary">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or student number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-purple-primary/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-purple-primary">Filter by Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="border-purple-primary/30">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="border-purple-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-purple-primary flex items-center gap-2">
                <Users className="w-5 h-5" />
                Students ({filteredStudents.length})
              </CardTitle>
              <CardDescription className="mt-1">
                {selectedClass !== 'all' 
                  ? `Showing students in selected class`
                  : `Showing all students in your school`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-primary" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">No students found</p>
              <p className="text-sm text-gray-500 mt-2">
                {searchTerm || selectedClass !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Get started by adding your first student.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-purple-primary">Student Number</TableHead>
                    <TableHead className="text-purple-primary">Name</TableHead>
                    <TableHead className="text-purple-primary">Class</TableHead>
                    <TableHead className="text-purple-primary">Gender</TableHead>
                    <TableHead className="text-purple-primary">Date of Birth</TableHead>
                    <TableHead className="text-purple-primary text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-purple-light">
                      <TableCell className="font-medium">{student.student_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.first_name} {student.last_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.current_class_id ? (
                          <Badge variant="outline" className="border-purple-primary/30">
                            {student.class_name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{student.gender || '-'}</TableCell>
                      <TableCell>
                        {student.date_of_birth 
                          ? new Date(student.date_of_birth).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(student)}
                            className="border-purple-primary/30 text-purple-primary hover:bg-purple-light"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeletingStudent(student);
                              setDeleteDialogOpen(true);
                            }}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Student Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-purple-primary">
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </DialogTitle>
            <DialogDescription>
              {editingStudent 
                ? 'Update student information below.'
                : 'Fill in the student details to add them to your school.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-purple-primary">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
                className="border-purple-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-purple-primary">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
                className="border-purple-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student_number" className="text-purple-primary">
                Student Number <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="student_number"
                  value={formData.student_number}
                  onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                  placeholder="Auto-generated"
                  className="border-purple-primary/30"
                  disabled={!!editingStudent || generatingNumber}
                />
                {!editingStudent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRegenerateStudentNumber}
                    disabled={generatingNumber || !userSchoolId || !schoolName}
                    className="border-purple-primary/30"
                    title="Generate new student number"
                  >
                    {generatingNumber ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
              {editingStudent ? (
                <p className="text-xs text-gray-500">Student number cannot be changed</p>
              ) : (
                <p className="text-xs text-gray-500">
                  Student number is auto-generated based on your school. Click refresh to generate a new one.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_class_id" className="text-purple-primary">
                Class
              </Label>
              <Select
                value={formData.current_class_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, current_class_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="border-purple-primary/30">
                  <SelectValue placeholder="Select class (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth" className="text-purple-primary">
                Date of Birth
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="border-purple-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-purple-primary">
                Gender
              </Label>
              <Select
                value={formData.gender || 'none'}
                onValueChange={(value) => setFormData({ ...formData, gender: value === 'none' ? '' : value })}
              >
                <SelectTrigger className="border-purple-primary/30">
                  <SelectValue placeholder="Select gender (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseDialog}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveStudent}
              disabled={saving}
              className="bg-purple-primary hover:bg-purple-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingStudent ? 'Update Student' : 'Add Student'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingStudent?.first_name} {deletingStudent?.last_name} 
              ({deletingStudent?.student_number})? This action cannot be undone and will remove all 
              associated records including scores and reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StudentManagement;

