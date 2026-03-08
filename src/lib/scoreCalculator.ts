/**
 * Cumulative Score & Rank Calculator
 * Handles automated score calculations, rankings, and grade assignments
 */

export interface StudentScore {
  student_id: string;
  student_name: string;
  student_number: string;
  subject_scores: { [subject_id: string]: number };
  total_marks: number;
  average_percentage: number;
  grade: string;
  rank: number;
  previous_rank?: number;
  rank_change?: 'up' | 'down' | 'same' | 'new';
}

export interface GradingSystem {
  type: 'percentage' | 'weighted' | 'gpa';
  scale: { [grade: string]: number };
  pass_mark: number;
  max_marks: number;
}

export interface SubjectWeight {
  subject_id: string;
  weight: number;
  is_core: boolean;
}

export interface TermWeight {
  term_id: string;
  weight: number;
}

export class ScoreCalculator {
  private gradingSystem: GradingSystem;
  private subjectWeights: SubjectWeight[];
  private termWeights: TermWeight[];

  constructor(
    gradingSystem: GradingSystem,
    subjectWeights: SubjectWeight[] = [],
    termWeights: TermWeight[] = []
  ) {
    this.gradingSystem = gradingSystem;
    this.subjectWeights = subjectWeights;
    this.termWeights = termWeights;
  }

  /**
   * Calculate cumulative score for a student
   */
  calculateCumulativeScore(
    studentMarks: { [subject_id: string]: number },
    termMarks?: { [term_id: string]: { [subject_id: string]: number } }
  ): {
    total_marks: number;
    average_percentage: number;
    grade: string;
    weighted_average?: number;
  } {
    let totalMarks = 0;
    let totalWeight = 0;
    let weightedTotal = 0;

    // Calculate subject-weighted scores
    for (const [subjectId, marks] of Object.entries(studentMarks)) {
      const subjectWeight = this.getSubjectWeight(subjectId);
      const weight = subjectWeight?.weight || 1;
      
      totalMarks += marks;
      totalWeight += weight;
      weightedTotal += marks * weight;
    }

    const averagePercentage = totalWeight > 0 ? (weightedTotal / totalWeight) : 0;
    const grade = this.calculateGrade(averagePercentage);

    return {
      total_marks: totalMarks,
      average_percentage: Math.round(averagePercentage * 100) / 100,
      grade,
      weighted_average: totalWeight > 0 ? Math.round((weightedTotal / totalWeight) * 100) / 100 : 0
    };
  }

  /**
   * Generate rankings for a list of students
   */
  generateRankings(
    students: Array<{
      student_id: string;
      student_name: string;
      student_number: string;
      subject_scores: { [subject_id: string]: number };
    }>,
    previousRankings?: StudentScore[]
  ): StudentScore[] {
    // Calculate scores for all students
    const studentScores = students.map(student => {
      const scoreData = this.calculateCumulativeScore(student.subject_scores);
      return {
        student_id: student.student_id,
        student_name: student.student_name,
        student_number: student.student_number,
        subject_scores: student.subject_scores,
        ...scoreData
      };
    });

    // Sort by average percentage (descending)
    studentScores.sort((a, b) => b.average_percentage - a.average_percentage);

    // Assign ranks with tie-breaking logic
    const rankings: StudentScore[] = [];
    let currentRank = 1;

    for (let i = 0; i < studentScores.length; i++) {
      const student = studentScores[i];
      
      // Handle ties
      if (i > 0 && student.average_percentage === studentScores[i - 1].average_percentage) {
        // Same rank as previous student
        student.rank = rankings[rankings.length - 1].rank;
      } else {
        student.rank = currentRank;
      }

      // Calculate rank change
      if (previousRankings) {
        const previousRanking = previousRankings.find(p => p.student_id === student.student_id);
        if (previousRanking) {
          student.previous_rank = previousRanking.rank;
          if (student.rank < previousRanking.rank) {
            student.rank_change = 'up';
          } else if (student.rank > previousRanking.rank) {
            student.rank_change = 'down';
          } else {
            student.rank_change = 'same';
          }
        } else {
          student.rank_change = 'new';
        }
      }

      rankings.push(student);
      currentRank = i + 2; // Next rank
    }

    return rankings;
  }

  /**
   * Calculate grade based on percentage
   */
  private calculateGrade(percentage: number): string {
    const scale = this.gradingSystem.scale;
    const sortedGrades = Object.entries(scale)
      .sort(([, a], [, b]) => b - a);

    for (const [grade, threshold] of sortedGrades) {
      if (percentage >= threshold) {
        return grade;
      }
    }

    return 'F'; // Default fail grade
  }

  /**
   * Get subject weight
   */
  private getSubjectWeight(subjectId: string): SubjectWeight | undefined {
    return this.subjectWeights.find(sw => sw.subject_id === subjectId);
  }

  /**
   * Calculate class statistics
   */
  calculateClassStatistics(rankings: StudentScore[]): {
    class_average: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
    grade_distribution: { [grade: string]: number };
  } {
    if (rankings.length === 0) {
      return {
        class_average: 0,
        highest_score: 0,
        lowest_score: 0,
        pass_rate: 0,
        grade_distribution: {}
      };
    }

    const scores = rankings.map(r => r.average_percentage);
    const classAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    
    const passingStudents = rankings.filter(r => r.average_percentage >= this.gradingSystem.pass_mark).length;
    const passRate = (passingStudents / rankings.length) * 100;

    // Grade distribution
    const gradeDistribution: { [grade: string]: number } = {};
    rankings.forEach(ranking => {
      gradeDistribution[ranking.grade] = (gradeDistribution[ranking.grade] || 0) + 1;
    });

    return {
      class_average: Math.round(classAverage * 100) / 100,
      highest_score: Math.round(highestScore * 100) / 100,
      lowest_score: Math.round(lowestScore * 100) / 100,
      pass_rate: Math.round(passRate * 100) / 100,
      grade_distribution: gradeDistribution
    };
  }

  /**
   * Calculate subject-wise statistics
   */
  calculateSubjectStatistics(
    subjectId: string,
    allStudentScores: Array<{ student_id: string; subject_scores: { [subject_id: string]: number } }>
  ): {
    subject_average: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
  } {
    const subjectScores = allStudentScores
      .map(student => student.subject_scores[subjectId])
      .filter(score => score !== undefined);

    if (subjectScores.length === 0) {
      return {
        subject_average: 0,
        highest_score: 0,
        lowest_score: 0,
        pass_rate: 0
      };
    }

    const average = subjectScores.reduce((sum, score) => sum + score, 0) / subjectScores.length;
    const highest = Math.max(...subjectScores);
    const lowest = Math.min(...subjectScores);
    const passingScores = subjectScores.filter(score => score >= this.gradingSystem.pass_mark);
    const passRate = (passingScores.length / subjectScores.length) * 100;

    return {
      subject_average: Math.round(average * 100) / 100,
      highest_score: Math.round(highest * 100) / 100,
      lowest_score: Math.round(lowest * 100) / 100,
      pass_rate: Math.round(passRate * 100) / 100
    };
  }

  /**
   * Validate score input
   */
  validateScore(score: number, maxMarks: number = 100): {
    isValid: boolean;
    error?: string;
  } {
    if (score < 0) {
      return { isValid: false, error: 'Score cannot be negative' };
    }
    
    if (score > maxMarks) {
      return { isValid: false, error: `Score cannot exceed ${maxMarks}` };
    }

    if (isNaN(score)) {
      return { isValid: false, error: 'Score must be a valid number' };
    }

    return { isValid: true };
  }

  /**
   * Calculate term-wise cumulative scores
   */
  calculateTermCumulative(
    termScores: { [term_id: string]: { [subject_id: string]: number } }
  ): {
    [term_id: string]: {
      total_marks: number;
      average_percentage: number;
      grade: string;
    }
  } {
    const result: any = {};

    for (const [termId, subjectScores] of Object.entries(termScores)) {
      const termWeight = this.termWeights.find(tw => tw.term_id === termId);
      const scoreData = this.calculateCumulativeScore(subjectScores);
      
      result[termId] = {
        ...scoreData,
        weight: termWeight?.weight || 1
      };
    }

    return result;
  }

  /**
   * Update grading system
   */
  updateGradingSystem(newSystem: GradingSystem): void {
    this.gradingSystem = newSystem;
  }

  /**
   * Update subject weights
   */
  updateSubjectWeights(newWeights: SubjectWeight[]): void {
    this.subjectWeights = newWeights;
  }

  /**
   * Update term weights
   */
  updateTermWeights(newWeights: TermWeight[]): void {
    this.termWeights = newWeights;
  }
}

// Default grading systems
export const DEFAULT_GRADING_SYSTEMS = {
  percentage: {
    type: 'percentage' as const,
    scale: { A: 80, B: 70, C: 60, D: 50, F: 0 },
    pass_mark: 50,
    max_marks: 100
  },
  weighted: {
    type: 'weighted' as const,
    scale: { A: 85, B: 75, C: 65, D: 55, F: 0 },
    pass_mark: 55,
    max_marks: 100
  },
  gpa: {
    type: 'gpa' as const,
    scale: { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 },
    pass_mark: 2.0,
    max_marks: 4.0
  }
};

// Utility functions
export const formatPercentage = (value: number): string => {
  return `${Math.round(value * 100) / 100}%`;
};

export const formatGrade = (grade: string, system: GradingSystem): string => {
  if (system.type === 'gpa') {
    return `${grade} (${system.scale[grade]})`;
  }
  return grade;
};

export const getGradeColor = (grade: string): string => {
  const gradeColors: { [key: string]: string } = {
    A: 'text-green-600',
    B: 'text-blue-600',
    C: 'text-yellow-600',
    D: 'text-orange-600',
    F: 'text-red-600'
  };
  return gradeColors[grade] || 'text-gray-600';
};

export const getRankIcon = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};
