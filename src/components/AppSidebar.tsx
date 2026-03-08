
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Users,
  BookOpen,
  FileText,
  GraduationCap,
  BarChart3,
  User as UserIcon,
  Settings,
  LogOut,
  Home,
  UserCheck,
  Link,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppSidebarProps {
  user: User;
  userRole: string;
  isSuperAdmin?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AppSidebar = ({ user, userRole, isSuperAdmin = false, activeTab, setActiveTab }: AppSidebarProps) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    const commonItems = [
      { id: 'overview', title: 'Overview', icon: Home },
    ];

    switch (userRole) {
      case 'admin':
        // Super admins see system-wide management, school admins see school-specific
        if (isSuperAdmin) {
        return [
          ...commonItems,
          { id: 'schools', title: 'Schools Management', icon: GraduationCap },
          { id: 'users', title: 'System Users', icon: UserCheck },
          { id: 'settings', title: 'My Settings', icon: Settings },
          { id: 'system-settings', title: 'System Settings', icon: Settings },
          ];
        } else {
          return [
            ...commonItems,
          { id: 'score-management', title: 'Student Score Management', icon: BookOpen },
          { id: 'rankings', title: 'Rankings & Analytics', icon: BarChart3 },
          { id: 'reports', title: 'Report Generation', icon: FileText },
          { id: 'students', title: 'Student Management', icon: Users },
          { id: 'classes', title: 'Class Management', icon: BookOpen },
          { id: 'users', title: 'User Management', icon: UserCheck },
          { id: 'parent-links', title: 'Parent-Student Links', icon: Link },
          { id: 'terms', title: 'Academic Terms', icon: Calendar },
          { id: 'settings', title: 'My Settings', icon: Settings },
          { id: 'system-settings', title: 'School Settings', icon: Settings },
        ];
        }

      case 'teacher':
        return [
          ...commonItems,
          { id: 'students', title: 'My Students', icon: Users },
          { id: 'attendance', title: 'Mark Attendance', icon: UserCheck },
          { id: 'score-management', title: 'Score Management', icon: BookOpen },
          { id: 'reports', title: 'Student Reports', icon: FileText },
          { id: 'analytics', title: 'Class Analytics', icon: BarChart3 },
          { id: 'settings', title: 'Settings', icon: Settings },
        ];
      case 'parent':
      default:
        return [
          ...commonItems,
          { id: 'children', title: 'My Children', icon: Users },
          { id: 'reports', title: 'Report Cards', icon: FileText },
          { id: 'performance', title: 'Performance Tracking', icon: BarChart3 },
          { id: 'attendance', title: 'Attendance', icon: UserCheck },
          { id: 'settings', title: 'Settings', icon: Settings },
        ];
    }
  };

  const menuItems = getMenuItems();

  const handleMenuClick = (itemId: string) => {
    setActiveTab(itemId);
  };

  return (
    <Sidebar className="border-r border-purple-primary/20">
      <SidebarHeader className="border-b border-purple-primary/20 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-primary to-purple-dark rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-bold text-purple-primary">Cumulative Score and Rank Analyzer</h2>
              <p className="text-xs text-gray-600 capitalize">School Management System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-purple-primary font-medium">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className="w-full justify-start gap-3 hover:bg-purple-light data-[active=true]:bg-purple-primary/15 data-[active=true]:text-purple-primary data-[active=true]:border-r-2 data-[active=true]:border-purple-primary cursor-pointer"
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-purple-primary/20 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 bg-purple-light rounded-lg">
            <UserIcon className="w-4 h-4 text-purple-primary flex-shrink-0" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-primary truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-600 capitalize">{userRole}</p>
              </div>
            )}
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="w-full border-purple-primary/30 hover:bg-purple-light text-purple-primary"
          >
            <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
            {!collapsed && "Sign Out"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
