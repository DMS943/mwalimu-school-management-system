import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { usersApi } from '@/api/users';
import { toast } from '@/hooks/use-toast';

interface Class {
  id: number;
  name: string;
  grade_level: number;
  department?: number;
  class_teacher?: string;
  class_teacher_user?: number;
}

interface Department {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
}

const AdminClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    department: '',
    class_teacher: '',
    class_teacher_user: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesData, departmentsData, usersData] = await Promise.all([
        schoolsApi.getClasses(),
        schoolsApi.getDepartments(),
        usersApi.getUsers(),
      ]);
      
      const classesArray = Array.isArray(classesData) ? classesData : (classesData.results || []);
      const departmentsArray = Array.isArray(departmentsData) ? departmentsData : (departmentsData.results || []);
      const usersArray = Array.isArray(usersData) ? usersData : (usersData.results || []);
      
      setClasses(classesArray);
      setDepartments(departmentsArray);
      setTeachers(usersArray.filter((u: User) => u.role === 'teacher' || u.role === 'admin'));
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
      setClasses([]);
      setDepartments([]);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        name: formData.name,
        grade_level: parseInt(formData.grade_level),
        department: formData.department ? parseInt(formData.department) : null,
        class_teacher: formData.class_teacher || null,
        class_teacher_user: formData.class_teacher_user ? parseInt(formData.class_teacher_user) : null,
      };

      if (editingClass) {
        await schoolsApi.updateClass(editingClass.id.toString(), submitData);
        toast({ title: 'Success', description: 'Class updated successfully' });
      } else {
        await schoolsApi.createClass(submitData);
        toast({ title: 'Success', description: 'Class created successfully' });
      }
      
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save class',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      grade_level: cls.grade_level.toString(),
      department: cls.department?.toString() || '',
      class_teacher: cls.class_teacher || '',
      class_teacher_user: cls.class_teacher_user?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      await schoolsApi.deleteClass(id.toString());
      toast({ title: 'Success', description: 'Class deleted successfully' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete class',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      grade_level: '',
      department: '',
      class_teacher: '',
      class_teacher_user: '',
    });
    setEditingClass(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getDepartmentName = (deptId?: number) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : 'No department';
  };

  const getTeacherName = (teacherId?: number) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.full_name : 'Not assigned';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-green-800">Manage Classes</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Manage classes and assign teachers</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClass ? 'Edit Class' : 'Add New Class'}</DialogTitle>
                <DialogDescription>
                  {editingClass ? 'Update class information' : 'Create a new class'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Class Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 10A, Form 3B"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade_level">Grade Level *</Label>
                  <Input
                    id="grade_level"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    placeholder="e.g., 10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class_teacher">Class Teacher Name</Label>
                  <Input
                    id="class_teacher"
                    value={formData.class_teacher}
                    onChange={(e) => setFormData({ ...formData, class_teacher: e.target.value })}
                    placeholder="Optional text field"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class_teacher_user">Assign Teacher</Label>
                  <Select value={formData.class_teacher_user} onValueChange={(value) => setFormData({ ...formData, class_teacher_user: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.full_name} ({teacher.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingClass ? 'Update Class' : 'Create Class'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Classes</CardTitle>
            <CardDescription>All classes in the school ({classes.length})</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No classes configured yet.</p>
                <p className="text-sm mt-2">Create classes to organize students.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{cls.name}</h3>
                        <p className="text-sm text-gray-600">Grade {cls.grade_level}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(cls)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cls.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Department: {getDepartmentName(cls.department)}</p>
                      <p>Teacher: {getTeacherName(cls.class_teacher_user)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminClasses;
