import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, BookOpen, Users, UserCheck, Edit, Trash2, Search } from 'lucide-react';
import { AddClassDialog } from '@/components/AddClassDialog';

interface Class {
  id: string;
  name: string;
  class_teacher_id: string | null;
  school_id: string;
  created_at: string;
  // Computed fields
  student_count?: number;
  teacher_name?: string;
  school_name?: string;
  department_name?: string;
}

interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  school_id: string;
  is_active: boolean;
}

interface School {
  id: string;
  name: string;
  location: string;
}


export const ClassAssignmentManager = ({ user }: { user: any }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addClassDialogOpen, setAddClassDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    school_id: '',
  });
  const [assignmentData, setAssignmentData] = useState({
    teacher_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Determine user's school context
      let userSchoolId = null;
      if (user) {
        const { data: userData } = await supabase
          .from('admin_users')
          .select('school_id, role')
          .eq('user_id', user.id)
          .single();
        
        if (userData && userData.school_id) {
          userSchoolId = userData.school_id;
        }
      }

      // Fetch schools (all for super admin, specific for school admin)
      let schoolsQuery = supabase.from('schools').select('*').order('name');
      if (userSchoolId) {
        schoolsQuery = schoolsQuery.eq('id', userSchoolId);
      }
      const { data: schoolsData, error: schoolsError } = await schoolsQuery;
      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);

      // Set default school if user has specific school
      if (userSchoolId && !selectedSchool) {
        setSelectedSchool(userSchoolId);
      }

      // Fetch classes with related data
      let classesQuery = supabase
        .from('classes')
        .select(`
          *,
          schools (name)
        `)
        .order('name');

      if (userSchoolId) {
        classesQuery = classesQuery.eq('school_id', userSchoolId);
      }

      const { data: classesData, error: classesError } = await classesQuery;
      if (classesError) throw classesError;

      // Fetch student counts and teacher names for each class
      const classesWithStats = await Promise.all(
        (classesData || []).map(async (cls) => {
          const [studentCount, teacherData] = await Promise.all([
            supabase.from('students').select('id', { count: 'exact' }).eq('current_class_id', cls.id),
            cls.class_teacher_id ? supabase
              .from('admin_users')
              .select('full_name')
              .eq('id', cls.class_teacher_id)
              .single() : Promise.resolve({ data: null })
          ]);

          return {
            ...cls,
            student_count: studentCount.count || 0,
            teacher_name: teacherData.data?.full_name || null,
            school_name: cls.schools?.name,
          };
        })
      );

      setClasses(classesWithStats);

      // Fetch teachers
      let teachersQuery = supabase
        .from('admin_users')
        .select('*')
        .eq('role', 'teacher')
        .order('full_name');

      if (userSchoolId) {
        teachersQuery = teachersQuery.eq('school_id', userSchoolId);
      }

      const { data: teachersData, error: teachersError } = await teachersQuery;
      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);


    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClass = async () => {
    if (!formData.name || !formData.school_id) {
      toast({
        title: "Missing fields",
        description: "Please fill in the class name and select a school.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const classData = {
        ...formData,
      };

      if (editingClass) {
        // Update existing class
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingClass.id);

        if (error) throw error;

        toast({
          title: "Class updated",
          description: "The class has been updated successfully.",
        });
      } else {
        // Create new class
        const { error } = await supabase
          .from('classes')
          .insert([classData]);

        if (error) throw error;

        toast({
          title: "Class created",
          description: "The new class has been created successfully.",
        });
      }

      setDialogOpen(false);
      setEditingClass(null);
      setFormData({ name: '', school_id: '' });
      await fetchInitialData();
    } catch (error: any) {
      console.error('Error saving class:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save class.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedClass || !assignmentData.teacher_id) {
      toast({
        title: "Missing selection",
        description: "Please select a teacher to assign.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Get teacher's full name for display
      const { data: teacherData, error: teacherError } = await supabase
        .from('admin_users')
        .select('full_name, id')
        .eq('id', assignmentData.teacher_id)
        .single();

      if (teacherError) throw teacherError;

      // Update class with teacher assignment
      // Note: class_teacher_id references admin_users(id), not admin_users(user_id)
      const { error } = await supabase
        .from('classes')
        .update({
          class_teacher_id: assignmentData.teacher_id
        })
        .eq('id', selectedClass.id);

      if (error) throw error;

      toast({
        title: "Teacher assigned",
        description: `${teacherData.full_name} has been assigned to ${selectedClass.name}.`,
      });

      setAssignDialogOpen(false);
      setSelectedClass(null);
      setAssignmentData({ teacher_id: '' });
      await fetchInitialData();
    } catch (error: any) {
      console.error('Error assigning teacher:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign teacher.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignTeacher = async (classId: string) => {
    if (!confirm('Are you sure you want to unassign the teacher from this class?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classes')
        .update({
          class_teacher_id: null
        })
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: "Teacher unassigned",
        description: "The teacher has been unassigned from the class.",
      });

      await fetchInitialData();
    } catch (error: any) {
      console.error('Error unassigning teacher:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unassign teacher.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This will also affect all students in this class. This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: "Class deleted",
        description: "The class has been deleted successfully.",
      });

      await fetchInitialData();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete class.",
        variant: "destructive",
      });
    }
  };

  const handleEditClass = (cls: Class) => {
    setEditingClass(cls);
    setAddClassDialogOpen(true);
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.school_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = !selectedSchool || cls.school_id === selectedSchool;
    return matchesSearch && matchesSchool;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Class Assignment Management
              </CardTitle>
              <CardDescription>
                Manage classes and assign teachers to them
              </CardDescription>
            </div>
            <Button onClick={() => setAddClassDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Class
            </Button>

          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search classes, teachers, or schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {schools.length > 1 && (
              <div className="w-64">
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="All schools" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Assigned Teacher</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p>No classes found</p>
                      <p className="text-sm mt-2">
                        {searchTerm || selectedSchool ? 'Try adjusting your filters' : 'Create your first class to get started'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cls.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{cls.school_name}</TableCell>
                      <TableCell>
                        {cls.teacher_name ? (
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-green-600" />
                            <span>{cls.teacher_name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-muted-foreground">Not assigned</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{cls.student_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {cls.teacher_name ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnassignTeacher(cls.id)}
                            >
                              Unassign
                            </Button>
                          ) : (
                            <Dialog open={assignDialogOpen && selectedClass?.id === cls.id} onOpenChange={setAssignDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setAssignmentData({ teacher_id: '' });
                                  }}
                                >
                                  Assign
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Assign Teacher to {cls.name}</DialogTitle>
                                  <DialogDescription>
                                    Select a teacher to assign to this class
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div>
                                    <Label htmlFor="teacher_select">Select Teacher</Label>
                                    <Select value={assignmentData.teacher_id} onValueChange={(value) => setAssignmentData({ teacher_id: value })}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose a teacher" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {teachers
                                          .filter(teacher => teacher.school_id === cls.school_id)
                                          .map((teacher) => (
                                          <SelectItem key={teacher.id} value={teacher.id}>
                                            <div className="flex flex-col">
                                              <span>{teacher.full_name}</span>
                                              <span className="text-xs text-muted-foreground capitalize">{teacher.role}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={handleAssignTeacher}
                                      disabled={saving}
                                      className="flex-1"
                                    >
                                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                      Assign Teacher
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => setAssignDialogOpen(false)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClass(cls)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClass(cls.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <AddClassDialog
        open={addClassDialogOpen}
        onOpenChange={setAddClassDialogOpen}
        onClassAdded={fetchInitialData}
        currentUser={user}
        editingClass={editingClass}
      />
    </div>
  );
};