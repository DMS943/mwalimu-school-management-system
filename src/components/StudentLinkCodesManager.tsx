import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Copy, RefreshCw } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  class_id: string;
  parent_user_id: string | null;
}

interface LinkCode {
  id: string;
  student_id: string;
  link_code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  is_active: boolean;
  student?: {
    first_name: string;
    last_name: string;
    student_number: string;
  };
}

export const StudentLinkCodesManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [linkCodes, setLinkCodes] = useState<LinkCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch students without parents
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .is('parent_user_id', null)
        .order('first_name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch existing link codes
      const { data: codesData, error: codesError } = await supabase
        .from('student_link_codes')
        .select(`
          *,
          student:students(first_name, last_name, student_number)
        `)
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setLinkCodes(codesData || []);
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

  const generateLinkCode = async (studentId: string) => {
    setGeneratingFor(studentId);
    try {
      // Generate the code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_student_link_code');
      
      if (codeError) throw codeError;

      const linkCode = codeData as string;
      const expiresAt = addDays(new Date(), 30); // Expires in 30 days

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert the link code
      const { error: insertError } = await supabase
        .from('student_link_codes')
        .insert({
          student_id: studentId,
          link_code: linkCode,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) throw insertError;

      toast({
        title: "Link code generated",
        description: `Code: ${linkCode} (expires in 30 days)`,
      });

      await fetchData();
    } catch (error: any) {
      console.error('Error generating link code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate link code.",
        variant: "destructive",
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `Link code ${code} copied to clipboard.`,
    });
  };

  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.student_number}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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
          <CardTitle>Generate Parent Link Codes</CardTitle>
          <CardDescription>
            Generate unique codes for parents to link their accounts to their children
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No students without parents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono">{student.student_number}</TableCell>
                        <TableCell>{student.first_name} {student.last_name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => generateLinkCode(student.id)}
                            disabled={generatingFor === student.id}
                          >
                            {generatingFor === student.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Generate Code
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generated Link Codes</CardTitle>
              <CardDescription>View and manage existing parent link codes</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Link Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No link codes generated yet
                    </TableCell>
                  </TableRow>
                ) : (
                  linkCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        {code.student?.first_name} {code.student?.last_name}
                        <div className="text-xs text-muted-foreground">
                          {code.student?.student_number}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{code.link_code}</TableCell>
                      <TableCell>
                        {code.used_at ? (
                          <Badge variant="secondary">Used</Badge>
                        ) : code.is_active && new Date(code.expires_at) > new Date() ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(code.expires_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(code.link_code)}
                          disabled={!!code.used_at}
                        >
                          <Copy className="h-4 w-4" />
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
