import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  academic_year?: string;
  is_active: boolean;
  created_at: string;
}

export const TermsManager = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    academic_year: new Date().getFullYear().toString(),
    is_active: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserSchool();
  }, []);

  useEffect(() => {
    if (userSchoolId !== null || isSuperAdmin) {
      fetchTerms();
    }
  }, [userSchoolId, isSuperAdmin]);

  const fetchUserSchool = async () => {
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
    } catch (error: any) {
      console.error('Error fetching user school:', error);
      setUserSchoolId(null);
      setIsSuperAdmin(false);
    }
  };

  const fetchTerms = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('terms')
        .select('*')
        .order('start_date', { ascending: false });

      // Filter by school if not super admin
      if (!isSuperAdmin && userSchoolId) {
        query = query.eq('school_id', userSchoolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTerms(data || []);
    } catch (error: any) {
      console.error('Error fetching terms:', error);
      toast({
        title: "Error",
        description: "Failed to load terms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTerm = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.academic_year) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields (Name, Start Date, End Date, Academic Year).",
        variant: "destructive",
      });
      return;
    }

    if (!userSchoolId && !isSuperAdmin) {
      toast({
        title: "Error",
        description: "School ID not found. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const termData: any = {
        name: formData.name.trim(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        academic_year: formData.academic_year.trim(),
        is_active: formData.is_active,
        school_id: userSchoolId || null, // Will be set by super admin if needed
      };

      if (editingTerm) {
        // Update existing term
        const { error } = await supabase
          .from('terms')
          .update(termData)
          .eq('id', editingTerm.id);

        if (error) throw error;

        toast({
          title: "Term updated",
          description: "The term has been updated successfully.",
        });
      } else {
        // Create new term - ensure school_id is set
        if (!termData.school_id) {
          throw new Error('School ID is required to create a term');
        }

        const { error } = await supabase
          .from('terms')
          .insert([termData]);

        if (error) throw error;

        toast({
          title: "Term created",
          description: "The new term has been created successfully.",
        });
      }

      setDialogOpen(false);
      setEditingTerm(null);
      setFormData({ 
        name: '', 
        start_date: '', 
        end_date: '', 
        academic_year: new Date().getFullYear().toString(),
        is_active: false 
      });
      await fetchTerms();
    } catch (error: any) {
      console.error('Error saving term:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save term.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!confirm('Are you sure you want to delete this term? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('terms')
        .delete()
        .eq('id', termId);

      if (error) throw error;

      toast({
        title: "Term deleted",
        description: "The term has been deleted successfully.",
      });

      await fetchTerms();
    } catch (error: any) {
      console.error('Error deleting term:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete term.",
        variant: "destructive",
      });
    }
  };

  const handleEditTerm = (term: Term) => {
    setEditingTerm(term);
    setFormData({
      academic_year: term.academic_year || new Date().getFullYear().toString(),
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
      is_active: term.is_active
    });
    setDialogOpen(true);
  };

  const createSampleTerms = async () => {
    const sampleTerms = [
      {
        name: 'Term 1 - 2024',
        start_date: '2024-01-15',
        end_date: '2024-04-15',
        is_active: false
      },
      {
        name: 'Term 2 - 2024',
        start_date: '2024-05-01',
        end_date: '2024-08-15',
        is_active: false
      },
      {
        name: 'Term 3 - 2024',
        start_date: '2024-09-01',
        end_date: '2024-12-15',
        is_active: true
      }
    ];

    try {
      setSaving(true);
      const { error } = await supabase
        .from('terms')
        .insert(sampleTerms);

      if (error) throw error;

      toast({
        title: "Sample terms created",
        description: "3 sample terms have been added to the system.",
      });

      await fetchTerms();
    } catch (error: any) {
      console.error('Error creating sample terms:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create sample terms.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Academic Terms Management
              </CardTitle>
              <CardDescription>
                Manage academic terms for the school year
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {terms.length === 0 && (
                <Button
                  onClick={createSampleTerms}
                  disabled={saving}
                  variant="outline"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Sample Terms
                </Button>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingTerm(null);
                    setFormData({ 
                      name: '', 
                      start_date: '', 
                      end_date: '', 
                      academic_year: new Date().getFullYear().toString(),
                      is_active: false 
                    });
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Term
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTerm ? 'Edit Term' : 'Add New Term'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTerm ? 'Update the term details' : 'Create a new academic term'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="name">Term Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Term 1 - 2024"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start_date">Start Date *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_date">End Date *</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="academic_year">Academic Year *</Label>
                      <Input
                        id="academic_year"
                        type="text"
                        placeholder="e.g., 2024"
                        value={formData.academic_year}
                        onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="is_active">Set as active term</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveTerm}
                        disabled={saving}
                        className="flex-1"
                      >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingTerm ? 'Update Term' : 'Create Term'}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p>No academic terms found</p>
                      <p className="text-sm mt-2">Create your first term to get started</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  terms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.name}</TableCell>
                      <TableCell>{format(new Date(term.start_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(term.end_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {term.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTerm(term)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTerm(term.id)}
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