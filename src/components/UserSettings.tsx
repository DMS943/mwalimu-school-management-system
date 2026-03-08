import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Settings, User as UserIcon, Bell, Shield, Save, Loader2 } from 'lucide-react';

interface UserSettingsProps {
  user: User;
  userRole: string;
}

const UserSettings = ({ user, userRole }: UserSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    profile: {
      full_name: '',
      email: '',
      phone_number: '',
    },
    notifications: {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
    },
    preferences: {
      theme: 'light',
      language: 'en',
      date_format: 'DD/MM/YYYY',
    },
  });

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setUserProfile(data);
      setSettings(prev => ({
        ...prev,
        profile: {
          full_name: data?.full_name || user.user_metadata?.full_name || '',
          email: data?.email || user.email || '',
          phone_number: data?.phone_number || '',
        },
      }));
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user profile.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update admin_users table
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({
          full_name: settings.profile.full_name,
          phone_number: settings.profile.phone_number,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Settings Saved',
        description: 'Your settings have been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-purple-primary">My Settings</h2>
          <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-primary hover:bg-purple-dark"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Profile Settings */}
      <Card className="border-purple-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-primary">
            <UserIcon className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-purple-primary">Full Name</Label>
            <Input
              id="full_name"
              value={settings.profile.full_name}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                profile: { ...prev.profile, full_name: e.target.value }
              }))}
              className="border-purple-primary/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-purple-primary">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings.profile.email}
              disabled
              className="border-purple-primary/30 bg-gray-50"
            />
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number" className="text-purple-primary">Phone Number</Label>
            <Input
              id="phone_number"
              value={settings.profile.phone_number}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                profile: { ...prev.profile, phone_number: e.target.value }
              }))}
              className="border-purple-primary/30"
              placeholder="+260-XXX-XXXXXX"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-purple-primary">Role</Label>
            <Badge variant="outline" className="border-purple-primary/30">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-purple-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-primary">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-purple-primary">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive notifications via email</p>
            </div>
            <Switch
              checked={settings.notifications.email_notifications}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, email_notifications: checked }
              }))}
            />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-purple-primary">Push Notifications</p>
              <p className="text-sm text-gray-500">Browser push notifications</p>
            </div>
            <Switch
              checked={settings.notifications.push_notifications}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, push_notifications: checked }
              }))}
            />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-purple-primary">SMS Notifications</p>
              <p className="text-sm text-gray-500">Receive notifications via SMS</p>
            </div>
            <Switch
              checked={settings.notifications.sms_notifications}
              onCheckedChange={(checked) => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, sms_notifications: checked }
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card className="border-purple-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-primary">
            <Settings className="w-5 h-5" />
            Display Preferences
          </CardTitle>
          <CardDescription>Customize your display settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme" className="text-purple-primary">Theme</Label>
            <select
              id="theme"
              value={settings.preferences.theme}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                preferences: { ...prev.preferences, theme: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-purple-primary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_format" className="text-purple-primary">Date Format</Label>
            <select
              id="date_format"
              value={settings.preferences.date_format}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                preferences: { ...prev.preferences, date_format: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-purple-primary/30 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings (for all users) */}
      <Card className="border-purple-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-primary">
            <Shield className="w-5 h-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-purple-primary">Password</Label>
            <Button
              variant="outline"
              className="w-full border-purple-primary/30 text-purple-primary hover:bg-purple-light"
              onClick={() => {
                toast({
                  title: 'Password Change',
                  description: 'Password change functionality will be available soon.',
                });
              }}
            >
              Change Password
            </Button>
          </div>
          <div className="p-4 bg-purple-light rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last Login:</strong> {userProfile?.last_login 
                ? new Date(userProfile.last_login).toLocaleString()
                : 'Never'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSettings;
