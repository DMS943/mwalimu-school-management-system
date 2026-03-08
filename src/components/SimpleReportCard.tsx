import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, TrendingUp, Award } from 'lucide-react';
import { getGradeBgColor } from '@/hooks/useAcademicSettings';

interface Subject {
  name: string;
  score: number;
  maxScore: number;
  grade: string;
}

interface ReportCardData {
  studentName: string;
  studentId: string;
  class: string;
  term: string;
  subjects: Subject[];
  totalScore: number;
  totalMaxScore: number;
  averagePercentage: number;
  rank: number;
  totalStudents: number;
  comments: string;
  schoolName?: string;
  schoolLogoUrl?: string | null;
}

interface SimpleReportCardProps {
  data: ReportCardData;
  template?: 'standard' | 'detailed' | 'minimal';
  gradeScale?: 'A-F' | '1-5' | 'percentage';
}

const SimpleReportCard = ({ data, template = 'standard', gradeScale = 'A-F' }: SimpleReportCardProps) => {
  // Handle empty or invalid data
  if (!data) {
    return (
      <Card className="w-full max-w-4xl mx-auto border-purple-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">No report data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border-purple-primary/20 dark:border-purple-primary/30 print:shadow-none print:border-0">
      <CardHeader className="text-center border-b border-purple-primary/20 bg-gradient-to-r from-purple-primary/5 to-purple-primary/10 dark:from-purple-primary/10 dark:to-purple-primary/20">
        <div className="flex items-center justify-center gap-3 mb-4">
          {data.schoolLogoUrl ? (
            <img
              src={data.schoolLogoUrl}
              alt={data.schoolName || 'School Logo'}
              className="h-16 w-16 object-contain rounded-lg border border-purple-primary/30 bg-white p-2 shadow-md"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-purple-primary to-purple-dark rounded-lg flex items-center justify-center shadow-md">
              <FileText className="h-8 w-8 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-purple-primary dark:text-purple-primary">
              {data.schoolName || 'Cumulative Score and Rank Analyzer School'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Academic Report Card</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Student Name</p>
            <p className="text-purple-primary dark:text-purple-primary font-semibold">{data.studentName}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Student ID</p>
            <p className="text-purple-primary dark:text-purple-primary font-semibold">{data.studentId}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Class</p>
            <p className="text-purple-primary dark:text-purple-primary font-semibold">{data.class}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">Term</p>
            <p className="text-purple-primary dark:text-purple-primary font-semibold">{data.term}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="mb-6">
          <CardTitle className="text-lg font-semibold text-purple-primary dark:text-purple-primary mb-4">Subject Performance</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-purple-primary/20 dark:border-purple-primary/30">
                  <th className="text-left p-3 text-purple-primary dark:text-purple-primary font-semibold">Subject</th>
                  <th className="text-center p-3 text-purple-primary dark:text-purple-primary font-semibold">Score</th>
                  <th className="text-center p-3 text-purple-primary dark:text-purple-primary font-semibold">Max Score</th>
                  <th className="text-center p-3 text-purple-primary dark:text-purple-primary font-semibold">Percentage</th>
                  <th className="text-center p-3 text-purple-primary dark:text-purple-primary font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects && data.subjects.length > 0 ? (
                  data.subjects.map((subject, index) => (
                    <tr key={index} className="border-b border-purple-primary/10 dark:border-purple-primary/20 hover:bg-purple-light dark:hover:bg-purple-primary/5 print:hover:bg-transparent">
                      <td className="p-3 text-purple-primary dark:text-purple-primary font-medium">{subject.name || 'Unknown Subject'}</td>
                      <td className="p-3 text-center text-purple-primary dark:text-purple-primary">{subject.score || 0}</td>
                      <td className="p-3 text-center text-gray-600 dark:text-gray-400">{subject.maxScore || 100}</td>
                      <td className="p-3 text-center text-purple-primary dark:text-purple-primary">
                        {subject.maxScore > 0 ? ((subject.score / subject.maxScore) * 100).toFixed(1) : '0.0'}%
                      </td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant="outline" 
                          className={`${getGradeBgColor(subject.grade || 'N/A', gradeScale)} border-purple-primary/30 print:border-purple-primary print:text-purple-primary`}
                        >
                          {subject.grade || 'N/A'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-600 dark:text-gray-400">
                      No subject data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {(template === 'standard' || template === 'detailed') && data.comments && (
          <div className="mb-4">
            <CardTitle className="text-lg font-semibold text-purple-primary dark:text-purple-primary mb-2">Teacher Comments</CardTitle>
            <div className="p-4 bg-purple-light dark:bg-purple-primary/10 rounded-lg border border-purple-primary/20 dark:border-purple-primary/30">
              <p className="text-purple-primary dark:text-purple-primary">{data.comments}</p>
            </div>
          </div>
        )}

        {template === 'detailed' && (
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-purple-light dark:bg-purple-primary/10 rounded-lg border border-purple-primary/20">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Average</p>
              <p className="text-2xl font-bold text-purple-primary">{data.averagePercentage.toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-purple-light dark:bg-purple-primary/10 rounded-lg border border-purple-primary/20">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Class Position</p>
              <p className="text-2xl font-bold text-purple-primary">
                {data.rank > 0 ? `${data.rank}${data.rank === 1 ? 'st' : data.rank === 2 ? 'nd' : data.rank === 3 ? 'rd' : 'th'}` : 'N/A'} of {data.totalStudents}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mt-6 pt-4 border-t border-purple-primary/20 dark:border-purple-primary/30 print:text-black">
          <p>Generated on: {new Date().toLocaleDateString()}</p>
          <p>{data.schoolName || 'Cumulative Score and Rank Analyzer School Management System'}</p>
        </div>
        
        {/* Print-only signature section */}
        <div className="hidden print:block mt-8 pt-6 border-t border-purple-primary/20">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-b border-purple-primary/30 mb-2 pb-1"></div>
              <p className="text-sm text-purple-primary">Class Teacher Signature</p>
            </div>
            <div className="text-center">
              <div className="border-b border-purple-primary/30 mb-2 pb-1"></div>
              <p className="text-sm text-purple-primary">Head Teacher Signature</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleReportCard;