/**
 * Notification Manager
 * Handles SMS, Email, and in-app notifications for the Cumulative Score & Rank Analyzer
 */

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'sms' | 'email' | 'in_app';
  subject?: string;
  body: string;
  variables: string[];
  is_active: boolean;
}

export interface NotificationRecipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'parent' | 'student' | 'teacher' | 'admin';
  preferences: {
    sms_enabled: boolean;
    email_enabled: boolean;
    in_app_enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
}

export interface NotificationMessage {
  id: string;
  template_id: string;
  recipient_id: string;
  type: 'sms' | 'email' | 'in_app';
  subject?: string;
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  created_at: Date;
  sent_at?: Date;
  error_message?: string;
  variables: { [key: string]: string };
}

export interface NotificationTrigger {
  id: string;
  name: string;
  event_type: 'score_entered' | 'rankings_updated' | 'report_generated' | 'attendance_marked';
  conditions: { [key: string]: any };
  template_id: string;
  is_active: boolean;
}

export class NotificationManager {
  private templates: Map<string, NotificationTemplate> = new Map();
  private triggers: Map<string, NotificationTrigger> = new Map();
  private messageQueue: NotificationMessage[] = [];
  private isProcessing = false;

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeDefaultTriggers();
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'new_scores_available',
        name: 'New Scores Available',
        type: 'email',
        subject: 'New Academic Results Available - {{student_name}}',
        body: `Dear {{parent_name}},

New academic results are now available for {{student_name}} in {{class_name}}.

Term: {{term_name}}
Overall Grade: {{overall_grade}}
Class Position: {{class_position}}

You can view the complete report card by logging into your parent portal.

Best regards,
{{school_name}}`,
        variables: ['parent_name', 'student_name', 'class_name', 'term_name', 'overall_grade', 'class_position', 'school_name'],
        is_active: true
      },
      {
        id: 'rankings_updated',
        name: 'Rankings Updated',
        type: 'sms',
        body: `Hi {{parent_name}}, {{student_name}}'s class rankings have been updated. Current position: {{class_position}} out of {{total_students}}. View details: {{portal_link}`,
        variables: ['parent_name', 'student_name', 'class_position', 'total_students', 'portal_link'],
        is_active: true
      },
      {
        id: 'report_card_ready',
        name: 'Report Card Ready',
        type: 'email',
        subject: 'Report Card Available - {{student_name}}',
        body: `Dear {{parent_name}},

The report card for {{student_name}} ({{student_number}}) is now available.

Term: {{term_name}}
Class: {{class_name}}
Overall Performance: {{overall_grade}} ({{overall_percentage}}%)

Key Highlights:
- Class Position: {{class_position}}/{{total_students}}
- Attendance Rate: {{attendance_rate}}%
- Top Subject: {{top_subject}} ({{top_subject_grade}})

Please log in to view the complete report card and detailed performance analysis.

{{school_name}}
Academic Department`,
        variables: ['parent_name', 'student_name', 'student_number', 'term_name', 'class_name', 'overall_grade', 'overall_percentage', 'class_position', 'total_students', 'attendance_rate', 'top_subject', 'top_subject_grade', 'school_name'],
        is_active: true
      },
      {
        id: 'attendance_alert',
        name: 'Attendance Alert',
        type: 'sms',
        body: `Alert: {{student_name}} was marked absent today ({{date}}). Please contact the school if this is an error. {{school_contact}}`,
        variables: ['student_name', 'date', 'school_contact'],
        is_active: true
      },
      {
        id: 'performance_improvement',
        name: 'Performance Improvement',
        type: 'email',
        subject: 'Great Progress! - {{student_name}}',
        body: `Dear {{parent_name}},

We're pleased to inform you that {{student_name}} has shown significant improvement this term.

Previous Position: {{previous_position}}
Current Position: {{current_position}}
Improvement: {{improvement_rankings}} positions

This is excellent progress! Keep up the great work.

{{school_name}}
Academic Department`,
        variables: ['parent_name', 'student_name', 'previous_position', 'current_position', 'improvement_rankings', 'school_name'],
        is_active: true
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Initialize default notification triggers
   */
  private initializeDefaultTriggers(): void {
    const defaultTriggers: NotificationTrigger[] = [
      {
        id: 'scores_entered_trigger',
        name: 'Scores Entered Notification',
        event_type: 'score_entered',
        conditions: {
          min_students: 1,
          require_all_subjects: true
        },
        template_id: 'new_scores_available',
        is_active: true
      },
      {
        id: 'rankings_updated_trigger',
        name: 'Rankings Updated Notification',
        event_type: 'rankings_updated',
        conditions: {
          min_students: 1
        },
        template_id: 'rankings_updated',
        is_active: true
      },
      {
        id: 'report_generated_trigger',
        name: 'Report Card Generated',
        event_type: 'report_generated',
        conditions: {
          term_completed: true
        },
        template_id: 'report_card_ready',
        is_active: true
      }
    ];

    defaultTriggers.forEach(trigger => {
      this.triggers.set(trigger.id, trigger);
    });
  }

  /**
   * Send notification when scores are entered
   */
  async notifyScoresEntered(
    classId: string,
    termId: string,
    studentScores: Array<{
      student_id: string;
      student_name: string;
      parent_id?: string;
      parent_name?: string;
      class_name: string;
      term_name: string;
      overall_grade: string;
      class_position: number;
    }>
  ): Promise<void> {
    const trigger = this.triggers.get('scores_entered_trigger');
    if (!trigger || !trigger.is_active) return;

    for (const student of studentScores) {
      if (student.parent_id && student.parent_name) {
        await this.sendNotification({
          template_id: trigger.template_id,
          recipient_id: student.parent_id,
          type: 'email',
          variables: {
            parent_name: student.parent_name,
            student_name: student.student_name,
            class_name: student.class_name,
            term_name: student.term_name,
            overall_grade: student.overall_grade,
            class_position: student.class_position.toString(),
            school_name: 'Cumulative Score and Rank Analyzer School'
          }
        });
      }
    }
  }

  /**
   * Send notification when rankings are updated
   */
  async notifyRankingsUpdated(
    classId: string,
    rankings: Array<{
      student_id: string;
      student_name: string;
      parent_id?: string;
      parent_name?: string;
      class_position: number;
      total_students: number;
    }>
  ): Promise<void> {
    const trigger = this.triggers.get('rankings_updated_trigger');
    if (!trigger || !trigger.is_active) return;

    for (const student of rankings) {
      if (student.parent_id && student.parent_name) {
        await this.sendNotification({
          template_id: trigger.template_id,
          recipient_id: student.parent_id,
          type: 'sms',
          variables: {
            parent_name: student.parent_name,
            student_name: student.student_name,
            class_position: student.class_position.toString(),
            total_students: student.total_students.toString(),
            portal_link: `${window.location.origin}/parent-dashboard`
          }
        });
      }
    }
  }

  /**
   * Send notification when report card is generated
   */
  async notifyReportCardGenerated(
    studentId: string,
    reportData: {
      student_name: string;
      student_number: string;
      parent_id?: string;
      parent_name?: string;
      term_name: string;
      class_name: string;
      overall_grade: string;
      overall_percentage: number;
      class_position: number;
      total_students: number;
      attendance_rate: number;
      top_subject: string;
      top_subject_grade: string;
    }
  ): Promise<void> {
    const trigger = this.triggers.get('report_generated_trigger');
    if (!trigger || !trigger.is_active) return;

    if (reportData.parent_id && reportData.parent_name) {
      await this.sendNotification({
        template_id: trigger.template_id,
        recipient_id: reportData.parent_id,
        type: 'email',
        variables: {
          parent_name: reportData.parent_name,
          student_name: reportData.student_name,
          student_number: reportData.student_number,
          term_name: reportData.term_name,
          class_name: reportData.class_name,
          overall_grade: reportData.overall_grade,
          overall_percentage: reportData.overall_percentage.toString(),
          class_position: reportData.class_position.toString(),
          total_students: reportData.total_students.toString(),
          attendance_rate: reportData.attendance_rate.toString(),
          top_subject: reportData.top_subject,
          top_subject_grade: reportData.top_subject_grade,
          school_name: 'Cumulative Score and Rank Analyzer School'
        }
      });
    }
  }

  /**
   * Send notification for performance improvement
   */
  async notifyPerformanceImprovement(
    studentId: string,
    improvementData: {
      student_name: string;
      parent_id?: string;
      parent_name?: string;
      previous_position: number;
      current_position: number;
      improvement_rankings: number;
    }
  ): Promise<void> {
    if (improvementData.parent_id && improvementData.parent_name) {
      await this.sendNotification({
        template_id: 'performance_improvement',
        recipient_id: improvementData.parent_id,
        type: 'email',
        variables: {
          parent_name: improvementData.parent_name,
          student_name: improvementData.student_name,
          previous_position: improvementData.previous_position.toString(),
          current_position: improvementData.current_position.toString(),
          improvement_rankings: improvementData.improvement_rankings.toString(),
          school_name: 'Cumulative Score and Rank Analyzer School'
        }
      });
    }
  }

  /**
   * Send attendance alert
   */
  async notifyAttendanceAlert(
    studentId: string,
    attendanceData: {
      student_name: string;
      parent_id?: string;
      parent_name?: string;
      date: string;
      school_contact: string;
    }
  ): Promise<void> {
    if (attendanceData.parent_id && attendanceData.parent_name) {
      await this.sendNotification({
        template_id: 'attendance_alert',
        recipient_id: attendanceData.parent_id,
        type: 'sms',
        variables: {
          student_name: attendanceData.student_name,
          date: attendanceData.date,
          school_contact: attendanceData.school_contact
        }
      });
    }
  }

  /**
   * Send a notification using a template
   */
  private async sendNotification(message: Omit<NotificationMessage, 'id' | 'status' | 'created_at'>): Promise<void> {
    const template = this.templates.get(message.template_id);
    if (!template) {
      throw new Error(`Template ${message.template_id} not found`);
    }

    const notificationMessage: NotificationMessage = {
      ...message,
      id: this.generateId(),
      status: 'pending',
      created_at: new Date()
    };

    // Process the template with variables
    notificationMessage.body = this.processTemplate(template.body, message.variables);
    if (template.subject) {
      notificationMessage.subject = this.processTemplate(template.subject, message.variables);
    }

    // Add to queue
    this.messageQueue.push(notificationMessage);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processMessageQueue();
    }
  }

  /**
   * Process template with variables
   */
  private processTemplate(template: string, variables: { [key: string]: string }): string {
    let processedTemplate = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      processedTemplate = processedTemplate.replace(placeholder, value);
    }

    return processedTemplate;
  }

  /**
   * Process message queue
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) continue;

      try {
        await this.deliverMessage(message);
        message.status = 'sent';
        message.sent_at = new Date();
      } catch (error) {
        message.status = 'failed';
        message.error_message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to deliver notification:', error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Deliver a notification message
   */
  private async deliverMessage(message: NotificationMessage): Promise<void> {
    switch (message.type) {
      case 'email':
        await this.sendEmail(message);
        break;
      case 'sms':
        await this.sendSMS(message);
        break;
      case 'in_app':
        await this.sendInAppNotification(message);
        break;
      default:
        throw new Error(`Unsupported notification type: ${message.type}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(message: NotificationMessage): Promise<void> {
    // In a real implementation, you would integrate with an email service
    // like SendGrid, Mailgun, or AWS SES
    
    console.log('Sending email notification:', {
      to: message.recipient_id,
      subject: message.subject,
      body: message.body
    });

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(message: NotificationMessage): Promise<void> {
    // In a real implementation, you would integrate with an SMS service
    // like Twilio, AfricasTalking, or AWS SNS
    
    console.log('Sending SMS notification:', {
      to: message.recipient_id,
      body: message.body
    });

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(message: NotificationMessage): Promise<void> {
    // Show browser notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification(message.subject || 'Cumulative Score and Rank Analyzer Notification', {
        body: message.body,
        icon: '/favicon.ico'
      });
    }

    // Store in local storage for in-app display
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifications.push({
      id: message.id,
      title: message.subject || 'Notification',
      body: message.body,
      timestamp: message.created_at,
      read: false
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }

  /**
   * Get notification templates
   */
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add or update a notification template
   */
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get notification triggers
   */
  getTriggers(): NotificationTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Add or update a notification trigger
   */
  addTrigger(trigger: NotificationTrigger): void {
    this.triggers.set(trigger.id, trigger);
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(): NotificationMessage[] {
    return this.messageQueue.filter(message => message.status === 'pending');
  }

  /**
   * Get notification history
   */
  getNotificationHistory(): NotificationMessage[] {
    return this.messageQueue.filter(message => message.status !== 'pending');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

// Utility functions
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if ('Notification' in window) {
    return await Notification.requestPermission();
  }
  return 'denied';
};

export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
};

export const getInAppNotifications = (): Array<{
  id: string;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
}> => {
  return JSON.parse(localStorage.getItem('notifications') || '[]');
};

export const markNotificationAsRead = (notificationId: string): void => {
  const notifications = getInAppNotifications();
  const updatedNotifications = notifications.map(notification =>
    notification.id === notificationId
      ? { ...notification, read: true }
      : notification
  );
  localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
};
