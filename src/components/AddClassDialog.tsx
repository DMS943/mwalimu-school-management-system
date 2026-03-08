import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, BookOpen, School, Users, GraduationCap, User } from 'lucide-react';

interface AddClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassAdded?: () => void;
  currentUser?: any;
  editingClass?: any;
}

interface School {
  id: string;
  name: string;
  location: string;
  school_type: 'primary' | 'secondary';
}


interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  school_id: string;
}

export const AddClassDialog = ({ open, onOpenChange, onClassAdded, currentUser, editingClass }: AddClassDialogProps) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    school_id: '',
    class_teacher_id: ''
  });

  useEffect(() => {
    if (open) {
      if (editingClass) {
        setFormData({
          name: editingClass.name || '',
          school_id: editingClass.school_id || '',
          class_teacher_id: editingClass.class_teacher_id || ''
        });
      } else {
        // Reset form for new class
        setFormData({
          name: '',
          school_id: '',
          class_teacher_id: ''
        });
      }
      fetchInitialData();
    }
  }, [open, editingClass, currentUser]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Determine user's school context
      let userSchoolId = null;
      if (currentUser) {
        const { data: userData } = await supabase
          .from('admin_users')
          .select('school_id, role')
          .eq('user_id', currentUser.id)
          .single();
        
        if (userData && userData.school_id) {
          userSchoolId = userData.school_id;
        }
      }

      // Fetch schools (all for system admin, specific for school admin)
      let schoolsQuery = supabase.from('schools').select('*').order('name');
      if (userSchoolId) {
        schoolsQuery = schoolsQuery.eq('id', userSchoolId);
      }
      const { data: schoolsData, error: schoolsError } = await schoolsQuery;
      if (schoolsError) throw schoolsError;
      setSchools(schoolsData || []);

      // Set default school if user has specific school and not editing
      if (userSchoolId && !formData.school_id && !editingClass) {
        setFormData(prev => ({ ...prev, school_id: userSchoolId }));
      }


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
        description: "Failed to load form data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClass = async () => {
    // Validation
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
      // Prepare class data
      let classData: any = {
        name: formData.name,
        school_id: formData.school_id
      };

      // Add teacher assignment if selected
      if (formData.class_teacher_id && formData.class_teacher_id !== 'none') {
        classData.class_teacher_id = formData.class_teacher_id;
      } else {
        classData.class_teacher_id = null;
      }

      if (editingClass) {
        // Update existing class
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingClass.id);

        if (error) throw error;

        toast({
          title: "Class updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create new class
        const { error } = await supabase
          .from('classes')
          .insert([classData]);

        if (error) throw error;

        toast({
          title: "Class created",
          description: `${formData.name} has been created successfully.`,
        });
      }

      // Reset form if creating new class
      if (!editingClass) {
        setFormData({
          name: '',
          school_id: formData.school_id, // Keep school selection
          class_teacher_id: ''
        });
      }

      onClassAdded?.();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error saving class:', error);
      toast({
        title: "Error saving class",
        description: error.message || "Failed to save class. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateClassName = () => {
    if (!formData.school_id) return;
    
    const school = schools.find(s => s.id === formData.school_id);
    if (school) {
      // Generate a simple class name suggestion based on school type
      const suggestion = school.school_type === 'primary' 
        ? 'Grade 1A' 
        : 'Form 1A';
      setFormData(prev => ({ ...prev, name: suggestion }));
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedSchool = schools.find(s => s.id === formData.school_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {editingClass ? 'Edit Class' : 'Add New Class'}
          </DialogTitle>
          <DialogDescription>
            {editingClass ? 'Update the class details' : 'Create a new class for the school'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-primary">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="name"
                      placeholder="e.g., Grade 5A, Form 2B"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateClassName}
                    disabled={!formData.school_id || !formData.grade_level}
                    className="whitespace-nowrap"
                  >
                    Suggest
                  </Button>
                </div>
              </div>
              
            </div>


          </div>

          {/* School Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-primary">School Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school_id">School *</Label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Select value={formData.school_id} onValueChange={(value) => setFormData(prev => ({ ...prev, school_id: value, class_teacher_id: '' }))}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{school.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {school.location} • {school.school_type === 'primary' ? 'Primary' : 'Secondary'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
            </div>
          </div>

          {/* Teacher Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-primary">Teacher Assignment</h3>
            
            <div className="space-y-2">
              <Label htmlFor="class_teacher_id">Class Teacher (Optional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Select value={formData.class_teacher_id} onValueChange={(value) => setFormData(prev => ({ ...prev, class_teacher_id: value }))}>
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select class teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Teacher Assigned</SelectItem>
                    {teachers
                      .filter(teacher => teacher.school_id === formData.school_id)
                      .map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{teacher.full_name}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {teacher.role}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                You can assign a teacher now or do it later from the class management page
              </p>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSaveClass}
              disabled={saving}
              className="flex-1 bg-purple-primary hover:bg-purple-dark text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingClass ? 'Save' : 'Create Class'}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1 border-purple-primary/30 hover:bg-purple-light"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};