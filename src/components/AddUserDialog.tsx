import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, School, Users } from 'lucide-react';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded?: () => void;
  currentUser?: any;
}

interface School {
  id: string;
  name: string;
  location: string;
}


export const AddUserDialog = ({ open, onOpenChange, onUserAdded, currentUser }: AddUserDialogProps) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'teacher' as 'teacher' | 'admin' | 'parent' | 'student',
    school_id: '',
    is_active: true
  });

  useEffect(() => {
    if (open) {
      fetchInitialData();
    }
  }, [open, currentUser]);

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

      // Set default school if user has specific school
      if (userSchoolId && !formData.school_id) {
        setFormData(prev => ({ ...prev, school_id: userSchoolId }));
      }


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

  const handleCreateUser = async () => {
    // Validation
    if (!formData.full_name || !formData.email || !formData.password || !formData.role || !formData.school_id) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
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
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            school_id: formData.school_id,
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
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            email_redirect_to: `${window.location.origin}/`,
            data: {
              full_name: formData.full_name,
              role: formData.role,
              school_id: formData.school_id
            }
          }
        });

        if (signupError) {
          // If email already exists, try to update the existing user's role
          if (signupError.message?.includes('already registered')) {
            // Get the existing user
            const { data: existingUser } = await supabase
              .from('admin_users')
              .select('user_id, email')
              .eq('email', formData.email)
              .single();

            if (existingUser) {
              // Update existing user
              const { error: updateError } = await supabase
                .from('admin_users')
                .update({
                  role: formData.role,
                  school_id: formData.school_id,
                  full_name: formData.full_name,
                  is_active: formData.is_active
                })
                .eq('user_id', existingUser.user_id);

              if (updateError) {
                throw new Error(`User exists but couldn't update: ${updateError.message}`);
              }

              toast({
                title: "User updated",
                description: `${formData.full_name} has been updated.`,
              });

              // Reset form
              setFormData({
                full_name: '',
                email: '',
                password: '',
                role: 'teacher',
                school_id: formData.school_id,
                is_active: true
              });

              onUserAdded?.();
              onOpenChange(false);
              return;
            }
          }
          throw signupError;
        }

        if (signupData?.user) {
          userCreated = true;
          createdUserId = signupData.user.id;
        }
      }

      // If user was created via Edge Function or fallback, ensure admin_users record exists
      if (userCreated && createdUserId) {
        // The trigger should create this, but we'll upsert to be safe
        const { error: adminError } = await supabase
          .from('admin_users')
          .upsert({
            user_id: createdUserId,
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            school_id: formData.school_id,
            is_active: formData.is_active
          }, {
            onConflict: 'user_id'
          });

        if (adminError) {
          console.error('Error creating/updating admin_users record:', adminError);
          // Don't fail completely - the trigger might have created it
        }

        toast({
          title: "User created successfully",
          description: `${formData.full_name} has been created as a ${formData.role}.${!userCreated ? ' They will need to confirm their email before logging in.' : ''}`,
        });

        // Reset form
        setFormData({
          full_name: '',
          email: '',
          password: '',
          role: 'teacher',
          school_id: formData.school_id, // Keep school selection
          is_active: true
        });

        onUserAdded?.();
        onOpenChange(false);
      }

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error creating user",
        description: error.message || "Failed to create user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to school management';
      case 'teacher':
        return 'Class management and student assessment';
      case 'parent':
        return 'Access to child\'s academic information';
      case 'student':
        return 'Access to own academic records';
      default:
        return '';
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Add New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account for the school system
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zambian-green">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="full_name"
                    placeholder="Enter full name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password (min 6 characters)"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  className="whitespace-nowrap"
                >
                  Generate
                </Button>
              </div>
              {formData.password && (
                <p className="text-xs text-muted-foreground">
                  Password strength: {formData.password.length >= 8 ? 'Strong' : formData.password.length >= 6 ? 'Medium' : 'Weak'}
                </p>
              )}
            </div>
          </div>

          {/* Role and Permissions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zambian-green">Role and Permissions</h3>
            
            <div className="space-y-2">
              <Label htmlFor="role">User Role *</Label>
              <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span className="font-medium">School Administrator</span>
                      <span className="text-xs text-muted-foreground">Full access to school management</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="teacher">
                    <div className="flex flex-col">
                      <span className="font-medium">Teacher</span>
                      <span className="text-xs text-muted-foreground">Class management and student assessment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="parent">
                    <div className="flex flex-col">
                      <span className="font-medium">Parent</span>
                      <span className="text-xs text-muted-foreground">Access to child's academic information</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {formData.role && (
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(formData.role)}
                </p>
              )}
            </div>
          </div>

          {/* School Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zambian-green">School Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school_id">School *</Label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Select value={formData.school_id} onValueChange={(value) => setFormData(prev => ({ ...prev, school_id: value }))}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{school.name}</span>
                            <span className="text-xs text-muted-foreground">{school.location}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
            </div>
          </div>

          {/* Account Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zambian-green">Account Settings</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked as boolean }))}
              />
              <Label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Account is active
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Inactive accounts cannot log in to the system
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleCreateUser}
              disabled={saving}
              className="flex-1 bg-zambian-green hover:bg-zambian-green/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};