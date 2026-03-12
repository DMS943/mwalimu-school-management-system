import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Loader2, BookOpen, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { schoolsApi } from '@/api/schools';
import { toast } from '@/hooks/use-toast';

interface Schedule {
  id: number;
  class_name: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  term_name: string;
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_NAMES: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const TeacherSchedule = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedSchedules, setGroupedSchedules] = useState<Record<string, Schedule[]>>({});

  useEffect(() => {
    loadSchedule();
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      groupSchedulesByDay();
    }
  }, [schedules]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await schoolsApi.getMySchedule();
      
      // Handle new response format with schedules array
      let schedulesArray = [];
      if (data.schedules) {
        schedulesArray = data.schedules;
      } else if (Array.isArray(data)) {
        schedulesArray = data;
      } else if (data.results) {
        schedulesArray = data.results;
      }
      
      setSchedules(schedulesArray);
      
      // Show message if no schedules found
      if (schedulesArray.length === 0) {
        toast({
          title: 'No Schedule Found',
          description: data.message || 'No teaching schedule has been assigned yet.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      console.error('Error loading schedule:', error);
      setSchedules([]); // Set empty array on error
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to load schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const groupSchedulesByDay = () => {
    const grouped: Record<string, Schedule[]> = {};
    
    schedules.forEach((schedule) => {
      const day = schedule.day_of_week.toLowerCase();
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(schedule);
    });

    // Sort schedules within each day by start time
    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    setGroupedSchedules(grouped);
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTimeColor = (startTime: string): string => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 10) return 'bg-blue-50 border-blue-200';
    if (hour < 12) return 'bg-green-50 border-green-200';
    if (hour < 15) return 'bg-yellow-50 border-yellow-200';
    return 'bg-purple-50 border-purple-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-green-800">My Schedule</h1>
              <p className="text-sm text-gray-600">Your weekly teaching schedule</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600" />
              <p className="mt-4 text-gray-600">Loading your schedule...</p>
            </CardContent>
          </Card>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No Schedule Found</p>
              <p className="text-sm mt-2">
                Your schedule hasn't been created yet. Contact your administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Overview
                </CardTitle>
                <CardDescription>
                  You have {schedules.length} class{schedules.length !== 1 ? 'es' : ''} scheduled this week
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Schedule by Day */}
            {DAYS_ORDER.map((day) => {
              const daySchedules = groupedSchedules[day];
              if (!daySchedules || daySchedules.length === 0) return null;

              return (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="text-xl">{DAY_NAMES[day]}</CardTitle>
                    <CardDescription>
                      {daySchedules.length} class{daySchedules.length !== 1 ? 'es' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className={`p-4 border-2 rounded-lg ${getTimeColor(schedule.start_time)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-4 w-4 text-gray-600" />
                                <span className="font-semibold text-gray-900">
                                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 mb-1">
                                <BookOpen className="h-4 w-4 text-gray-600" />
                                <span className="font-medium text-gray-800">
                                  {schedule.subject_name} ({schedule.subject_code})
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="h-4 w-4" />
                                <span>{schedule.class_name}</span>
                              </div>
                              
                              {schedule.room && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>Room {schedule.room}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <span className="inline-block px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 border">
                                {schedule.term_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

const Users = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default TeacherSchedule;
