import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, UserPlus, Users, School as SchoolIcon, Check, ChevronsUpDown, RefreshCw } from 'lucide-react';
import { useSchools } from '@/hooks/useSchools';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SimpleStudentLinkingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked?: () => void;
}

interface StudentMatch {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  date_of_birth: string;
  classes?: {
    name: string;
  };
}

export const SimpleStudentLinking = ({ open, onOpenChange, onLinked }: SimpleStudentLinkingProps) => {
  const [step, setStep] = useState<'search' | 'verify' | 'success'>('search');
  const [searchData, setSearchData] = useState({
    firstName: '',
    lastName: '',
    studentNumber: '',
    dateOfBirth: ''
  });
  const [foundStudents, setFoundStudents] = useState<StudentMatch[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentMatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [parentSchoolId, setParentSchoolId] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
  const { schools, loading: schoolsLoading, refreshSchools } = useSchools();

  // Fetch parent's school when component mounts or opens
  useEffect(() => {
    const fetchParentSchool = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('school_id')
          .eq('user_id', user.id)
          .eq('role', 'parent')
          .single();

        if (adminUser) {
          setParentSchoolId(adminUser.school_id);
          // Set as default selected school
          if (adminUser.school_id) {
            setSelectedSchoolId(adminUser.school_id);
          }
        }
      } catch (error) {
        console.error('Error fetching parent school:', error);
      }
    };

    if (open) {
      fetchParentSchool();
    }
  }, [open]);

  const handleSearch = async () => {
    // Allow search by student number alone, or by name
    if (!searchData.studentNumber && (!searchData.firstName || !searchData.lastName)) {
      toast({
        title: "Required fields missing",
        description: "Please enter either a student number OR both first and last name.",
        variant: "destructive",
      });
      return;
    }

    // Check if school is selected
    if (!selectedSchoolId) {
      toast({
        title: "School required",
        description: "Please select a school to search for students.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, try to find students (including those already linked)
      let query = supabase
        .from('students')
        .select(`
          id, first_name, last_name, student_number, date_of_birth, parent_user_id,
          classes (name)
        `);

      // Filter by selected school - students are school-specific
      query = query.eq('school_id', selectedSchoolId);

      // If student number is provided, search by that first (most specific)
      if (searchData.studentNumber) {
        query = query.ilike('student_number', `%${searchData.studentNumber.trim()}%`);
      } else {
        // Otherwise search by name
        if (searchData.firstName) {
          query = query.ilike('first_name', `%${searchData.firstName.trim()}%`);
        }
        if (searchData.lastName) {
          query = query.ilike('last_name', `%${searchData.lastName.trim()}%`);
        }
      }
      
      // Add date of birth filter if provided
      if (searchData.dateOfBirth) {
        query = query.eq('date_of_birth', searchData.dateOfBirth);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      // Log search details for debugging
      console.log('Search parameters:', {
        schoolId: selectedSchoolId,
        studentNumber: searchData.studentNumber,
        firstName: searchData.firstName,
        lastName: searchData.lastName,
        dateOfBirth: searchData.dateOfBirth
      });
      console.log('Search results:', data?.length || 0, 'students found');

      if (!data || data.length === 0) {
        // Provide more helpful error message
        let errorMessage = "No matching students found in the selected school. ";
        
        if (searchData.studentNumber) {
          errorMessage += `Student number "${searchData.studentNumber}" was not found. `;
        } else {
          errorMessage += `No students found matching "${searchData.firstName} ${searchData.lastName}". `;
        }
        
        errorMessage += "Please verify the student number/name is correct, the correct school is selected, and the student exists in the system.";
        
        toast({
          title: "No students found",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Separate students into available and already linked
      const availableStudents = data.filter(s => !s.parent_user_id);
      const linkedStudents = data.filter(s => s.parent_user_id);

      // If all found students are already linked, show helpful message
      if (availableStudents.length === 0 && linkedStudents.length > 0) {
        toast({
          title: "Student already linked",
          description: `Found ${linkedStudents.length} matching student(s), but ${linkedStudents.length === 1 ? 'they are' : 'they are all'} already linked to another parent account. Please contact the school administrator if you believe this is an error.`,
          variant: "destructive",
        });
        return;
      }

      // Show available students
      if (availableStudents.length > 0) {
        setFoundStudents(availableStudents);
        setStep('verify');
        
        // If there were also linked students, show info message
        if (linkedStudents.length > 0) {
          toast({
            title: "Some students already linked",
            description: `Found ${availableStudents.length} available student(s). ${linkedStudents.length} other matching student(s) are already linked.`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "No available students found",
          description: "No matching students available for linking. They may already be linked to another parent account.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error searching students:', error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search for students. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkStudent = async (student: StudentMatch) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the parent's admin_users.id (parent_user_id references admin_users.id, not auth.users.id)
      const { data: parentAdminUser, error: adminUserError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'parent')
        .single();

      if (adminUserError || !parentAdminUser) {
        throw new Error('Parent account not found. Please contact support.');
      }

      // Link the student to the parent by updating parent_user_id
      const { error: updateError } = await supabase
        .from('students')
        .update({ parent_user_id: parentAdminUser.id })
        .eq('id', student.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Also create the student_parents relationship (many-to-many)
      const { error: relationError } = await supabase
        .from('student_parents')
        .insert({
          student_id: student.id,
          parent_id: parentAdminUser.id,
          relationship: 'Parent'
        });

      // Ignore relation error if it's a duplicate (ON CONFLICT DO NOTHING)
      if (relationError && !relationError.message.includes('duplicate') && !relationError.code?.includes('23505')) {
        console.warn('Relation insert error (non-critical):', relationError);
        // Don't throw - the parent_user_id update is the main link
      }

      setSelectedStudent(student);
      setStep('success');
      
      toast({
        title: "Successfully linked!",
        description: `${student.first_name} ${student.last_name} has been linked to your account.`,
      });

      // Call the onLinked callback after a short delay
      setTimeout(() => {
        onLinked?.();
        handleClose();
      }, 2000);

    } catch (error: any) {
      console.error('Error linking student:', error);
      toast({
        title: "Linking failed",
        description: error.message || "Failed to link student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    setSearchData({ firstName: '', lastName: '', studentNumber: '', dateOfBirth: '' });
    setFoundStudents([]);
    setSelectedStudent(null);
    onOpenChange(false);
  };

  const renderSearchStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="school">School <span className="text-red-500">*</span></Label>
        <Popover open={schoolDropdownOpen} onOpenChange={(isOpen) => {
          setSchoolDropdownOpen(isOpen);
          // Refresh schools when dropdown opens to get latest data
          if (isOpen) {
            refreshSchools();
          }
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={schoolDropdownOpen}
              className="w-full justify-between border-zambian-green/30 hover:border-zambian-green focus:border-zambian-green"
              disabled={loading || schoolsLoading}
            >
              <div className="flex items-center gap-2">
                <SchoolIcon className="w-4 h-4 text-zambian-green/60" />
                {selectedSchoolId
                  ? schools?.find((school) => school.id === selectedSchoolId)?.name
                  : "Select school..."}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 bg-white shadow-lg border z-50" align="start">
            {schoolsLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
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
              </div>
            ) : (
              <Command>
                <CommandInput placeholder="Search schools..." className="h-10" />
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
                            setSchoolDropdownOpen(false);
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
        <p className="text-xs text-muted-foreground">
          Select the school where your child is enrolled
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="studentNumber">Student Number (Recommended)</Label>
        <Input
          id="studentNumber"
          placeholder="Enter student number (e.g., LBS102540)"
          value={searchData.studentNumber}
          onChange={(e) => setSearchData(prev => ({ ...prev, studentNumber: e.target.value }))}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Entering the student number is the fastest way to find your child. If you don't have it, use the name fields below.
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">Or search by name</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="Enter first name"
            value={searchData.firstName}
            onChange={(e) => setSearchData(prev => ({ ...prev, firstName: e.target.value }))}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Enter last name"
            value={searchData.lastName}
            onChange={(e) => setSearchData(prev => ({ ...prev, lastName: e.target.value }))}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={searchData.dateOfBirth}
          onChange={(e) => setSearchData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Adding date of birth helps find the exact student
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSearch}
          disabled={loading || !selectedSchoolId || (!searchData.studentNumber && (!searchData.firstName || !searchData.lastName))}
          className="flex-1"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Search className="mr-2 h-4 w-4" />
          Search for Student
        </Button>
        <Button variant="outline" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-zambian-green">Found {foundStudents.length} student{foundStudents.length > 1 ? 's' : ''}</h3>
        <p className="text-sm text-muted-foreground">Please select your child from the list below</p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {foundStudents.map((student) => (
          <Card key={student.id} className="cursor-pointer hover:bg-zambian-green/5 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-zambian-green">
                    {student.first_name} {student.last_name}
                  </h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Student Number: {student.student_number}</p>
                    <p>Date of Birth: {new Date(student.date_of_birth).toLocaleDateString()}</p>
                    {student.classes && (
                      <p>Class: {student.classes.name}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => handleLinkStudent(student)}
                  disabled={loading}
                  size="sm"
                  className="ml-4"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <UserPlus className="mr-2 h-4 w-4" />
                  Link This Child
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={() => setStep('search')} disabled={loading} className="flex-1">
          Back to Search
        </Button>
        <Button variant="outline" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-4 py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <Users className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zambian-green">Successfully Linked!</h3>
        <p className="text-muted-foreground mt-2">
          {selectedStudent?.first_name} {selectedStudent?.last_name} has been linked to your account.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          You can now view their reports and track their progress.
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {step === 'search' && 'Link Your Child'}
            {step === 'verify' && 'Select Your Child'}
            {step === 'success' && 'Link Successful'}
          </DialogTitle>
          <DialogDescription>
            {step === 'search' && 'Enter your child\'s information to find and link them to your account.'}
            {step === 'verify' && 'Please confirm which student is your child.'}
            {step === 'success' && 'Your child has been successfully linked to your account.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="pt-4">
          {step === 'search' && renderSearchStep()}
          {step === 'verify' && renderVerifyStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};