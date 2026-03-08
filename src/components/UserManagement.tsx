
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Edit, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddUserDialog } from '@/components/AddUserDialog';

interface UserManagementProps {
  user: User;
}

interface AdminUser {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

const UserManagement = ({ user }: UserManagementProps) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserSchool();
  }, [user]);

  useEffect(() => {
    if (userSchoolId !== null || isSuperAdmin) {
      fetchUsers();
    }
  }, [userSchoolId, isSuperAdmin]);

  const fetchUserSchool = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('school_id, is_super_admin')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserSchoolId(data?.school_id || null);
      setIsSuperAdmin(data?.is_super_admin || false);
    } catch (error: any) {
      console.error('Error fetching user school:', error);
      setUserSchoolId(null);
      setIsSuperAdmin(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      // If not super admin, filter by school
      if (!isSuperAdmin && userSchoolId) {
        query = query.eq('school_id', userSchoolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      await fetchUsers();
      toast({
        title: 'Success',
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'teacher': return 'secondary';
      case 'parent': return 'outline';
      case 'student': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-zambian-green/30 border-t-zambian-green rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zambian-green">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zambian-green">User Management</h2>
          <p className="text-zambian-red">Manage users and their roles in the system</p>
        </div>
        <Button 
          onClick={() => setAddUserDialogOpen(true)}
          className="bg-zambian-green hover:bg-zambian-green/90"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-zambian-green">
              <Users className="w-5 h-5" />
              System Users ({users.length})
            </CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-zambian-green/20 rounded-md focus:outline-none focus:ring-2 focus:ring-zambian-green/20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zambian-green/20">
                  <th className="text-left py-3 px-4 font-medium text-zambian-green">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-zambian-green">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-zambian-green">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-zambian-green">Last Login</th>
                  <th className="text-left py-3 px-4 font-medium text-zambian-green">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-zambian-green/10 hover:bg-zambian-green/5">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-zambian-green">{user.full_name}</p>
                        <p className="text-sm text-zambian-red">ID: {user.user_id}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-zambian-red">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zambian-green/30 hover:bg-zambian-green/10"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className="border-zambian-green/30 hover:bg-zambian-green/10"
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        onUserAdded={fetchUsers}
        currentUser={user}
      />
    </div>
  );
};

export default UserManagement;
