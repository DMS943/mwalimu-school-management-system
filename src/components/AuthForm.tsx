
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock, User, School as SchoolIcon, Check, ChevronsUpDown, Plus, X, Users, RefreshCw, Search, Loader2 } from 'lucide-react';
import { useSchools } from '@/hooks/useSchools';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().trim().email({ message: "Invalid email address" }).max(255);
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" }).max(100);
const fullNameSchema = z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100);

const AuthForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [studentNumbers, setStudentNumbers] = useState<string[]>(['']);
  const [linkingStudents, setLinkingStudents] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<Array<{name: string, student_number: string}>>([]);
  const [searchingStudent, setSearchingStudent] = useState<number | null>(null);
  const [foundStudents, setFoundStudents] = useState<Array<{index: number, student: {id: string, first_name: string, last_name: string, student_number: string, parent_user_id: string | null}}>>([]);
  const { toast } = useToast();
  const { schools, loading: schoolsLoading, refreshSchools } = useSchools();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate email
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        toast({
          title: "Invalid email",
          description: emailResult.error.errors[0].message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Validate password
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        toast({
          title: "Invalid password",
          description: passwordResult.error.errors[0].message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (isSignUp) {
        // Validate full name
        const nameResult = fullNameSchema.safeParse(fullName);
        if (!nameResult.success) {
          toast({
            title: "Invalid name",
            description: nameResult.error.errors[0].message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Validate school selection for parent signup
        if (!selectedSchoolId) {
          toast({
            title: "School selection required",
            description: "Please select the school your child attends.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Validate at least one student number is provided
        const validStudentNumbers = studentNumbers.filter(num => num.trim() !== '');
        if (validStudentNumbers.length === 0) {
          toast({
            title: "Student number required",
            description: "Please enter at least one child's student number.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              school_id: selectedSchoolId,
            }
          }
        });
        
        if (error) throw error;
        
        // If account created successfully, link students
        if (data?.user) {
          setLinkingStudents(true);
          
          // The trigger handle_new_auth_user() already creates the admin_users record
          // We just need to update it with the school_id if it's a parent signup
          // Use upsert to handle both new records and existing ones
          const { error: adminUserError } = await supabase
            .from('admin_users')
            .upsert({
              user_id: data.user.id,
              full_name: fullName,
              email: email,
              role: 'parent',
              school_id: selectedSchoolId,
              is_active: true,
              is_super_admin: false
            }, {
              onConflict: 'user_id'
            });

          if (adminUserError) {
            console.error('Error creating/updating admin user:', adminUserError);
            // Don't fail the signup if this fails - the trigger might have already created it
          }

          // Link students by student number
          const linked: Array<{name: string, student_number: string}> = [];
          const errors: string[] = [];

          for (const studentNumber of validStudentNumbers) {
            try {
              // Find student by student number in the selected school
              const { data: student, error: studentError } = await supabase
                .from('students')
                .select('id, first_name, last_name, student_number, parent_user_id')
                .eq('student_number', studentNumber.trim())
                .eq('school_id', selectedSchoolId)
                .single();

              if (studentError || !student) {
                errors.push(`Student number ${studentNumber.trim()} not found`);
                continue;
              }

              // Check if student is already linked
              if (student.parent_user_id) {
                errors.push(`Student ${studentNumber.trim()} is already linked to another parent`);
                continue;
              }

              // Link the student
              const { error: linkError } = await supabase
                .from('students')
                .update({ parent_user_id: data.user.id })
                .eq('id', student.id);

              if (linkError) {
                errors.push(`Failed to link ${studentNumber.trim()}`);
                continue;
              }

              linked.push({
                name: `${student.first_name} ${student.last_name}`,
                student_number: student.student_number
              });
            } catch (err: any) {
              errors.push(`Error linking ${studentNumber.trim}: ${err.message}`);
            }
          }

          setLinkedStudents(linked);
          setLinkingStudents(false);

          if (linked.length > 0) {
            toast({
              title: "Account created successfully!",
              description: `Successfully linked ${linked.length} child${linked.length > 1 ? 'ren' : ''} to your account.`,
            });
          }

          if (errors.length > 0 && linked.length === 0) {
            toast({
              title: "Account created but linking failed",
              description: errors.join(', '),
              variant: "destructive",
            });
          } else if (errors.length > 0) {
            toast({
              title: "Some children could not be linked",
              description: errors.join(', '),
              variant: "destructive",
            });
          }
        }
        
        if (data?.user && !data?.user?.email_confirmed_at) {
          toast({
            title: "Check your email!",
            description: "We've sent you a confirmation link to complete your registration.",
          });
        }
        
        // Clear form and switch to login mode after a delay
        setTimeout(() => {
          setEmail('');
          setPassword('');
          setFullName('');
          setSelectedSchoolId('');
          setStudentNumbers(['']);
          setLinkedStudents([]);
          setIsSignUp(false);
        }, linkedStudents.length > 0 ? 5000 : 2000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Provide more user-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message.includes('Unable to validate email address')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.';
      }
      
      toast({
        title: "Authentication failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zambian-green/20 via-zambian-orange/10 to-zambian-red/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-8 pt-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-zambian-green to-zambian-red rounded-2xl flex items-center justify-center shadow-lg">
                <SchoolIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-zambian-green to-zambian-red bg-clip-text text-transparent">
              Cumulative Score and Rank Analyzer
            </CardTitle>
            <p className="text-zambian-green/80 mt-2 font-medium">Modern School Management System</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-2 h-2 bg-zambian-green rounded-full"></div>
              <div className="w-2 h-2 bg-zambian-red rounded-full"></div>
              <div className="w-2 h-2 bg-zambian-orange rounded-full"></div>
              <div className="w-2 h-2 bg-zambian-black rounded-full"></div>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleAuth} className="space-y-6">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-zambian-green">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zambian-green/60 w-5 h-5" />
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Enter your full name"
                        className="pl-10 h-12 border-zambian-green/30 focus:border-zambian-green focus:ring-zambian-green"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-zambian-green">
                      School <span className="text-zambian-red">*</span>
                    </label>
                    <Popover open={open} onOpenChange={(isOpen) => {
                      setOpen(isOpen);
                      // Refresh schools when dropdown opens to get latest data
                      if (isOpen) {
                        refreshSchools();
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full h-12 justify-between border-zambian-green/30 hover:border-zambian-green focus:border-zambian-green focus:ring-zambian-green"
                        >
                          <div className="flex items-center gap-2">
                            <SchoolIcon className="w-5 h-5 text-zambian-green/60" />
                            {selectedSchoolId
                              ? schools?.find((school) => school.id === selectedSchoolId)?.name
                              : "Select school your child attends..."}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-white shadow-lg border z-50" align="start">
                        {schoolsLoading ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading schools...
                          </div>
                        ) : !Array.isArray(schools) || schools.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground space-y-2">
                            <p>No schools available.</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => refreshSchools()}
                              className="mt-2"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Refresh
                            </Button>
                            <p className="text-xs text-gray-500 mt-2">
                              If you just added a school, click refresh to see it.
                            </p>
                          </div>
                        ) : (
                          <Command>
                            <CommandInput placeholder="Search schools..." className="h-12" />
                            <CommandList>
                              <CommandEmpty>No school found.</CommandEmpty>
                              {schools.length > 0 && (
                                <CommandGroup className="max-h-64 overflow-auto">
                                  {schools.map((school) => (
                                    <CommandItem
                                      key={school.id}
                                      value={school.name}
                                      onSelect={() => {
                                        setSelectedSchoolId(school.id);
                                        setOpen(false);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedSchoolId === school.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{school.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {school.location} • {school.school_type === 'primary' ? 'Primary' : 'Secondary'}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        )}
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-zambian-green/60">
                      This helps us connect you with your child's school
                    </p>
                  </div>

                  {/* Student Numbers Section - Only for parent signup */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-zambian-green">
                      Children's Student Numbers <span className="text-zambian-red">*</span>
                    </label>
                    <p className="text-xs text-zambian-green/60 mb-2">
                      Enter your child(ren)'s student number(s) to link them to your account. Click "Search" to verify the student exists before signing up.
                    </p>
                    
                    {studentNumbers.map((studentNumber, index) => {
                      const foundStudent = foundStudents.find(fs => fs.index === index);
                      const isSearching = searchingStudent === index;
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zambian-green/60 w-5 h-5" />
                              <Input
                                type="text"
                                value={studentNumber}
                                onChange={(e) => {
                                  const newNumbers = [...studentNumbers];
                                  newNumbers[index] = e.target.value;
                                  setStudentNumbers(newNumbers);
                                  // Remove found student if number changes
                                  setFoundStudents(fs => fs.filter(f => f.index !== index));
                                }}
                                placeholder={`Student number ${index + 1}`}
                                className="pl-10 h-12 border-zambian-green/30 focus:border-zambian-green focus:ring-zambian-green"
                                disabled={isSearching}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                if (!selectedSchoolId) {
                                  toast({
                                    title: "School required",
                                    description: "Please select a school first.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                if (!studentNumber.trim()) {
                                  toast({
                                    title: "Student number required",
                                    description: "Please enter a student number to search.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                setSearchingStudent(index);
                                try {
                                  const { data: student, error: studentError } = await supabase
                                    .from('students')
                                    .select('id, first_name, last_name, student_number, parent_user_id')
                                    .eq('student_number', studentNumber.trim())
                                    .eq('school_id', selectedSchoolId)
                                    .single();

                                  if (studentError || !student) {
                                    toast({
                                      title: "Student not found",
                                      description: `Student number "${studentNumber.trim()}" not found in the selected school.`,
                                      variant: "destructive",
                                    });
                                    setFoundStudents(fs => fs.filter(f => f.index !== index));
                                    return;
                                  }

                                  if (student.parent_user_id) {
                                    toast({
                                      title: "Already linked",
                                      description: `This student is already linked to another parent account.`,
                                      variant: "destructive",
                                    });
                                    setFoundStudents(fs => fs.filter(f => f.index !== index));
                                    return;
                                  }

                                  // Student found and available
                                  setFoundStudents(fs => [...fs.filter(f => f.index !== index), { index, student }]);
                                  toast({
                                    title: "Student found!",
                                    description: `Found: ${student.first_name} ${student.last_name}. Ready to link after signup.`,
                                  });
                                } catch (err: any) {
                                  console.error('Error searching student:', err);
                                  toast({
                                    title: "Search failed",
                                    description: err.message || "Failed to search for student.",
                                    variant: "destructive",
                                  });
                                  setFoundStudents(fs => fs.filter(f => f.index !== index));
                                } finally {
                                  setSearchingStudent(null);
                                }
                              }}
                              disabled={isSearching || !selectedSchoolId || !studentNumber.trim()}
                              className="h-12 border-zambian-green/30 text-zambian-green hover:bg-zambian-green/10"
                            >
                              {isSearching ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : foundStudent ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Search className="w-4 h-4" />
                              )}
                            </Button>
                            {studentNumbers.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const newNumbers = studentNumbers.filter((_, i) => i !== index);
                                  setStudentNumbers(newNumbers);
                                  setFoundStudents(fs => fs.filter(f => f.index !== index));
                                }}
                                className="h-12 w-12 border-zambian-red/30 text-zambian-red hover:bg-zambian-red/10"
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            )}
                          </div>
                          {foundStudent && (
                            <div className="ml-2 p-2 bg-green-50 border border-green-200 rounded-md">
                              <p className="text-sm text-green-800">
                                <Check className="w-4 h-4 inline mr-1" />
                                Found: <strong>{foundStudent.student.first_name} {foundStudent.student.last_name}</strong> - Ready to link
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStudentNumbers([...studentNumbers, ''])}
                      className="w-full border-zambian-green/30 text-zambian-green hover:bg-zambian-green/10"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Child
                    </Button>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zambian-green">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zambian-green/60 w-5 h-5" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    className="pl-10 h-12 border-zambian-green/30 focus:border-zambian-green focus:ring-zambian-green"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zambian-green">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zambian-green/60 w-5 h-5" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-12 border-zambian-green/30 focus:border-zambian-green focus:ring-zambian-green"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zambian-green/60 hover:text-zambian-green"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-zambian-green to-zambian-red hover:from-zambian-green/90 hover:to-zambian-red/90 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading || linkingStudents}
              >
                {isLoading || linkingStudents ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {linkingStudents ? 'Linking children...' : 'Processing...'}
                  </div>
                ) : (
                  isSignUp ? 'Create Account & Link Children' : 'Sign In'
                )}
              </Button>

              {/* Show linked students summary */}
              {linkedStudents.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-800">Successfully Linked Children:</h4>
                  </div>
                  <ul className="space-y-1">
                    {linkedStudents.map((student, idx) => (
                      <li key={idx} className="text-sm text-green-700">
                        ✓ {student.name} ({student.student_number})
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-green-600 mt-2">
                    You can now access their reports and academic information.
                  </p>
                </div>
              )}
            </form>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  // Reset form when switching modes
                  setEmail('');
                  setPassword('');
                  setFullName('');
                  setSelectedSchoolId('');
                  setStudentNumbers(['']);
                  setLinkedStudents([]);
                  setLinkingStudents(false);
                }}
                className="text-zambian-green hover:text-zambian-red text-sm font-medium hover:underline transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthForm;
