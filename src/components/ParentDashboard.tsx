
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Bell, Link as LinkIcon } from 'lucide-react';
import ParentReportCards from '@/components/ParentReportCards';
import PerformanceAnalytics from '@/components/PerformanceAnalytics';
import ParentAttendance from '@/components/ParentAttendance';
import { useParentDashboard } from '@/hooks/useParentDashboard';
import { SimpleStudentLinking } from '@/components/SimpleStudentLinking';
import { ParentLinkingGuide } from '@/components/ParentLinkingGuide';
import UserSettings from '@/components/UserSettings';

interface ParentDashboardProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ParentDashboard = ({ user, activeTab, setActiveTab }: ParentDashboardProps) => {
  const { stats, children, recentActivities, loading, refetch } = useParentDashboard(user);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'children':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-zambian-green">My Children</h2>
              <Button onClick={() => setLinkDialogOpen(true)} className="gap-2">
                <LinkIcon className="h-4 w-4" />
                Link Student
              </Button>
            </div>
            {children.length === 0 ? (
              <ParentLinkingGuide onStartLinking={() => setLinkDialogOpen(true)} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {children.map((child) => (
                <Card key={child.id} className="border-zambian-green/20 hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-zambian-green flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {child.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-zambian-red">Class: <span className="text-zambian-green font-medium">{child.class}</span></p>
                      <p className="text-sm text-zambian-red">Current Average: <span className="text-zambian-green font-medium">{child.average}%</span></p>
                      <p className="text-sm text-zambian-red">Class Rank: <span className="text-zambian-green font-medium">{child.rank}</span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </div>
        );
      case 'reports':
        return <ParentReportCards user={user} />;
      case 'performance':
        return <PerformanceAnalytics user={user} />;
      case 'attendance':
        return <ParentAttendance user={user} />;
      case 'settings':
        return <UserSettings user={user} userRole="parent" />;
      case 'overview':
      default:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zambian-green">My Children</CardTitle>
                  <Users className="h-4 w-4 text-zambian-red" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zambian-green">{stats.childrenCount}</div>
                  <p className="text-xs text-zambian-red">Enrolled students</p>
                </CardContent>
              </Card>
              
              <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zambian-green">Attendance Rate</CardTitle>
                  <Bell className="h-4 w-4 text-zambian-red" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zambian-green">{stats.attendanceRate}%</div>
                  <p className="text-xs text-zambian-red">This month</p>
                </CardContent>
              </Card>
              
              <Card className="border-zambian-green/20 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zambian-green">Latest Reports</CardTitle>
                  <FileText className="h-4 w-4 text-zambian-red" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-zambian-green">{stats.newReports}</div>
                  <p className="text-xs text-zambian-red">New reports available</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green">Academic Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {children.length > 0 ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-zambian-red">Overall Average:</span>
                          <span className="font-semibold text-zambian-green">
                            {Math.round(children.reduce((sum, c) => sum + c.average, 0) / children.length)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-zambian-red">Children Enrolled:</span>
                          <span className="font-semibold text-zambian-green">{children.length}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No children linked yet</p>
                        <Button 
                          onClick={() => setLinkDialogOpen(true)}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          Link Your Child
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green">Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-zambian-green">• Review Mathematics concepts</p>
                    <p className="text-sm text-zambian-green">• Attend upcoming parent meeting</p>
                    <p className="text-sm text-zambian-green">• Check weekly reports</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green">Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-zambian-green/5 rounded-lg">
                          {activity.icon === 'FileText' ? (
                            <FileText className="w-4 h-4 text-zambian-green" />
                          ) : (
                            <Bell className="w-4 h-4 text-zambian-green" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-zambian-green">{activity.message}</p>
                            <p className="text-xs text-zambian-red">{activity.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No recent activities</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-zambian-green/20">
                <CardHeader>
                  <CardTitle className="text-zambian-green">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => setActiveTab('children')}
                      variant="ghost"
                      className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors h-auto flex flex-col items-start"
                    >
                      <Users className="w-6 h-6 text-zambian-green mb-2" />
                      <p className="text-sm font-medium text-zambian-green">View Children</p>
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('reports')}
                      variant="ghost"
                      className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors h-auto flex flex-col items-start"
                    >
                      <FileText className="w-6 h-6 text-zambian-green mb-2" />
                      <p className="text-sm font-medium text-zambian-green">View Reports</p>
                    </Button>
                    <Button 
                      onClick={() => setActiveTab('performance')}
                      variant="ghost"
                      className="p-3 bg-zambian-green/10 hover:bg-zambian-green/20 rounded-lg text-left transition-colors h-auto flex flex-col items-start"
                    >
                      <Bell className="w-6 h-6 text-zambian-green mb-2" />
                      <p className="text-sm font-medium text-zambian-green">View Performance</p>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderContent()}
      <SimpleStudentLinking 
        open={linkDialogOpen} 
        onOpenChange={setLinkDialogOpen}
        onLinked={refetch}
      />
    </div>
  );
};

export default ParentDashboard;
