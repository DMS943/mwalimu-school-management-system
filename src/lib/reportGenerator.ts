/**
 * Report Generator for Cumulative Score & Rank Analyzer
 * Handles automated report generation, templates, and PDF creation
 */

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'individual' | 'class' | 'school' | 'subject';
  template_data: {
    header: {
      school_name: string;
      school_logo?: string;
      report_title: string;
      academic_year: string;
      term: string;
    };
    sections: ReportSection[];
    footer: {
      generated_date: string;
      generated_by: string;
      disclaimer?: string;
    };
  };
  is_active: boolean;
  created_by: string;
  created_at: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'student_info' | 'academic_performance' | 'rankings' | 'attendance' | 'comments' | 'charts';
  data_fields: string[];
  display_options: {
    show_rankings: boolean;
    show_percentages: boolean;
    show_grades: boolean;
    show_improvements: boolean;
    show_charts: boolean;
  };
}

export interface StudentReportData {
  student: {
    id: string;
    name: string;
    student_number: string;
    class_name: string;
    grade_level: number;
    date_of_birth: string;
    guardian_name?: string;
    guardian_phone?: string;
  };
  academic_performance: {
    term_name: string;
    overall_grade: string;
    overall_percentage: number;
    class_position: number;
    total_students: number;
    subject_scores: Array<{
      subject_name: string;
      subject_code: string;
      marks: number;
      grade: string;
      percentage: number;
      class_average: number;
      subject_position: number;
    }>;
    previous_term_comparison?: {
      previous_grade: string;
      previous_percentage: number;
      previous_position: number;
      improvement: number;
    };
  };
  attendance: {
    total_days: number;
    present_days: number;
    absent_days: number;
    attendance_rate: number;
  };
  rankings: {
    class_rank: number;
    grade_rank: number;
    school_rank?: number;
    rank_change: 'up' | 'down' | 'same' | 'new';
    rank_change_positions: number;
  };
  comments: {
    teacher_comments: string;
    principal_comments?: string;
    recommendations: string[];
  };
  charts?: {
    performance_trend: string; // Base64 encoded chart
    subject_comparison: string;
    class_comparison: string;
  };
}

export interface ClassReportData {
  class_info: {
    class_name: string;
    grade_level: number;
    class_teacher: string;
    total_students: number;
    term_name: string;
  };
  class_statistics: {
    class_average: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
    grade_distribution: { [grade: string]: number };
  };
  student_rankings: Array<{
    rank: number;
    student_name: string;
    student_number: string;
    total_marks: number;
    average_percentage: number;
    grade: string;
    rank_change: 'up' | 'down' | 'same' | 'new';
  }>;
  subject_statistics: Array<{
    subject_name: string;
    subject_code: string;
    class_average: number;
    highest_score: number;
    lowest_score: number;
    pass_rate: number;
  }>;
  top_performers: Array<{
    rank: number;
    student_name: string;
    average_percentage: number;
    grade: string;
  }>;
  improvement_analysis: Array<{
    student_name: string;
    previous_position: number;
    current_position: number;
    improvement: number;
  }>;
}

export class ReportGenerator {
  private templates: Map<string, ReportTemplate> = new Map();
  private defaultTemplates: ReportTemplate[] = [];

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default report templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'individual_report_card',
        name: 'Individual Report Card',
        type: 'individual',
        template_data: {
          header: {
            school_name: '{{school_name}}',
            school_logo: '{{school_logo}}',
            report_title: 'ACADEMIC REPORT CARD',
            academic_year: '{{academic_year}}',
            term: '{{term_name}}'
          },
          sections: [
            {
              id: 'student_info',
              title: 'Student Information',
              type: 'student_info',
              data_fields: ['name', 'student_number', 'class_name', 'date_of_birth'],
              display_options: {
                show_rankings: false,
                show_percentages: false,
                show_grades: false,
                show_improvements: false,
                show_charts: false
              }
            },
            {
              id: 'academic_performance',
              title: 'Academic Performance',
              type: 'academic_performance',
              data_fields: ['subject_scores', 'overall_grade', 'overall_percentage', 'class_position'],
              display_options: {
                show_rankings: true,
                show_percentages: true,
                show_grades: true,
                show_improvements: true,
                show_charts: true
              }
            },
            {
              id: 'attendance',
              title: 'Attendance Record',
              type: 'attendance',
              data_fields: ['attendance_rate', 'present_days', 'absent_days'],
              display_options: {
                show_rankings: false,
                show_percentages: true,
                show_grades: false,
                show_improvements: false,
                show_charts: false
              }
            },
            {
              id: 'comments',
              title: 'Comments and Recommendations',
              type: 'comments',
              data_fields: ['teacher_comments', 'principal_comments', 'recommendations'],
              display_options: {
                show_rankings: false,
                show_percentages: false,
                show_grades: false,
                show_improvements: false,
                show_charts: false
              }
            }
          ],
          footer: {
            generated_date: '{{generated_date}}',
            generated_by: '{{generated_by}}',
            disclaimer: 'This report is generated automatically by the Cumulative Score and Rank Analyzer system.'
          }
        },
        is_active: true,
        created_by: 'system',
        created_at: new Date()
      },
      {
        id: 'class_performance_report',
        name: 'Class Performance Report',
        type: 'class',
        template_data: {
          header: {
            school_name: '{{school_name}}',
            report_title: 'CLASS PERFORMANCE REPORT',
            academic_year: '{{academic_year}}',
            term: '{{term_name}}'
          },
          sections: [
            {
              id: 'class_statistics',
              title: 'Class Statistics',
              type: 'academic_performance',
              data_fields: ['class_average', 'pass_rate', 'grade_distribution'],
              display_options: {
                show_rankings: false,
                show_percentages: true,
                show_grades: true,
                show_improvements: false,
                show_charts: true
              }
            },
            {
              id: 'student_rankings',
              title: 'Student Rankings',
              type: 'rankings',
              data_fields: ['rankings', 'rank_changes'],
              display_options: {
                show_rankings: true,
                show_percentages: true,
                show_grades: true,
                show_improvements: true,
                show_charts: false
              }
            }
          ],
          footer: {
            generated_date: '{{generated_date}}',
            generated_by: '{{generated_by}}'
          }
        },
        is_active: true,
        created_by: 'system',
        created_at: new Date()
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
      this.defaultTemplates.push(template);
    });
  }

  /**
   * Generate individual student report
   */
  async generateStudentReport(
    studentId: string,
    termId: string,
    templateId: string = 'individual_report_card'
  ): Promise<StudentReportData> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // In a real implementation, you would fetch data from the database
    // For now, we'll return mock data
    const reportData: StudentReportData = {
      student: {
        id: studentId,
        name: 'John Doe',
        student_number: 'ST001',
        class_name: 'Grade 10A',
        grade_level: 10,
        date_of_birth: '2008-05-15',
        guardian_name: 'Jane Doe',
        guardian_phone: '+260 97 123 4567'
      },
      academic_performance: {
        term_name: 'Term 1 2024',
        overall_grade: 'A',
        overall_percentage: 85.5,
        class_position: 3,
        total_students: 35,
        subject_scores: [
          {
            subject_name: 'Mathematics',
            subject_code: 'MATH',
            marks: 88,
            grade: 'A',
            percentage: 88,
            class_average: 75.2,
            subject_position: 2
          },
          {
            subject_name: 'English',
            subject_code: 'ENG',
            marks: 82,
            grade: 'A',
            percentage: 82,
            class_average: 78.5,
            subject_position: 5
          },
          {
            subject_name: 'Science',
            subject_code: 'SCI',
            marks: 90,
            grade: 'A',
            percentage: 90,
            class_average: 72.8,
            subject_position: 1
          }
        ],
        previous_term_comparison: {
          previous_grade: 'B',
          previous_percentage: 78.5,
          previous_position: 8,
          improvement: 5
        }
      },
      attendance: {
        total_days: 90,
        present_days: 87,
        absent_days: 3,
        attendance_rate: 96.7
      },
      rankings: {
        class_rank: 3,
        grade_rank: 12,
        school_rank: 45,
        rank_change: 'up',
        rank_change_positions: 5
      },
      comments: {
        teacher_comments: 'Excellent performance this term. Shows great improvement in all subjects.',
        principal_comments: 'Outstanding academic achievement. Keep up the excellent work.',
        recommendations: [
          'Continue current study habits',
          'Consider advanced placement in Mathematics',
          'Maintain consistent attendance'
        ]
      }
    };

    return reportData;
  }

  /**
   * Generate class performance report
   */
  async generateClassReport(
    classId: string,
    termId: string,
    templateId: string = 'class_performance_report'
  ): Promise<ClassReportData> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Mock class report data
    const reportData: ClassReportData = {
      class_info: {
        class_name: 'Grade 10A',
        grade_level: 10,
        class_teacher: 'Mrs. Smith',
        total_students: 35,
        term_name: 'Term 1 2024'
      },
      class_statistics: {
        class_average: 76.8,
        highest_score: 95.5,
        lowest_score: 45.2,
        pass_rate: 88.6,
        grade_distribution: {
          A: 8,
          B: 12,
          C: 10,
          D: 4,
          F: 1
        }
      },
      student_rankings: [
        {
          rank: 1,
          student_name: 'Alice Johnson',
          student_number: 'ST002',
          total_marks: 95.5,
          average_percentage: 95.5,
          grade: 'A',
          rank_change: 'same'
        },
        {
          rank: 2,
          student_name: 'Bob Wilson',
          student_number: 'ST003',
          total_marks: 92.3,
          average_percentage: 92.3,
          grade: 'A',
          rank_change: 'up'
        },
        {
          rank: 3,
          student_name: 'John Doe',
          student_number: 'ST001',
          total_marks: 85.5,
          average_percentage: 85.5,
          grade: 'A',
          rank_change: 'up'
        }
      ],
      subject_statistics: [
        {
          subject_name: 'Mathematics',
          subject_code: 'MATH',
          class_average: 75.2,
          highest_score: 95,
          lowest_score: 45,
          pass_rate: 85.7
        },
        {
          subject_name: 'English',
          subject_code: 'ENG',
          class_average: 78.5,
          highest_score: 92,
          lowest_score: 50,
          pass_rate: 91.4
        }
      ],
      top_performers: [
        {
          rank: 1,
          student_name: 'Alice Johnson',
          average_percentage: 95.5,
          grade: 'A'
        },
        {
          rank: 2,
          student_name: 'Bob Wilson',
          average_percentage: 92.3,
          grade: 'A'
        }
      ],
      improvement_analysis: [
        {
          student_name: 'John Doe',
          previous_position: 8,
          current_position: 3,
          improvement: 5
        }
      ]
    };

    return reportData;
  }

  /**
   * Generate PDF report
   */
  async generatePDFReport(
    reportData: StudentReportData | ClassReportData,
    templateId: string
  ): Promise<Blob> {
    // In a real implementation, you would use a PDF generation library
    // like jsPDF, Puppeteer, or a server-side solution
    
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // For now, we'll create a simple HTML representation
    const htmlContent = this.generateHTMLReport(reportData, template);
    
    // Convert HTML to PDF (this would be done by a proper PDF library)
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return blob;
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(
    reportData: StudentReportData | ClassReportData,
    template: ReportTemplate
  ): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${template.template_data.header.report_title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section h3 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${template.template_data.header.school_name}</h1>
          <h2>${template.template_data.header.report_title}</h2>
          <p>Academic Year: ${template.template_data.header.academic_year} | Term: ${template.template_data.header.term}</p>
        </div>
    `;

    // Generate sections based on template
    for (const section of template.template_data.sections) {
      html += this.generateSectionHTML(section, reportData);
    }

    html += `
        <div class="footer">
          <p>Generated on: ${template.template_data.footer.generated_date}</p>
          <p>Generated by: ${template.template_data.footer.generated_by}</p>
          ${template.template_data.footer.disclaimer ? `<p>${template.template_data.footer.disclaimer}</p>` : ''}
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Generate HTML for a specific section
   */
  private generateSectionHTML(section: ReportSection, reportData: StudentReportData | ClassReportData): string {
    let html = `<div class="section"><h3>${section.title}</h3>`;

    switch (section.type) {
      case 'student_info':
        if ('student' in reportData) {
          html += `
            <table>
              <tr><th>Name</th><td>${reportData.student.name}</td></tr>
              <tr><th>Student Number</th><td>${reportData.student.student_number}</td></tr>
              <tr><th>Class</th><td>${reportData.student.class_name}</td></tr>
              <tr><th>Date of Birth</th><td>${reportData.student.date_of_birth}</td></tr>
            </table>
          `;
        }
        break;

      case 'academic_performance':
        if ('academic_performance' in reportData) {
          html += `
            <table>
              <tr><th>Overall Grade</th><td>${reportData.academic_performance.overall_grade}</td></tr>
              <tr><th>Overall Percentage</th><td>${reportData.academic_performance.overall_percentage}%</td></tr>
              <tr><th>Class Position</th><td>${reportData.academic_performance.class_position} of ${reportData.academic_performance.total_students}</td></tr>
            </table>
            <h4>Subject Scores</h4>
            <table>
              <tr><th>Subject</th><th>Marks</th><th>Grade</th><th>Percentage</th><th>Class Average</th></tr>
              ${reportData.academic_performance.subject_scores.map(score => `
                <tr>
                  <td>${score.subject_name}</td>
                  <td>${score.marks}</td>
                  <td>${score.grade}</td>
                  <td>${score.percentage}%</td>
                  <td>${score.class_average}%</td>
                </tr>
              `).join('')}
            </table>
          `;
        }
        break;

      case 'rankings':
        if ('student_rankings' in reportData) {
          html += `
            <table>
              <tr><th>Rank</th><th>Student Name</th><th>Student Number</th><th>Total Marks</th><th>Average</th><th>Grade</th></tr>
              ${reportData.student_rankings.map(ranking => `
                <tr>
                  <td>${ranking.rank}</td>
                  <td>${ranking.student_name}</td>
                  <td>${ranking.student_number}</td>
                  <td>${ranking.total_marks}</td>
                  <td>${ranking.average_percentage}%</td>
                  <td>${ranking.grade}</td>
                </tr>
              `).join('')}
            </table>
          `;
        }
        break;

      case 'attendance':
        if ('attendance' in reportData) {
          html += `
            <table>
              <tr><th>Total Days</th><td>${reportData.attendance.total_days}</td></tr>
              <tr><th>Present Days</th><td>${reportData.attendance.present_days}</td></tr>
              <tr><th>Absent Days</th><td>${reportData.attendance.absent_days}</td></tr>
              <tr><th>Attendance Rate</th><td>${reportData.attendance.attendance_rate}%</td></tr>
            </table>
          `;
        }
        break;

      case 'comments':
        if ('comments' in reportData) {
          html += `
            <h4>Teacher Comments</h4>
            <p>${reportData.comments.teacher_comments}</p>
            ${reportData.comments.principal_comments ? `
              <h4>Principal Comments</h4>
              <p>${reportData.comments.principal_comments}</p>
            ` : ''}
            <h4>Recommendations</h4>
            <ul>
              ${reportData.comments.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          `;
        }
        break;
    }

    html += '</div>';
    return html;
  }

  /**
   * Get available templates
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add or update a template
   */
  addTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Export report data to Excel
   */
  async exportToExcel(reportData: StudentReportData | ClassReportData): Promise<Blob> {
    // In a real implementation, you would use a library like SheetJS
    // to create Excel files
    
    const csvContent = this.convertToCSV(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    return blob;
  }

  /**
   * Convert report data to CSV
   */
  private convertToCSV(reportData: StudentReportData | ClassReportData): string {
    let csv = '';

    if ('student' in reportData) {
      // Student report CSV
      csv += 'Student Information\n';
      csv += 'Name,Student Number,Class,Overall Grade,Overall Percentage,Class Position\n';
      csv += `${reportData.student.name},${reportData.student.student_number},${reportData.student.class_name},${reportData.academic_performance.overall_grade},${reportData.academic_performance.overall_percentage},${reportData.academic_performance.class_position}\n\n`;
      
      csv += 'Subject Scores\n';
      csv += 'Subject,Code,Marks,Grade,Percentage,Class Average\n';
      reportData.academic_performance.subject_scores.forEach(score => {
        csv += `${score.subject_name},${score.subject_code},${score.marks},${score.grade},${score.percentage},${score.class_average}\n`;
      });
    } else {
      // Class report CSV
      csv += 'Class Information\n';
      csv += 'Class Name,Grade Level,Class Teacher,Total Students,Term\n';
      csv += `${reportData.class_info.class_name},${reportData.class_info.grade_level},${reportData.class_info.class_teacher},${reportData.class_info.total_students},${reportData.class_info.term_name}\n\n`;
      
      csv += 'Student Rankings\n';
      csv += 'Rank,Student Name,Student Number,Total Marks,Average,Grade\n';
      reportData.student_rankings.forEach(ranking => {
        csv += `${ranking.rank},${ranking.student_name},${ranking.student_number},${ranking.total_marks},${ranking.average_percentage},${ranking.grade}\n`;
      });
    }

    return csv;
  }
}

// Singleton instance
export const reportGenerator = new ReportGenerator();
