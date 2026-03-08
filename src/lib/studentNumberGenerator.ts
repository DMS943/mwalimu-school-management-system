import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a student number with school prefix
 * Format: [SCHOOL_PREFIX][SEQUENTIAL_NUMBER]
 * Example: LBS001, LBS002, etc.
 */

/**
 * Generates a school prefix from school name
 * Examples:
 * - "Lusaka Boys School" -> "LBS"
 * - "Kabwe Secondary" -> "KS"
 * - "St. Mary's Primary" -> "SMP"
 */
export function generateSchoolPrefix(schoolName: string): string {
  // Remove common words and special characters
  const cleaned = schoolName
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '') // Remove non-letters except spaces
    .replace(/\b(ST|SAINT|THE|OF|AND|SCHOOL|SECONDARY|PRIMARY|HIGH|BOYS|GIRLS)\b/gi, '') // Remove common words
    .trim();

  // Split into words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    // Fallback: use first 3 letters
    return schoolName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  }

  if (words.length === 1) {
    // Single word: use first 3 letters
    return words[0].substring(0, 3);
  }

  // Multiple words: use first letter of each word (max 3 words)
  return words.slice(0, 3).map(w => w[0]).join('');
}

/**
 * Generates the next student number for a school
 * Format: [PREFIX][NUMBER] where NUMBER is zero-padded to 3 digits
 * Example: LBS001, LBS002, ..., LBS999
 */
export async function generateNextStudentNumber(
  schoolId: string,
  schoolName: string
): Promise<string> {
  const prefix = generateSchoolPrefix(schoolName);
  
  // Find the highest existing student number with this prefix in this school
  const { data: existingStudents, error } = await supabase
    .from('students')
    .select('student_number')
    .eq('school_id', schoolId)
    .like('student_number', `${prefix}%`)
    .order('student_number', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching existing student numbers:', error);
    // Fallback: start from 001
    return `${prefix}001`;
  }

  if (!existingStudents || existingStudents.length === 0) {
    // No existing students with this prefix, start from 001
    return `${prefix}001`;
  }

  // Extract the number from the last student number
  const lastNumber = existingStudents[0].student_number;
  const numberMatch = lastNumber.match(/\d+$/);
  
  if (!numberMatch) {
    // If no number found, start from 001
    return `${prefix}001`;
  }

  const lastNum = parseInt(numberMatch[0], 10);
  const nextNum = lastNum + 1;

  // Format with zero-padding (3 digits)
  const paddedNumber = nextNum.toString().padStart(3, '0');
  
  return `${prefix}${paddedNumber}`;
}

