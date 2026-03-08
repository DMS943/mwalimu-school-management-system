
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Settings, Shield, Bell, Database, Mail, Globe, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentSchool } from '@/hooks/useCurrentSchool';

interface SystemSettingsProps {
  user: User;
}

interface SystemConfig {
  notifications: {
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
    maintenance_alerts: boolean;
  };
  security: {
    two_factor_required: boolean;
    password_expiry_days: number;
    max_login_attempts: number;
    session_timeout_minutes: number;
  };
  system: {
    maintenance_mode: boolean;
    auto_backup: boolean;
    debug_mode: boolean;
    api_rate_limiting: boolean;
  };
  academic: {
    term_duration_weeks: number;
    grade_scale: string;
    attendance_required_percentage: number;
    report_card_template: string;
  };
}

const SystemSettings = ({ user }: SystemSettingsProps) => {
  const { school } = useCurrentSchool(user);
  const [config, setConfig] = useState<SystemConfig>({
    notifications: {
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      maintenance_alerts: true,
    },
    security: {
      two_factor_required: false,
      password_expiry_days: 90,
      max_login_attempts: 5,
      session_timeout_minutes: 60,
    },
    system: {
      maintenance_mode: false,
      auto_backup: true,
      debug_mode: false,
      api_rate_limiting: true,
    },
    academic: {
      term_duration_weeks: 12,
      grade_scale: 'A-F',
      attendance_required_percentage: 80,
      report_card_template: 'standard',
    },
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, [school]);

  const fetchSettings = async () => {
    if (!school) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Check if settings table exists, if not, use school metadata or create a simple storage
      // For now, we'll store in a JSONB column in schools table or use localStorage
      const { data: schoolData, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', school.id)
        .single();

      if (error) throw error;

      // Try to get settings from school metadata or use defaults
      // If schools table has a settings JSONB column, use it
      // Otherwise, we'll use localStorage as a fallback
      const savedSettings = localStorage.getItem(`school_settings_${school.id}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.academic) {
            setConfig(prev => ({
              ...prev,
              academic: { ...prev.academic, ...parsed.academic }
            }));
          }
        } catch (e) {
          console.error('Error parsing saved settings:', e);
        }
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!school) {
      toast({
        title: 'Error',
        description: 'School information not available.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Save academic settings to localStorage (can be migrated to database later)
      const settingsToSave = {
        academic: config.academic,
        system: config.system,
        security: config.security,
        notifications: config.notifications
      };
      localStorage.setItem(`school_settings_${school.id}`, JSON.stringify(settingsToSave));

      // Optionally, save to database if a settings table exists
      // For now, we'll use localStorage as it's simpler and works immediately
      
      toast({
        title: 'Settings Saved',
        description: 'Academic configuration has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(prev => ({
      ...prev,
      academic: {
        term_duration_weeks: 12,
        grade_scale: 'A-F',
        attendance_required_percentage: 80,
        report_card_template: 'standard',
      }
    }));
    toast({
      title: 'Settings Reset',
      description: 'Academic settings have been reset to defaults.',
    });
  };

  const updateNotificationSetting = (key: keyof SystemConfig['notifications'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const updateSecuritySetting = (key: keyof SystemConfig['security'], value: boolean | number) => {
    setConfig(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }));
  };

  const updateSystemSetting = (key: keyof SystemConfig['system'], value: boolean) => {
    setConfig(prev => ({
      ...prev,
      system: { ...prev.system, [key]: value }
    }));
  };

  const updateAcademicSetting = (key: keyof SystemConfig['academic'], value: number | string) => {
    setConfig(prev => ({
      ...prev,
      academic: { ...prev.academic, [key]: value }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-purple-primary">System Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Configure system-wide settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="border-purple-primary/30 hover:bg-purple-primary/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-primary hover:bg-purple-dark"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Notification Settings */}
        <Card className="border-purple-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-primary">
              <Bell className="w-5 h-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">Email Notifications</p>
                <p className="text-sm text-gray-600">Send notifications via email</p>
              </div>
              <Switch
                checked={config.notifications.email_enabled}
                onCheckedChange={(checked) => updateNotificationSetting('email_enabled', checked)}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">SMS Notifications</p>
                <p className="text-sm text-gray-600">Send notifications via SMS</p>
              </div>
              <Switch
                checked={config.notifications.sms_enabled}
                onCheckedChange={(checked) => updateNotificationSetting('sms_enabled', checked)}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">Push Notifications</p>
                <p className="text-sm text-gray-600">Browser push notifications</p>
              </div>
              <Switch
                checked={config.notifications.push_enabled}
                onCheckedChange={(checked) => updateNotificationSetting('push_enabled', checked)}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">Maintenance Alerts</p>
                <p className="text-sm text-gray-600">Alert users about system maintenance</p>
              </div>
              <Switch
                checked={config.notifications.maintenance_alerts}
                onCheckedChange={(checked) => updateNotificationSetting('maintenance_alerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="border-purple-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-primary">
              <Shield className="w-5 h-5" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Require 2FA for all admin users</p>
              </div>
              <Switch
                checked={config.security.two_factor_required}
                onCheckedChange={(checked) => updateSecuritySetting('two_factor_required', checked)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-primary mb-2">
                  Password Expiry (days)
                </label>
                <input
                  type="number"
                  value={config.security.password_expiry_days}
                  onChange={(e) => updateSecuritySetting('password_expiry_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-purple-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-primary mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  value={config.security.max_login_attempts}
                  onChange={(e) => updateSecuritySetting('max_login_attempts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-purple-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-primary mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={config.security.session_timeout_minutes}
                  onChange={(e) => updateSecuritySetting('session_timeout_minutes', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-purple-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="border-purple-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-primary">
              <Database className="w-5 h-5" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">Maintenance Mode</p>
                <p className="text-sm text-gray-600">Put system in maintenance mode</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.system.maintenance_mode ? 'destructive' : 'default'}>
                  {config.system.maintenance_mode ? 'ON' : 'OFF'}
                </Badge>
                <Switch
                  checked={config.system.maintenance_mode}
                  onCheckedChange={(checked) => updateSystemSetting('maintenance_mode', checked)}
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">Auto Backup</p>
                <p className="text-sm text-gray-600">Automatically backup system data</p>
              </div>
              <Switch
                checked={config.system.auto_backup}
                onCheckedChange={(checked) => updateSystemSetting('auto_backup', checked)}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">Debug Mode</p>
                <p className="text-sm text-gray-600">Enable detailed logging</p>
              </div>
              <Switch
                checked={config.system.debug_mode}
                onCheckedChange={(checked) => updateSystemSetting('debug_mode', checked)}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-purple-primary">API Rate Limiting</p>
                <p className="text-sm text-gray-600">Enable API request rate limiting</p>
              </div>
              <Switch
                checked={config.system.api_rate_limiting}
                onCheckedChange={(checked) => updateSystemSetting('api_rate_limiting', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Settings */}
        <Card className="border-purple-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-primary">
              <Globe className="w-5 h-5" />
              Academic Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-primary mb-2">
                  Term Duration (weeks)
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={config.academic.term_duration_weeks}
                  onChange={(e) => updateAcademicSetting('term_duration_weeks', parseInt(e.target.value) || 12)}
                  className="w-full px-3 py-2 border border-purple-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20 dark:bg-gray-800 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Number of weeks in an academic term</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-primary mb-2">
                  Required Attendance (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.academic.attendance_required_percentage}
                  onChange={(e) => updateAcademicSetting('attendance_required_percentage', parseInt(e.target.value) || 80)}
                  className="w-full px-3 py-2 border border-purple-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20 dark:bg-gray-800 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum attendance percentage required</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-primary mb-2">
                  Grade Scale
                </label>
                <select 
                  value={config.academic.grade_scale}
                  onChange={(e) => updateAcademicSetting('grade_scale', e.target.value)}
                  className="w-full px-3 py-2 border border-purple-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20 dark:bg-gray-800 dark:text-white"
                >
                  <option value="A-F">A-F Scale</option>
                  <option value="1-5">1-5 Scale</option>
                  <option value="percentage">Percentage</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Grading system used for assessments</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-primary mb-2">
                  Report Card Template
                </label>
                <select 
                  value={config.academic.report_card_template}
                  onChange={(e) => updateAcademicSetting('report_card_template', e.target.value)}
                  className="w-full px-3 py-2 border border-purple-primary/20 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-primary/20 dark:bg-gray-800 dark:text-white"
                >
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed</option>
                  <option value="minimal">Minimal</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Default template for report cards</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemSettings;
