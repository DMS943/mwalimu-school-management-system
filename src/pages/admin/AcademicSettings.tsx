import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { toast } from '@/hooks/use-toast';

interface Subject {
  id: number;
  name: string;
  code: string;
  department?: number;
}

interface Department {
  id: number;
  name: string;
  description?: string;
  head_of_department?: number;
}

const AcademicSettings = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    department: '',
  });

  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectsData, deptsData] = await Promise.all([
        schoolsApi.getSubjects(),
        schoolsApi.getDepartments(),
      ]);
      
      const subjectsArray = Array.isArray(subjectsData) ? subjectsData : (subjectsData.results || []);
      const deptsArray = Array.isArray(deptsData) ? deptsData : (deptsData.results || []);
      
      setSubjects(subjectsArray);
      setDepartments(deptsArray);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        ...subjectForm,
        department: subjectForm.department ? parseInt(subjectForm.department) : null,
      };

      if (editingSubject) {
        await schoolsApi.updateSubject(editingSubject.id.toString(), submitData);
        toast({ title: 'Success', description: 'Subject updated successfully' });
      } else {
        await schoolsApi.createSubject(submitData);
        toast({ title: 'Success', description: 'Subject created successfully' });
      }
      
      setSubjectDialogOpen(false);
      resetSubjectForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save subject',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingDept) {
        await schoolsApi.updateDepartment(editingDept.id.toString(), deptForm);
        toast({ title: 'Success', description: 'Department updated successfully' });
      } else {
        await schoolsApi.createDepartment(deptForm);
        toast({ title: 'Success', description: 'Department created successfully' });
      }
      
      setDeptDialogOpen(false);
      resetDeptForm();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save department',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      department: subject.department?.toString() || '',
    });
    setSubjectDialogOpen(true);
  };

  const handleEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      description: dept.description || '',
    });
    setDeptDialogOpen(true);
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      await schoolsApi.deleteSubject(id.toString());
      toast({ title: 'Success', description: 'Subject deleted successfully' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete subject',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteDept = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;

    try {
      await schoolsApi.deleteDepartment(id.toString());
      toast({ title: 'Success', description: 'Department deleted successfully' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete department',
        variant: 'destructive',
      });
    }
  };

  const resetSubjectForm = () => {
    setSubjectForm({ name: '', code: '', department: '' });
    setEditingSubject(null);
  };

  const resetDeptForm = () => {
    setDeptForm({ name: '', description: '' });
    setEditingDept(null);
  };

  const getDepartmentName = (deptId?: number) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : 'No department';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-green-800">Academic Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Subjects</CardTitle>
                    <CardDescription>Manage school subjects</CardDescription>
                  </div>
                  <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { resetSubjectForm(); setSubjectDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subject
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
                        <DialogDescription>
                          {editingSubject ? 'Update subject information' : 'Create a new subject'}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubjectSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Subject Name *</Label>
                          <Input
                            id="name"
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            placeholder="e.g., Mathematics"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="code">Subject Code *</Label>
                          <Input
                            id="code"
                            value={subjectForm.code}
                            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                            placeholder="e.g., MATH"
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          {editingSubject ? 'Update Subject' : 'Create Subject'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No subjects configured yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{subject.name}</h3>
                          <p className="text-sm text-gray-600">
                            Code: {subject.code} | Department: {getDepartmentName(subject.department)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditSubject(subject)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteSubject(subject.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Departments</CardTitle>
                    <CardDescription>Manage school departments</CardDescription>
                  </div>
                  <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => { resetDeptForm(); setDeptDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Department
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
                        <DialogDescription>
                          {editingDept ? 'Update department information' : 'Create a new department'}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleDeptSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="dept_name">Department Name *</Label>
                          <Input
                            id="dept_name"
                            value={deptForm.name}
                            onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                            placeholder="e.g., Mathematics"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={deptForm.description}
                            onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                            placeholder="Optional description"
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          {editingDept ? 'Update Department' : 'Create Department'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
                  </div>
                ) : departments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No departments configured yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{dept.name}</h3>
                          {dept.description && (
                            <p className="text-sm text-gray-600">{dept.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditDept(dept)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteDept(dept.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AcademicSettings;
