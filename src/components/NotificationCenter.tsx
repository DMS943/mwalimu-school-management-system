import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellOff, 
  Settings, 
  Mail, 
  MessageSquare, 
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Check,
  Filter,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  notificationManager, 
  getInAppNotifications, 
  markNotificationAsRead,
  requestNotificationPermission,
  showNotification
} from '@/lib/notificationManager';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'sms' | 'email' | 'in_app';
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'academic' | 'attendance' | 'system' | 'general';
}

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    checkNotificationPermission();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchQuery, filterType, filterCategory, activeTab]);

  const loadNotifications = () => {
    try {
      const storedNotifications = getInAppNotifications();
      const notificationItems: NotificationItem[] = storedNotifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: 'in_app' as const,
        timestamp: new Date(notification.timestamp),
        read: notification.read,
        priority: 'medium' as const,
        category: 'academic' as const
      }));

      // Add some mock notifications for demonstration
      const mockNotifications: NotificationItem[] = [
        {
          id: '1',
          title: 'New Scores Available',
          body: 'Academic results for John Doe are now available. Overall Grade: A, Class Position: 3/35',
          type: 'email',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          read: false,
          priority: 'high',
          category: 'academic'
        },
        {
          id: '2',
          title: 'Attendance Alert',
          body: 'John Doe was marked absent today. Please contact the school if this is an error.',
          type: 'sms',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          read: true,
          priority: 'medium',
          category: 'attendance'
        },
        {
          id: '3',
          title: 'Rankings Updated',
          body: 'Class rankings have been updated. John Doe is now ranked 3rd in Grade 10A.',
          type: 'in_app',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          read: false,
          priority: 'low',
          category: 'academic'
        },
        {
          id: '4',
          title: 'System Maintenance',
          body: 'Scheduled maintenance will occur tonight from 11 PM to 1 AM.',
          type: 'in_app',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          read: true,
          priority: 'medium',
          category: 'system'
        }
      ];

      setNotifications([...notificationItems, ...mockNotifications]);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const checkNotificationPermission = async () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const requestPermission = async () => {
    try {
      const permission = await requestNotificationPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You will now receive browser notifications.",
        });
      } else {
        toast({
          title: "Notifications Denied",
          description: "Browser notifications are disabled. You can still see in-app notifications.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Permission Error",
        description: "Failed to request notification permission.",
        variant: "destructive",
      });
    }
  };

  const filterNotifications = () => {
    let filtered = [...notifications];

    // Filter by tab
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(notification => !notification.read);
        break;
      case 'read':
        filtered = filtered.filter(notification => notification.read);
        break;
      case 'high':
        filtered = filtered.filter(notification => notification.priority === 'high');
        break;
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType);
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(notification => notification.category === filterCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.body.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = (notificationId: string) => {
    try {
      markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    
    // Mark all stored notifications as read
    const storedNotifications = getInAppNotifications();
    storedNotifications.forEach(notification => {
      markNotificationAsRead(notification.id);
    });

    toast({
      title: "All Notifications Marked as Read",
      description: "All notifications have been marked as read.",
    });
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  const deleteAllNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
    toast({
      title: "All Notifications Deleted",
      description: "All notifications have been deleted.",
    });
  };

  const sendTestNotification = () => {
    if (permissionStatus === 'granted') {
      showNotification('Test Notification', {
        body: 'This is a test notification from Cumulative Score and Rank Analyzer.',
        icon: '/favicon.ico'
      });
    } else {
      toast({
        title: "Permission Required",
        description: "Please enable notifications to send test notifications.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic':
        return '📚';
      case 'attendance':
        return '📅';
      case 'system':
        return '⚙️';
      case 'general':
        return '📢';
      default:
        return '📄';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'in_app':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const unreadCount = notifications.filter(notification => !notification.read).length;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deleteAllNotifications}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          {permissionStatus !== 'granted' && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
              <div className="flex items-center space-x-2">
                <BellOff className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Browser notifications are disabled
                </span>
              </div>
              <Button size="sm" onClick={requestPermission}>
                Enable
              </Button>
            </div>
          )}

          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="sm" onClick={sendTestNotification}>
                Test
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
              <TabsTrigger value="high">High Priority</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredNotifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No notifications found
                    </div>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border rounded-lg ${
                          !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getTypeIcon(notification.type)}
                              <span className="text-sm font-medium">
                                {notification.title}
                              </span>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.body}
                            </p>
                            
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {getCategoryIcon(notification.category)} {notification.category}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-4">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCenter;
