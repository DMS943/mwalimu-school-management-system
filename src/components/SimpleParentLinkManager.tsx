import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link, Unlink, Search, Users } from 'lucide-react';

interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  parent_user_id: string | null;
  classes?: {
    name: string;
    grade_level: number;
  };
  parent?: {
    full_name: string;
    id: string;
  };
}

interface Parent {
  user_id: string;
  full_name: string;
  id: string;
}

export const SimpleParentLinkManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [linkingStudent, setLinkingStudent] = useState<string | null>(null);
  const [unlinkingStudent, setUnlinkingStudent] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserContext();
  }, []);

  useEffect(() => {
    if (userSchoolId !== null || isSuperAdmin) {
      fetchData();
    }
  }, [userSchoolId, isSuperAdmin]);

  const fetchUserContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('admin_users')
        .select('school_id, is_super_admin')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserSchoolId(data?.school_id || null);
      setIsSuperAdmin(data?.is_super_admin || false);
    } catch (error) {
      console.error('Error fetching user context:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch students - filter by school if not super admin
      let studentsQuery = supabase
        .from('students')
        .select(`
          id, student_number, first_name, last_name, date_of_birth, parent_user_id, school_id,
          classes (name, grade_level)
        `)
        .order('first_name');

      if (!isSuperAdmin && userSchoolId) {
        studentsQuery = studentsQuery.eq('school_id', userSchoolId);
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;

      // Fetch parent info separately for students that have parents
      const studentsWithParents = await Promise.all(
        (studentsData || []).map(async (student) => {
          if (student.parent_user_id) {
            const { data: parentData } = await supabase
              .from('admin_users')
              .select('full_name, id')
              .eq('user_id', student.parent_user_id)
              .single();
            
            return { ...student, parent: parentData };
          }
          return student;
        })
      );

      setStudents(studentsWithParents);

      // Fetch parents - filter by school if not super admin
      let parentsQuery = supabase
        .from('admin_users')
        .select('user_id, full_name, id, school_id')
        .eq('role', 'parent')
        .order('full_name');

      if (!isSuperAdmin && userSchoolId) {
        parentsQuery = parentsQuery.eq('school_id', userSchoolId);
      }

      const { data: parentsData, error: parentsError } = await parentsQuery;
      if (parentsError) throw parentsError;
      setParents(parentsData || []);
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

  const handleLinkStudent = async () => {
    if (!selectedStudent || !selectedParent) return;

    setLinkingStudent(selectedStudent.id);
    try {
      const { error } = await supabase
        .from('students')
        .update({ parent_user_id: selectedParent })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast({
        title: "Student linked successfully",
        description: `${selectedStudent.first_name} ${selectedStudent.last_name} has been linked to the selected parent.`,
      });

      setDialogOpen(false);
      setSelectedStudent(null);
      setSelectedParent('');
      await fetchData();
    } catch (error: any) {
      console.error('Error linking student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link student.",
        variant: "destructive",
      });
    } finally {
      setLinkingStudent(null);
    }
  };

  const handleUnlinkStudent = async (student: Student) => {
    setUnlinkingStudent(student.id);
    try {
      const { error } = await supabase
        .from('students')
        .update({ parent_user_id: null })
        .eq('id', student.id);

      if (error) throw error;

      toast({
        title: "Student unlinked successfully",
        description: `${student.first_name} ${student.last_name} has been unlinked from their parent.`,
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error unlinking student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to unlink student.",
        variant: "destructive",
      });
    } finally {
      setUnlinkingStudent(null);
    }
  };

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.student_number}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const linkedStudents = filteredStudents.filter(s => s.parent_user_id);
  const unlinkedStudents = filteredStudents.filter(s => !s.parent_user_id);

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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Parent-Student Links Management
          </CardTitle>
          <CardDescription>
            Manage the connections between parents and their children. Parents can also link themselves using the simple search feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search students by name or student number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Linked: {linkedStudents.length}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                Unlinked: {unlinkedStudents.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unlinked Students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-orange-600">Students Without Parents ({unlinkedStudents.length})</CardTitle>
          <CardDescription>
            These students don't have parent accounts linked yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unlinkedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {searchTerm ? 'No unlinked students match your search' : 'All students have parents linked'}
                    </TableCell>
                  </TableRow>
                ) : (
                  unlinkedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono">{student.student_number}</TableCell>
                      <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                      <TableCell>
                        {student.classes ? `${student.classes.name} (Grade ${student.classes.grade_level})` : 'N/A'}
                      </TableCell>
                      <TableCell>{new Date(student.date_of_birth).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Dialog open={dialogOpen && selectedStudent?.id === student.id} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedStudent(student)}
                              disabled={linkingStudent === student.id}
                            >
                              {linkingStudent === student.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Link className="mr-2 h-4 w-4" />
                                  Link Parent
                                </>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Link Parent to {student.first_name} {student.last_name}</DialogTitle>
                              <DialogDescription>
                                Select a parent account to link to this student
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <Select value={selectedParent} onValueChange={setSelectedParent}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a parent account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {parents.map((parent) => (
                                    <SelectItem key={parent.user_id} value={parent.user_id}>
                                      {parent.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleLinkStudent}
                                  disabled={!selectedParent || linkingStudent === student.id}
                                  className="flex-1"
                                >
                                  {linkingStudent === student.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Link Student
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setDialogOpen(false);
                                    setSelectedStudent(null);
                                    setSelectedParent('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Linked Students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Students With Parents ({linkedStudents.length})</CardTitle>
          <CardDescription>
            These students have parent accounts linked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {searchTerm ? 'No linked students match your search' : 'No students have parents linked yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  linkedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono">{student.student_number}</TableCell>
                      <TableCell className="font-medium">{student.first_name} {student.last_name}</TableCell>
                      <TableCell>
                        {student.classes ? `${student.classes.name} (Grade ${student.classes.grade_level})` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{student.parent?.full_name || 'Unknown Parent'}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUnlinkStudent(student)}
                          disabled={unlinkingStudent === student.id}
                        >
                          {unlinkingStudent === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="mr-2 h-4 w-4" />
                              Unlink
                            </>
                          )}
                        </Button>
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