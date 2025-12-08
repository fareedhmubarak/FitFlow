/**
 * Audit Logger for Business Events
 * 
 * This logger captures all business-level actions for:
 * 1. Admin dashboard tracking (per-gym activity monitoring)
 * 2. Debugging when gyms report issues
 * 3. Compliance and analytics
 * 
 * Categories tracked:
 * - MEMBER: create, update, delete, status_change, rejoin
 * - PAYMENT: create, update, delete, refund
 * - PLAN: create, update, delete, assign
 * - CHECK_IN: check_in, check_out
 * - LEAD: create, update, convert, delete
 * - SETTINGS: update
 * - STAFF: create, update, delete
 * - CLASS: create, update, delete, schedule
 * - REPORT: export, generate
 * - AUTH: login, logout, password_change
 */

import { supabaseRaw, getCurrentGymId } from './supabase';

export type AuditCategory = 
  | 'MEMBER' 
  | 'PAYMENT' 
  | 'PLAN' 
  | 'CHECK_IN' 
  | 'LEAD' 
  | 'SETTINGS' 
  | 'STAFF' 
  | 'CLASS' 
  | 'REPORT' 
  | 'AUTH'
  | 'RECEIPT'
  | 'NOTIFICATION'
  | 'SYSTEM';

export type AuditAction = 
  // Member actions
  | 'member_created'
  | 'member_updated'
  | 'member_deleted'
  | 'member_status_changed'
  | 'member_rejoined'
  | 'member_photo_uploaded'
  | 'member_progress_recorded'
  // Payment actions
  | 'payment_created'
  | 'payment_updated'
  | 'payment_deleted'
  | 'payment_refunded'
  // Plan actions
  | 'plan_created'
  | 'plan_updated'
  | 'plan_deleted'
  | 'plan_assigned'
  // Check-in actions
  | 'check_in'
  | 'check_out'
  // Lead actions
  | 'lead_created'
  | 'lead_updated'
  | 'lead_converted'
  | 'lead_deleted'
  | 'lead_follow_up'
  // Settings actions
  | 'settings_updated'
  | 'gym_profile_updated'
  // Staff actions
  | 'staff_created'
  | 'staff_updated'
  | 'staff_deleted'
  | 'staff_role_changed'
  // Class actions
  | 'class_created'
  | 'class_updated'
  | 'class_deleted'
  | 'class_scheduled'
  | 'class_cancelled'
  | 'class_attendance_marked'
  // Report actions
  | 'report_exported'
  | 'report_generated'
  | 'data_exported'
  // Auth actions
  | 'user_login'
  | 'user_logout'
  | 'password_changed'
  // Receipt actions
  | 'receipt_generated'
  | 'receipt_shared'
  // Notification actions
  | 'notification_sent'
  | 'reminder_sent'
  | 'whatsapp_shared'
  // System actions
  | 'error_occurred'
  | 'api_failure';

export interface AuditLogEntry {
  category: AuditCategory;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  resourceName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  duration?: number;
}

interface AuditQueueItem extends AuditLogEntry {
  gym_id: string | null;
  timestamp: string;
  user_agent: string;
  page_path: string;
}

class AuditLogger {
  private static instance: AuditLogger;
  private queue: AuditQueueItem[] = [];
  private isProcessing = false;
  private flushInterval: NodeJS.Timeout | null = null;
  private enabled = true; // Enable for both dev and production

  private constructor() {
    this.startFlushInterval();
    this.setupUnloadHandler();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private startFlushInterval() {
    // Flush every 3 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 3000);
  }

  private setupUnloadHandler() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Log a business action
   * NOTE: Disabled in dev to improve performance - enable for production
   */
  async log(entry: AuditLogEntry): Promise<void> {
    // Skip audit logging in development for performance
    if (!this.enabled || import.meta.env.DEV) return;

    try {
      const gymId = await getCurrentGymId();
      
      const queueItem: AuditQueueItem = {
        ...entry,
        gym_id: gymId,
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        page_path: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      };

      this.queue.push(queueItem);

      // Immediate flush for errors
      if (!entry.success) {
        await this.flush();
      }
    } catch (error) {
      console.error('[AuditLogger] Failed to queue log:', error);
    }
  }

  /**
   * Flush queue to database
   */
  private async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const items = [...this.queue];
    this.queue = [];

    try {
      // Transform to database format
      const records = items.map(item => ({
        gym_id: item.gym_id,
        event_type: 'business_action',
        event_category: item.category.toLowerCase(),
        action: item.action,
        resource_type: item.resourceType,
        resource_id: item.resourceId || null,
        old_values: item.oldValues ? this.sanitize(item.oldValues) : null,
        new_values: item.newValues ? this.sanitize(item.newValues) : null,
        metadata: {
          ...this.sanitize(item.metadata || {}),
          resource_name: item.resourceName,
        },
        success: item.success,
        error_message: item.errorMessage || null,
        duration_ms: item.duration || null,
        user_agent: item.user_agent,
        page_path: item.page_path,
        timestamp: item.timestamp,
      }));

      const { error } = await supabaseRaw.from('gym_audit_logs').insert(records);
      
      if (error) {
        console.error('[AuditLogger] Failed to insert logs:', error);
        // Re-queue failed items (but limit to prevent infinite loop)
        if (items.length < 100) {
          this.queue.push(...items);
        }
      }
    } catch (error) {
      console.error('[AuditLogger] Flush error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sanitize data to remove sensitive fields
   */
  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'credit_card', 'ssn', 'pin'];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // ===== MEMBER ACTIONS =====

  logMemberCreated(memberId: string, memberName: string, memberData: Record<string, unknown>) {
    return this.log({
      category: 'MEMBER',
      action: 'member_created',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      newValues: memberData,
      success: true,
      metadata: {
        plan: memberData.membership_plan,
        amount: memberData.plan_amount,
      },
    });
  }

  logMemberUpdated(memberId: string, memberName: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) {
    return this.log({
      category: 'MEMBER',
      action: 'member_updated',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      oldValues: oldData,
      newValues: newData,
      success: true,
    });
  }

  logMemberDeleted(memberId: string, memberName: string) {
    return this.log({
      category: 'MEMBER',
      action: 'member_deleted',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      success: true,
    });
  }

  logMemberStatusChanged(memberId: string, memberName: string, oldStatus: string, newStatus: string) {
    return this.log({
      category: 'MEMBER',
      action: 'member_status_changed',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      success: true,
    });
  }

  logMemberRejoined(memberId: string, memberName: string, planName: string, amount: number) {
    return this.log({
      category: 'MEMBER',
      action: 'member_rejoined',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      newValues: { plan: planName, amount },
      success: true,
      metadata: { plan: planName, amount },
    });
  }

  logMemberPhotoUploaded(memberId: string, memberName: string, photoType: string) {
    return this.log({
      category: 'MEMBER',
      action: 'member_photo_uploaded',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      success: true,
      metadata: { photoType },
    });
  }

  logMemberProgressRecorded(memberId: string, memberName: string, progressData: Record<string, unknown>) {
    return this.log({
      category: 'MEMBER',
      action: 'member_progress_recorded',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      newValues: progressData,
      success: true,
    });
  }

  // ===== PAYMENT ACTIONS =====

  logPaymentCreated(paymentId: string, memberId: string, memberName: string, amount: number, method: string) {
    return this.log({
      category: 'PAYMENT',
      action: 'payment_created',
      resourceType: 'payment',
      resourceId: paymentId,
      resourceName: memberName,
      newValues: { amount, method, member_id: memberId },
      success: true,
      metadata: { amount, method, member_name: memberName },
    });
  }

  logPaymentDeleted(paymentId: string, memberId: string, memberName: string, amount: number) {
    return this.log({
      category: 'PAYMENT',
      action: 'payment_deleted',
      resourceType: 'payment',
      resourceId: paymentId,
      resourceName: memberName,
      oldValues: { amount, member_id: memberId },
      success: true,
      metadata: { amount, member_name: memberName },
    });
  }

  // ===== PLAN ACTIONS =====

  logPlanCreated(planId: string, planName: string, planData: Record<string, unknown>) {
    return this.log({
      category: 'PLAN',
      action: 'plan_created',
      resourceType: 'plan',
      resourceId: planId,
      resourceName: planName,
      newValues: planData,
      success: true,
    });
  }

  logPlanUpdated(planId: string, planName: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) {
    return this.log({
      category: 'PLAN',
      action: 'plan_updated',
      resourceType: 'plan',
      resourceId: planId,
      resourceName: planName,
      oldValues: oldData,
      newValues: newData,
      success: true,
    });
  }

  logPlanDeleted(planId: string, planName: string) {
    return this.log({
      category: 'PLAN',
      action: 'plan_deleted',
      resourceType: 'plan',
      resourceId: planId,
      resourceName: planName,
      success: true,
    });
  }

  // ===== CHECK-IN ACTIONS =====

  logCheckIn(memberId: string, memberName: string, method: string) {
    return this.log({
      category: 'CHECK_IN',
      action: 'check_in',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      success: true,
      metadata: { method }, // 'qr', 'manual', 'phone'
    });
  }

  logCheckOut(memberId: string, memberName: string) {
    return this.log({
      category: 'CHECK_IN',
      action: 'check_out',
      resourceType: 'member',
      resourceId: memberId,
      resourceName: memberName,
      success: true,
    });
  }

  // ===== LEAD ACTIONS =====

  logLeadCreated(leadId: string, leadName: string, leadData: Record<string, unknown>) {
    return this.log({
      category: 'LEAD',
      action: 'lead_created',
      resourceType: 'lead',
      resourceId: leadId,
      resourceName: leadName,
      newValues: leadData,
      success: true,
    });
  }

  logLeadUpdated(leadId: string, leadName: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) {
    return this.log({
      category: 'LEAD',
      action: 'lead_updated',
      resourceType: 'lead',
      resourceId: leadId,
      resourceName: leadName,
      oldValues: oldData,
      newValues: newData,
      success: true,
    });
  }

  logLeadConverted(leadId: string, leadName: string, memberId: string) {
    return this.log({
      category: 'LEAD',
      action: 'lead_converted',
      resourceType: 'lead',
      resourceId: leadId,
      resourceName: leadName,
      success: true,
      metadata: { converted_to_member_id: memberId },
    });
  }

  logLeadDeleted(leadId: string, leadName: string) {
    return this.log({
      category: 'LEAD',
      action: 'lead_deleted',
      resourceType: 'lead',
      resourceId: leadId,
      resourceName: leadName,
      success: true,
    });
  }

  logLeadFollowUp(leadId: string, leadName: string, followUpData: Record<string, unknown>) {
    return this.log({
      category: 'LEAD',
      action: 'lead_follow_up',
      resourceType: 'lead',
      resourceId: leadId,
      resourceName: leadName,
      newValues: followUpData,
      success: true,
    });
  }

  // ===== SETTINGS ACTIONS =====

  logSettingsUpdated(settingType: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) {
    return this.log({
      category: 'SETTINGS',
      action: 'settings_updated',
      resourceType: 'settings',
      resourceId: settingType,
      resourceName: settingType,
      oldValues: oldData,
      newValues: newData,
      success: true,
    });
  }

  logGymProfileUpdated(gymId: string, gymName: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) {
    return this.log({
      category: 'SETTINGS',
      action: 'gym_profile_updated',
      resourceType: 'gym',
      resourceId: gymId,
      resourceName: gymName,
      oldValues: oldData,
      newValues: newData,
      success: true,
    });
  }

  // ===== STAFF ACTIONS =====

  logStaffCreated(staffId: string, staffName: string, staffData: Record<string, unknown>) {
    return this.log({
      category: 'STAFF',
      action: 'staff_created',
      resourceType: 'staff',
      resourceId: staffId,
      resourceName: staffName,
      newValues: staffData,
      success: true,
    });
  }

  logStaffUpdated(staffId: string, staffName: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) {
    return this.log({
      category: 'STAFF',
      action: 'staff_updated',
      resourceType: 'staff',
      resourceId: staffId,
      resourceName: staffName,
      oldValues: oldData,
      newValues: newData,
      success: true,
    });
  }

  logStaffDeleted(staffId: string, staffName: string) {
    return this.log({
      category: 'STAFF',
      action: 'staff_deleted',
      resourceType: 'staff',
      resourceId: staffId,
      resourceName: staffName,
      success: true,
    });
  }

  // ===== CLASS ACTIONS =====

  logClassCreated(classId: string, className: string, classData: Record<string, unknown>) {
    return this.log({
      category: 'CLASS',
      action: 'class_created',
      resourceType: 'class',
      resourceId: classId,
      resourceName: className,
      newValues: classData,
      success: true,
    });
  }

  logClassUpdated(classId: string, className: string, oldData: Record<string, unknown>, newData: Record<string, unknown>) {
    return this.log({
      category: 'CLASS',
      action: 'class_updated',
      resourceType: 'class',
      resourceId: classId,
      resourceName: className,
      oldValues: oldData,
      newValues: newData,
      success: true,
    });
  }

  logClassDeleted(classId: string, className: string) {
    return this.log({
      category: 'CLASS',
      action: 'class_deleted',
      resourceType: 'class',
      resourceId: classId,
      resourceName: className,
      success: true,
    });
  }

  logClassAttendanceMarked(classId: string, className: string, memberId: string, memberName: string) {
    return this.log({
      category: 'CLASS',
      action: 'class_attendance_marked',
      resourceType: 'class',
      resourceId: classId,
      resourceName: className,
      success: true,
      metadata: { member_id: memberId, member_name: memberName },
    });
  }

  // ===== REPORT ACTIONS =====

  logReportExported(reportType: string, format: string, filters: Record<string, unknown>) {
    return this.log({
      category: 'REPORT',
      action: 'report_exported',
      resourceType: 'report',
      resourceId: reportType,
      resourceName: reportType,
      success: true,
      metadata: { format, filters },
    });
  }

  logDataExported(dataType: string, format: string, recordCount: number) {
    return this.log({
      category: 'REPORT',
      action: 'data_exported',
      resourceType: 'export',
      resourceId: dataType,
      resourceName: dataType,
      success: true,
      metadata: { format, record_count: recordCount },
    });
  }

  // ===== RECEIPT ACTIONS =====

  logReceiptGenerated(receiptId: string, memberId: string, memberName: string, amount: number) {
    return this.log({
      category: 'RECEIPT',
      action: 'receipt_generated',
      resourceType: 'receipt',
      resourceId: receiptId,
      resourceName: memberName,
      success: true,
      metadata: { member_id: memberId, amount },
    });
  }

  logReceiptShared(receiptId: string, memberId: string, memberName: string, channel: string) {
    return this.log({
      category: 'RECEIPT',
      action: 'receipt_shared',
      resourceType: 'receipt',
      resourceId: receiptId,
      resourceName: memberName,
      success: true,
      metadata: { member_id: memberId, channel },
    });
  }

  // ===== NOTIFICATION ACTIONS =====

  logNotificationSent(memberId: string, memberName: string, notificationType: string, channel: string) {
    return this.log({
      category: 'NOTIFICATION',
      action: 'notification_sent',
      resourceType: 'notification',
      resourceId: memberId,
      resourceName: memberName,
      success: true,
      metadata: { type: notificationType, channel },
    });
  }

  logReminderSent(memberId: string, memberName: string, reminderType: string) {
    return this.log({
      category: 'NOTIFICATION',
      action: 'reminder_sent',
      resourceType: 'reminder',
      resourceId: memberId,
      resourceName: memberName,
      success: true,
      metadata: { type: reminderType },
    });
  }

  logWhatsAppShared(memberId: string, memberName: string, contentType: string) {
    return this.log({
      category: 'NOTIFICATION',
      action: 'whatsapp_shared',
      resourceType: 'whatsapp',
      resourceId: memberId,
      resourceName: memberName,
      success: true,
      metadata: { content_type: contentType },
    });
  }

  // ===== AUTH ACTIONS =====

  logUserLogin(userId: string, userEmail: string) {
    return this.log({
      category: 'AUTH',
      action: 'user_login',
      resourceType: 'user',
      resourceId: userId,
      resourceName: userEmail,
      success: true,
    });
  }

  logUserLogout(userId: string, userEmail: string) {
    return this.log({
      category: 'AUTH',
      action: 'user_logout',
      resourceType: 'user',
      resourceId: userId,
      resourceName: userEmail,
      success: true,
    });
  }

  // ===== ERROR LOGGING =====

  logError(category: AuditCategory, action: string, errorMessage: string, context: Record<string, unknown> = {}) {
    return this.log({
      category,
      action: 'error_occurred' as AuditAction,
      resourceType: 'error',
      resourceId: action,
      resourceName: action,
      success: false,
      errorMessage,
      metadata: context,
    });
  }

  logApiFailure(endpoint: string, method: string, errorMessage: string, statusCode?: number) {
    return this.log({
      category: 'SYSTEM',
      action: 'api_failure',
      resourceType: 'api',
      resourceId: endpoint,
      resourceName: `${method} ${endpoint}`,
      success: false,
      errorMessage,
      metadata: { method, status_code: statusCode },
    });
  }
}

// Export singleton
export const auditLogger = AuditLogger.getInstance();
