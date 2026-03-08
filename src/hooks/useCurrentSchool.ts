import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface School {
  id: string;
  name: string;
  logo_url: string | null;
  location: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export const useCurrentSchool = (user: User | null) => {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSchool(null);
      setLoading(false);
      return;
    }

    fetchCurrentSchool();
  }, [user]);

  const fetchCurrentSchool = async () => {
    try {
      setLoading(true);
      
      // Get the user's school_id from admin_users
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (adminError) throw adminError;
      if (!adminData?.school_id) {
        setSchool(null);
        return;
      }

      // Fetch the school details
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name, logo_url, location, address, contact_email, contact_phone')
        .eq('id', adminData.school_id)
        .single();

      if (schoolError) throw schoolError;
      setSchool(schoolData as School);
    } catch (error: any) {
      console.error('Error fetching current school:', error);
      setSchool(null);
    } finally {
      setLoading(false);
    }
  };

  return { school, loading, refetch: fetchCurrentSchool };
};
