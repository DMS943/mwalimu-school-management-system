import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, CheckCircle, AlertCircle } from 'lucide-react';

interface ParentLinkingGuideProps {
  onStartLinking: () => void;
}

export const ParentLinkingGuide = ({ onStartLinking }: ParentLinkingGuideProps) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="border-zambian-green/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-zambian-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-zambian-green" />
          </div>
          <CardTitle className="text-2xl text-zambian-green">Link Your Child's Account</CardTitle>
          <CardDescription className="text-base">
            Connect your parent account to your child's school records to access their reports and track their progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-4 bg-zambian-green/5 rounded-lg">
              <div className="w-8 h-8 bg-zambian-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-zambian-green">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-zambian-green mb-1">Enter Your Child's Information</h3>
                <p className="text-sm text-muted-foreground">
                  You'll need your child's first name, last name, and optionally their student number or date of birth for more accurate results.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-zambian-green/5 rounded-lg">
              <div className="w-8 h-8 bg-zambian-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Search className="w-4 h-4 text-zambian-green" />
              </div>
              <div>
                <h3 className="font-semibold text-zambian-green mb-1">Search and Verify</h3>
                <p className="text-sm text-muted-foreground">
                  We'll search for matching students and show you the results. Select your child from the list to confirm.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-zambian-green/5 rounded-lg">
              <div className="w-8 h-8 bg-zambian-green/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-zambian-green" />
              </div>
              <div>
                <h3 className="font-semibold text-zambian-green mb-1">Instant Access</h3>
                <p className="text-sm text-muted-foreground">
                  Once linked, you'll immediately have access to your child's reports, grades, and performance tracking.
                </p>
              </div>
            </div>
          </div>

          <div className="border-l-4 border-zambian-orange bg-zambian-orange/5 p-4 rounded-r-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-zambian-orange flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-zambian-orange mb-1">Important Notes</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Make sure you enter your child's name exactly as registered with the school</li>
                  <li>• If you can't find your child, contact the school office for assistance</li>
                  <li>• You can link multiple children to your account</li>
                  <li>• Each child can only be linked to one parent account</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center pt-4">
            <Button 
              onClick={onStartLinking}
              size="lg"
              className="bg-zambian-green hover:bg-zambian-green/90 text-white px-8"
            >
              <Users className="w-5 h-5 mr-2" />
              Start Linking Process
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};