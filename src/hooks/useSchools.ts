import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface School {
  id: string;
  name: string;
  school_type: 'primary' | 'secondary';
  location: string;
}

export const useSchools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true);
        // Try public_schools first, fallback to schools if needed
        let data, error;
        
        // Query from public_schools table for non-sensitive data
        const result = await supabase
          .from('public_schools')
          .select('id, name, school_type, location')
          .order('name', { ascending: true });

        error = result.error;
        data = result.data;

        // If public_schools fails, try schools table directly (for authenticated users)
        if (error) {
          console.warn('Error fetching from public_schools, trying schools table:', error);
          const schoolsResult = await supabase
            .from('schools')
            .select('id, name, school_type, location')
            .order('name', { ascending: true });
          
          if (!schoolsResult.error) {
            data = schoolsResult.data;
            error = null;
          } else {
            error = schoolsResult.error;
          }
        }

        if (error) {
          console.error('Error fetching schools:', error);
          throw error;
        }
        
        console.log('Fetched schools:', data?.length || 0, 'schools');
        setSchools(data || []);
      } catch (error: any) {
        console.error('Error fetching schools:', error);
        // Set empty array on error so UI doesn't break
        setSchools([]);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchSchools();

    // Subscribe to real-time changes on public_schools table
    const channel = supabase
      .channel('public_schools_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'public_schools'
        },
        (payload) => {
          console.log('Schools changed:', payload);
          // Refetch schools when changes occur
          fetchSchools();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Manual refresh function
  const refreshSchools = async () => {
    setLoading(true);
    try {
      // Try public_schools first, fallback to schools if needed
      let result = await supabase
        .from('public_schools')
        .select('id, name, school_type, location')
        .order('name', { ascending: true });

      if (result.error) {
        console.warn('Error refreshing from public_schools, trying schools table:', result.error);
        result = await supabase
          .from('schools')
          .select('id, name, school_type, location')
          .order('name', { ascending: true });
      }

      if (result.error) {
        console.error('Error refreshing schools:', result.error);
        throw result.error;
      }
      
      console.log('Refreshed schools:', result.data?.length || 0, 'schools');
      setSchools(result.data || []);
    } catch (error) {
      console.error('Error refreshing schools:', error);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  return { schools, loading, refreshSchools };
};
