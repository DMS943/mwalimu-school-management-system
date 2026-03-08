import { useState, useEffect } from 'react';
import { useCurrentSchool } from './useCurrentSchool';
import { User } from '@supabase/supabase-js';

export interface AcademicSettings {
  term_duration_weeks: number;
  grade_scale: 'A-F' | '1-5' | 'percentage';
  attendance_required_percentage: number;
  report_card_template: 'standard' | 'detailed' | 'minimal';
}

const DEFAULT_ACADEMIC_SETTINGS: AcademicSettings = {
  term_duration_weeks: 12,
  grade_scale: 'A-F',
  attendance_required_percentage: 80,
  report_card_template: 'standard',
};

/**
 * Hook to get academic settings for the current school
 */
export const useAcademicSettings = (user: User | null) => {
  const { school } = useCurrentSchool(user);
  const [settings, setSettings] = useState<AcademicSettings>(DEFAULT_ACADEMIC_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school) {
      setLoading(false);
      return;
    }

    try {
      const savedSettings = localStorage.getItem(`school_settings_${school.id}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.academic) {
          setSettings({
            ...DEFAULT_ACADEMIC_SETTINGS,
            ...parsed.academic,
          });
        }
      }
    } catch (error) {
      console.error('Error loading academic settings:', error);
    } finally {
      setLoading(false);
    }
  }, [school]);

  return { settings, loading };
};

/**
 * Calculate grade based on percentage and grade scale
 */
export const calculateGrade = (
  percentage: number,
  gradeScale: 'A-F' | '1-5' | 'percentage' = 'A-F'
): string => {
  if (gradeScale === 'percentage') {
    return `${Math.round(percentage)}%`;
  }

  if (gradeScale === '1-5') {
    if (percentage >= 90) return '5';
    if (percentage >= 80) return '4';
    if (percentage >= 70) return '3';
    if (percentage >= 60) return '2';
    if (percentage >= 50) return '1';
    return '0';
  }

  // Default A-F scale
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
};

/**
 * Get grade color based on grade
 */
export const getGradeColor = (grade: string, gradeScale: 'A-F' | '1-5' | 'percentage' = 'A-F'): string => {
  if (gradeScale === 'percentage') {
    const num = parseInt(grade.replace('%', ''));
    if (num >= 80) return 'text-green-600';
    if (num >= 70) return 'text-blue-600';
    if (num >= 60) return 'text-yellow-600';
    if (num >= 50) return 'text-orange-600';
    return 'text-red-600';
  }

  if (gradeScale === '1-5') {
    if (grade === '5') return 'text-green-600';
    if (grade === '4') return 'text-blue-600';
    if (grade === '3') return 'text-yellow-600';
    if (grade === '2') return 'text-orange-600';
    return 'text-red-600';
  }

  // A-F scale
  const gradeColors: { [key: string]: string } = {
    A: 'text-green-600',
    B: 'text-blue-600',
    C: 'text-yellow-600',
    D: 'text-orange-600',
    F: 'text-red-600',
  };
  return gradeColors[grade] || 'text-gray-600';
};

/**
 * Get grade background color
 */
export const getGradeBgColor = (grade: string, gradeScale: 'A-F' | '1-5' | 'percentage' = 'A-F'): string => {
  if (gradeScale === 'percentage') {
    const num = parseInt(grade.replace('%', ''));
    if (num >= 80) return 'bg-green-100 text-green-800';
    if (num >= 70) return 'bg-blue-100 text-blue-800';
    if (num >= 60) return 'bg-yellow-100 text-yellow-800';
    if (num >= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }

  if (gradeScale === '1-5') {
    if (grade === '5') return 'bg-green-100 text-green-800';
    if (grade === '4') return 'bg-blue-100 text-blue-800';
    if (grade === '3') return 'bg-yellow-100 text-yellow-800';
    if (grade === '2') return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  }

  // A-F scale
  const gradeColors: { [key: string]: string } = {
    A: 'bg-green-100 text-green-800',
    B: 'bg-blue-100 text-blue-800',
    C: 'bg-yellow-100 text-yellow-800',
    D: 'bg-orange-100 text-orange-800',
    F: 'bg-red-100 text-red-800',
  };
  return gradeColors[grade] || 'bg-gray-100 text-gray-800';
};
