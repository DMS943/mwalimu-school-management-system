import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, School, Edit, Trash2, Users, BookOpen, UserPlus, Upload, X, Image as ImageIcon } from 'lucide-react';

interface School {
  id: string;
  name: string;
  location: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  school_type: 'primary' | 'secondary';
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  admin_count?: number;
  teacher_count?: number;
  student_count?: number;
  class_count?: number;
}

interface SchoolAdmin {
  id: string;
  full_name: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export const SchoolsManager = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolAdmins, setSchoolAdmins] = useState<SchoolAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    school_type: 'primary' as 'primary' | 'secondary'
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    full_name: '',
    email: '',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (error) throw error;

      // Fetch additional stats for each school
      const schoolsWithStats = await Promise.all(
        (data || []).map(async (school) => {
          const [adminCount, teacherCount, studentCount, classCount] = await Promise.all([
            supabase.from('admin_users').select('id', { count: 'exact' }).eq('school_id', school.id).eq('role', 'admin'),
            supabase.from('admin_users').select('id', { count: 'exact' }).eq('school_id', school.id).eq('role', 'teacher'),
            supabase.from('students').select('id', { count: 'exact' }).eq('school_id', school.id),
            supabase.from('classes').select('id', { count: 'exact' }).eq('school_id', school.id)
          ]);

          return {
            ...school,
            admin_count: adminCount.count || 0,
            teacher_count: teacherCount.count || 0,
            student_count: studentCount.count || 0,
            class_count: classCount.count || 0
          };
        })
      );

      setSchools(schoolsWithStats);
    } catch (error: any) {
      console.error('Error fetching schools:', error);
      toast({
        title: "Error",
        description: "Failed to load schools. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolAdmins = async (schoolId: string) => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('school_id', schoolId)
        .eq('role', 'admin')
        .order('full_name');

      if (error) throw error;
      setSchoolAdmins(data || []);
    } catch (error: any) {
      console.error('Error fetching school admins:', error);
      toast({
        title: "Error",
        description: "Failed to load school administrators.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSchool = async () => {
    if (!formData.name || !formData.location) {
      toast({
        title: "Missing fields",
        description: "Please fill in the school name and location.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let logoUrl: string | null = null;
      
      // Upload logo if a new one was selected
      if (logoFile && editingSchool) {
        logoUrl = await uploadLogo(editingSchool.id);
      } else if (logoFile && !editingSchool) {
        // For new schools, we'll upload after creation
        // First create the school, then upload logo
      }

      const schoolData = {
        ...formData,
        ...(logoUrl && { logo_url: logoUrl })
      };

      if (editingSchool) {
        // Update existing school
        const { error } = await supabase
          .from('schools')
          .update(schoolData)
          .eq('id', editingSchool.id);

        if (error) throw error;

        toast({
          title: "School updated",
          description: "The school has been updated successfully.",
        });
      } else {
        // Create new school first
        const { data: newSchool, error: insertError } = await supabase
          .from('schools')
          .insert([formData])
          .select()
          .single();

        if (insertError) throw insertError;

        // Upload logo for new school
        if (logoFile && newSchool) {
          logoUrl = await uploadLogo(newSchool.id);
          if (logoUrl) {
            await supabase
              .from('schools')
              .update({ logo_url: logoUrl })
              .eq('id', newSchool.id);
          }
        }

        toast({
          title: "School created",
          description: "The new school has been created successfully.",
        });
      }

      setDialogOpen(false);
      setEditingSchool(null);
      setFormData({ name: '', location: '', address: '', contact_email: '', contact_phone: '', school_type: 'primary' });
      setLogoFile(null);
      setLogoPreview(null);
      await fetchSchools();
    } catch (error: any) {
      console.error('Error saving school:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save school.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSchoolAdmin = async () => {
    if (!adminFormData.full_name || !adminFormData.email || !adminFormData.password || !selectedSchool) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Try Edge Function first (if deployed)
      let userCreated = false;
      let createdUserId: string | null = null;

      try {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: adminFormData.email,
            password: adminFormData.password,
            full_name: adminFormData.full_name,
            role: 'admin',
            school_id: selectedSchool.id,
            is_super_admin: false
          }
        });

        if (error) {
          console.warn('Edge function not available, using fallback:', error);
          throw error; // Will trigger fallback
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        if (data?.success && data?.user?.id) {
          userCreated = true;
          createdUserId = data.user.id;
        }
      } catch (edgeError: any) {
        // Edge Function not available - use fallback method
        console.log('Using fallback method to create user');
        
        // Fallback: Use regular signup, then update role
        // This requires the user to confirm email, but works without Edge Function
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: adminFormData.email,
          password: adminFormData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: adminFormData.full_name,
              role: 'admin',
              school_id: selectedSchool.id
            }
          }
        });

        if (signupError) {
          // If email already exists, show a helpful error message
          if (signupError.message?.includes('already registered') || signupError.message?.includes('already exists')) {
            toast({
              title: "User already exists",
              description: "This email is already registered. Please use a different email or contact support to update the existing user.",
              variant: "destructive",
            });
            return;
          }
          throw signupError;
        }

        if (!signupData?.user) {
          throw new Error('Failed to create user account');
        }

        createdUserId = signupData.user.id;

        // Update the admin_users record created by trigger
        const { error: updateError } = await supabase
          .from('admin_users')
          .update({
            role: 'admin',
            school_id: selectedSchool.id,
            full_name: adminFormData.full_name,
            is_active: true
          })
          .eq('user_id', signupData.user.id);

        if (updateError) {
          console.error('Failed to update user role:', updateError);
          // Don't throw - the user was created, just role update failed
          // They can be updated manually later
        }
      }

      if (!userCreated && !createdUserId) {
        throw new Error('Failed to create user');
      }

      toast({
        title: "School admin created",
        description: `${adminFormData.full_name} has been created as a school administrator.`,
      });

      setAdminDialogOpen(false);
      setAdminFormData({ full_name: '', email: '', password: '' });
      await fetchSchoolAdmins(selectedSchool.id);
      await fetchSchools(); // Refresh to update admin count
    } catch (error: any) {
      console.error('Error creating school admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create school administrator.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    if (!confirm('Are you sure you want to delete this school? This will also delete all associated data including students, teachers, and classes. This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', schoolId);

      if (error) throw error;

      toast({
        title: "School deleted",
        description: "The school and all associated data have been deleted.",
      });

      await fetchSchools();
    } catch (error: any) {
      console.error('Error deleting school:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete school.",
        variant: "destructive",
      });
    }
  };

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      location: school.location,
      address: school.address || '',
      contact_email: school.contact_email || '',
      contact_phone: school.contact_phone || '',
      school_type: school.school_type
    });
    setLogoPreview(school.logo_url);
    setLogoFile(null);
    setDialogOpen(true);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const uploadLogo = async (schoolId: string): Promise<string | null> => {
    if (!logoFile) return null;

    try {
      setUploadingLogo(true);
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `school-${schoolId}-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (editingSchool?.logo_url) {
        const oldFileName = editingSchool.logo_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('logos').remove([oldFileName]);
        }
      }

      // Upload new logo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error uploading logo",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleViewSchoolDetails = (school: School) => {
    setSelectedSchool(school);
    fetchSchoolAdmins(school.id);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (selectedSchool) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  {selectedSchool.name}
                </CardTitle>
                <CardDescription>
                  {selectedSchool.location} • {selectedSchool.school_type === 'primary' ? 'Primary School' : 'Secondary School'}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedSchool(null)}>
                Back to Schools
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-zambian-green mx-auto mb-2" />
                  <div className="text-2xl font-bold text-zambian-green">{selectedSchool.admin_count}</div>
                  <p className="text-sm text-muted-foreground">Administrators</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-zambian-orange mx-auto mb-2" />
                  <div className="text-2xl font-bold text-zambian-orange">{selectedSchool.teacher_count}</div>
                  <p className="text-sm text-muted-foreground">Teachers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <BookOpen className="w-8 h-8 text-zambian-red mx-auto mb-2" />
                  <div className="text-2xl font-bold text-zambian-red">{selectedSchool.class_count}</div>
                  <p className="text-sm text-muted-foreground">Classes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 text-zambian-black mx-auto mb-2" />
                  <div className="text-2xl font-bold text-zambian-black">{selectedSchool.student_count}</div>
                  <p className="text-sm text-muted-foreground">Students</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">School Administrators</h3>
                <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Administrator
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add School Administrator</DialogTitle>
                      <DialogDescription>
                        Create a new administrator account for {selectedSchool.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="admin_name">Full Name</Label>
                        <Input
                          id="admin_name"
                          placeholder="Enter full name"
                          value={adminFormData.full_name}
                          onChange={(e) => setAdminFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin_email">Email Address</Label>
                        <Input
                          id="admin_email"
                          type="email"
                          placeholder="Enter email address"
                          value={adminFormData.email}
                          onChange={(e) => setAdminFormData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="admin_password">Password</Label>
                        <Input
                          id="admin_password"
                          type="password"
                          placeholder="Enter password"
                          value={adminFormData.password}
                          onChange={(e) => setAdminFormData(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCreateSchoolAdmin}
                          disabled={saving}
                          className="flex-1"
                        >
                          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Administrator
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAdminDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolAdmins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No administrators found for this school
                        </TableCell>
                      </TableRow>
                    ) : (
                      schoolAdmins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">{admin.full_name}</TableCell>
                          <TableCell className="font-mono text-sm">{admin.user_id}</TableCell>
                          <TableCell>
                            {admin.is_active ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                Schools Management
              </CardTitle>
              <CardDescription>
                Manage all schools in the system and their administrators
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingSchool(null);
                  setFormData({ name: '', location: '', address: '', contact_email: '', contact_phone: '', school_type: 'primary' });
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add School
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingSchool ? 'Edit School' : 'Add New School'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSchool ? 'Update the school details' : 'Create a new school in the system'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">School Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Lusaka Primary School"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Lusaka, Zambia"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Full school address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        placeholder="school@example.com"
                        value={formData.contact_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_phone">Contact Phone</Label>
                      <Input
                        id="contact_phone"
                        placeholder="+260 xxx xxx xxx"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="school_type">School Type</Label>
                    <Select value={formData.school_type} onValueChange={(value: 'primary' | 'secondary') => setFormData(prev => ({ ...prev, school_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary School</SelectItem>
                        <SelectItem value="secondary">Secondary School</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="logo">School Logo</Label>
                    <div className="mt-2 space-y-2">
                      {logoPreview ? (
                        <div className="relative inline-block">
                          <img
                            src={logoPreview}
                            alt="School logo preview"
                            className="h-24 w-24 object-contain border border-purple-primary/30 rounded-lg p-2 bg-purple-light"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleRemoveLogo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="logo-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-primary/30 rounded-lg cursor-pointer bg-purple-light hover:bg-purple-primary/5 transition-colors"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <ImageIcon className="w-10 h-10 mb-2 text-purple-primary" />
                              <p className="mb-2 text-sm text-purple-primary">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">PNG, JPG (MAX. 2MB)</p>
                            </div>
                            <input
                              id="logo-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoSelect}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveSchool}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingSchool ? 'Update School' : 'Create School'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Admins</TableHead>
                  <TableHead>Teachers</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <School className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p>No schools found</p>
                      <p className="text-sm mt-2">Create your first school to get started</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{school.name}</div>
                          {school.contact_email && (
                            <div className="text-sm text-muted-foreground">{school.contact_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{school.location}</TableCell>
                      <TableCell>
                        <Badge variant={school.school_type === 'primary' ? 'default' : 'secondary'}>
                          {school.school_type === 'primary' ? 'Primary' : 'Secondary'}
                        </Badge>
                      </TableCell>
                      <TableCell>{school.admin_count}</TableCell>
                      <TableCell>{school.teacher_count}</TableCell>
                      <TableCell>{school.student_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSchoolDetails(school)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSchool(school)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSchool(school.id)}
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
    </div>
  );
};