import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SimpleReportCard from '@/components/SimpleReportCard';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';
import { useAcademicSettings } from '@/hooks/useAcademicSettings';
import { generatePDFFromElement } from '@/lib/pdfGenerator';

interface ParentReportCardsProps {
  user: User;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  classes?: {
    name: string;
  };
}

interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface ReportData {
  schoolName?: string;
  schoolLogoUrl?: string | null;
  studentName: string;
  studentId: string;
  class: string;
  term: string;
  subjects: Array<{
    name: string;
    score: number;
    maxScore: number;
    grade: string;
  }>;
  totalScore: number;
  totalMaxScore: number;
  averagePercentage: number;
  rank: number;
  totalStudents: number;
  comments: string;
}

const ParentReportCards = ({ user }: ParentReportCardsProps) => {
  const { school } = useCurrentSchool(user);
  const { settings: academicSettings } = useAcademicSettings(user);
  const [children, setChildren] = useState<Child[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [showReportCard, setShowReportCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Get the parent's admin_users.id (parent_user_id references admin_users.id, not auth.users.id)
      const { data: parentAdminUser, error: adminUserError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'parent')
        .single();

      if (adminUserError || !parentAdminUser) {
        console.error('Parent admin user not found:', adminUserError);
        setLoading(false);
        return;
      }

      // Fetch children - parent_user_id references admin_users.id, not auth.users.id
      const { data: childrenData, error: childrenError } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, student_number,
          classes!current_class_id (name)
        `)
        .eq('parent_user_id', parentAdminUser.id);

      if (childrenError) throw childrenError;

      // Fetch terms
      const { data: termsData, error: termsError } = await supabase
        .from('terms')
        .select('*')
        .order('start_date', { ascending: false });

      if (termsError) throw termsError;



      setChildren(childrenData || []);
      setTerms(termsData || []);

      // Auto-select first child and active term if available
      if (childrenData && childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }

      if (termsData && termsData.length > 0 && !selectedTerm) {
        // Try to find active term first, otherwise use the first term
        const activeTerm = termsData.find(term => term.is_active);
        setSelectedTerm(activeTerm ? activeTerm.id : termsData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReportCard = async () => {
    if (!selectedChild || !selectedTerm) {
      toast({
        title: "Selection Required",
        description: "Please select both a child and term",
        variant: "destructive",
      });
      return;
    }

    setLoadingReport(true);
    try {
      // Get child data
      const child = children.find(c => c.id === selectedChild);
      const term = terms.find(t => t.id === selectedTerm);
      
      if (!child || !term) {
        throw new Error('Child or term not found');
      }

      // Fetch child with school information
      const { data: childWithSchool, error: childError } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, student_number, school_id,
          classes!current_class_id (name),
          schools!school_id (id, name, logo_url)
        `)
        .eq('id', selectedChild)
        .single();

      // Use child with school data if available, otherwise use the child from state
      const childData = childWithSchool || child;
      const childSchool = (childWithSchool as any)?.schools;

      // Fetch marks for the child in the selected term
      const { data: marks, error: marksError } = await supabase
        .from('marks')
        .select(`
          marks, grade,
          subjects (name, code)
        `)
        .eq('student_id', selectedChild)
        .eq('term_id', selectedTerm);

      // Don't throw on marks error - continue with empty marks
      if (marksError) {
        console.error('Error fetching marks:', marksError);
        // Continue with empty marks array
      }

      // Fetch report data if exists (reports table uses report_data JSONB)
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('report_data')
        .eq('student_id', selectedChild)
        .eq('term_id', selectedTerm)
        .maybeSingle();

      if (reportError && reportError.code !== 'PGRST116') {
        console.error('Error fetching report:', reportError);
        // Don't throw - continue without report data
      }

      // Calculate totals - handle case where marks might be empty
      const totalScore = marks?.reduce((sum, mark) => sum + (mark.marks || 0), 0) || 0;
      const totalMaxScore = (marks?.length || 0) * 100; // Assuming 100 max per subject
      const averagePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

      // If no marks, still show report card with empty data
      if (!marks || marks.length === 0) {
        toast({
          title: "No Marks Available",
          description: "No marks found for this term. Showing report card with available information.",
          variant: "default",
        });
        
        // Fetch child with school information for empty report
        const { data: childWithSchool } = await supabase
          .from('students')
          .select(`
            id, first_name, last_name, student_number, school_id,
            classes!current_class_id (name),
            schools!school_id (id, name, logo_url)
          `)
          .eq('id', selectedChild)
          .single();

        const childSchool = (childWithSchool as any)?.schools;
        const childData = childWithSchool || child;

        // Create report data with empty marks
        const reportData: ReportData = {
          studentName: `${childData.first_name} ${childData.last_name}`,
          studentId: childData.student_number,
          class: (childData as any)?.classes?.name || child.classes?.name || 'N/A',
          term: term.name,
          subjects: [],
          totalScore: 0,
          totalMaxScore: 0,
          averagePercentage: 0,
          rank: 0,
          totalStudents: 0,
          comments: "No marks have been recorded for this term yet.",
          schoolName: childSchool?.name || school?.name,
          schoolLogoUrl: childSchool?.logo_url || school?.logo_url
        };

        setReportData(reportData);
        setShowReportCard(true);
        setLoadingReport(false);
        return;
      }

      const reportData: ReportData = {
        studentName: `${childData.first_name} ${childData.last_name}`,
        studentId: childData.student_number,
        class: (childData as any)?.classes?.name || child.classes?.name || 'N/A',
        term: term.name,
        subjects: (marks || []).map(mark => ({
          name: mark.subjects?.name || 'Unknown Subject',
          score: mark.marks || 0,
          maxScore: 100,
          grade: mark.grade || 'N/A'
        })),
        totalScore,
        totalMaxScore,
        averagePercentage: parseFloat(averagePercentage.toFixed(1)),
        rank: (report?.report_data as any)?.rank || (report?.report_data as any)?.position || 0,
        totalStudents: (report?.report_data as any)?.total_students || (report?.report_data as any)?.class_size || 0,
        comments: (report?.report_data as any)?.comments || generateComments(averagePercentage),
        schoolName: childSchool?.name || school?.name,
        schoolLogoUrl: childSchool?.logo_url || school?.logo_url
      };

      setReportData(reportData);
      setShowReportCard(true);
    } catch (error: any) {
      console.error('Error in handleViewReportCard:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch report data. The report card may still display with limited information.",
        variant: "destructive",
      });
      
      // Try to show report card anyway with minimal data
      try {
        const child = children.find(c => c.id === selectedChild);
        const term = terms.find(t => t.id === selectedTerm);
        
        if (child && term) {
          const reportData: ReportData = {
            studentName: `${child.first_name} ${child.last_name}`,
            studentId: child.student_number,
            class: child.classes?.name || 'N/A',
            term: term.name,
            subjects: [],
            totalScore: 0,
            totalMaxScore: 0,
            averagePercentage: 0,
            rank: 0,
            totalStudents: 0,
            comments: "Unable to load complete report data. Please contact the school administrator.",
            schoolName: school?.name,
            schoolLogoUrl: school?.logo_url
          };
          setReportData(reportData);
          setShowReportCard(true);
        }
      } catch (fallbackError) {
        console.error('Error creating fallback report:', fallbackError);
      }
    } finally {
      setLoadingReport(false);
    }
  };

  const generateComments = (percentage: number): string => {
    if (percentage >= 90) {
      return "Excellent performance! Keep up the outstanding work.";
    } else if (percentage >= 80) {
      return "Very good performance. Continue working hard.";
    } else if (percentage >= 70) {
      return "Good performance overall. Focus on improvement areas.";
    } else if (percentage >= 60) {
      return "Satisfactory performance. More effort needed.";
    } else {
      return "Performance needs improvement. Seek additional support.";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      // Wait a bit for the report card to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate PDF from the report card element
      await generatePDFFromElement('report-card-container', {
        filename: `Report_Card_${reportData?.studentName.replace(/\s+/g, '_')}_${reportData?.term.replace(/\s+/g, '_')}.pdf`,
        format: 'A4',
        orientation: 'portrait',
      });
      
      toast({
        title: "Success",
        description: "PDF download started. Please use the print dialog to save as PDF.",
      });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF. Please try printing instead.",
        variant: "destructive",
      });
    }
  };

  if (showReportCard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setShowReportCard(false)}
            variant="outline"
          >
            Back to Selection
          </Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" className="border-purple-primary/30 text-purple-primary hover:bg-purple-light">
              <FileText className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} className="bg-purple-primary hover:bg-purple-dark">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
        <div id="report-card-container">
          {reportData && (
            <SimpleReportCard 
              data={reportData} 
              template={academicSettings.report_card_template}
              gradeScale={academicSettings.grade_scale}
            />
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-primary">
              <FileText className="w-5 h-5" />
              Access Report Cards
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setLoading(true);
                fetchData();
              }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Child</label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.length === 0 ? (
                    <SelectItem value="no-children" disabled>
                      No children found
                    </SelectItem>
                  ) : (
                    children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.first_name} {child.last_name} ({child.student_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Select Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={terms.length === 0 ? "No terms available" : "Choose a term"} />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {terms.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No terms found</div>
                  ) : (
                    terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{term.name}</span>
                          {term.start_date && term.end_date && (
                            <span className="text-xs text-gray-500">
                              {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {terms.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {terms.length} term{terms.length > 1 ? 's' : ''} available
                </p>
              )}
            </div>
          </div>
          
          <Button 
            onClick={handleViewReportCard}
            disabled={!selectedChild || !selectedTerm || loadingReport}
            className="w-full bg-purple-primary hover:bg-purple-dark text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingReport ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading Report...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                View Report Card
              </>
            )}
          </Button>
          {(!selectedChild || !selectedTerm) && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Please select both a child and a term to view the report card
            </p>
          )}
        </CardContent>
      </Card>

      {children.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No children records found.</p>
            <p className="text-sm text-gray-400 mt-2">
              Contact the school administrator to link your account with your children's records.
            </p>
          </CardContent>
        </Card>
      )}

      {children.length > 0 && terms.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No academic terms found.</p>
            <p className="text-sm text-gray-400 mt-2">
              The school hasn't set up any academic terms yet. Please contact the school administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParentReportCards;
