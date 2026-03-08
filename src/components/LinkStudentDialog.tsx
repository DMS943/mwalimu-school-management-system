import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon } from 'lucide-react';

interface LinkStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked?: () => void;
}

export const LinkStudentDialog = ({ open, onOpenChange, onLinked }: LinkStudentDialogProps) => {
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLinkStudent = async () => {
    if (!linkCode.trim()) {
      toast({
        title: "Link code required",
        description: "Please enter the link code provided by your school.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('link_parent_to_student', {
        p_link_code: linkCode.trim().toUpperCase()
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; student_id?: string };

      if (result.success) {
        toast({
          title: "Success!",
          description: result.message,
        });
        setLinkCode('');
        onOpenChange(false);
        onLinked?.();
      } else {
        toast({
          title: "Unable to link",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error linking student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link to Your Child
          </DialogTitle>
          <DialogDescription>
            Enter the link code provided by your child's school to connect your account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="linkCode">Link Code</Label>
            <Input
              id="linkCode"
              placeholder="Enter 8-character code"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="uppercase font-mono tracking-wider"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              The link code is an 8-character code provided by your school
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleLinkStudent}
              disabled={loading || !linkCode.trim()}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Link Student
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
