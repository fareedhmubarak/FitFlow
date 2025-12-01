import { supabase, getCurrentGymId } from './supabase';
import { debugLogger } from './debugLogger';

export interface ComplianceConfig {
  complianceType: 'GDPR' | 'CCPA' | 'SOX' | 'HIPAA';
  retentionDays: number;
  requiresConsent: boolean;
  dataSubjectRights: boolean;
  breachNotificationHours: number;
  encryptionRequired: boolean;
  auditFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  additionalSettings?: Record<string, any>;
}

export interface AnomalyRule {
  ruleName: string;
  ruleType: 'threshold' | 'pattern' | 'statistical' | 'ml_model';
  conditions: Record<string, any>;
  thresholdValue?: number;
  timeWindowMinutes: number;
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  isActive: boolean;
}

export interface ComplianceReport {
  reportType: 'access_log' | 'security_incident' | 'data_processing' | 'retention';
  complianceStandard?: 'GDPR' | 'CCPA' | 'SOX' | 'HIPAA';
  periodStart: Date;
  periodEnd: Date;
  reportData: Record<string, any>;
  status: 'draft' | 'pending_approval' | 'approved' | 'submitted';
}

export interface AnomalyDetection {
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  description: string;
  affectedUserId?: string;
  affectedResourceType?: string;
  affectedResourceId?: string;
  rawData?: Record<string, any>;
  detectionRuleId?: string;
}

class ComplianceLogger {
  private isDevelopment = import.meta.env.DEV;
  private gymId: string | null = null;
  private notificationQueue: Array<{
    type: string;
    data: any;
    timestamp: number;
  }> = [];
  private rateLimitMap = new Map<string, number>();

  constructor() {
    this.initializeGymId();
    this.setupNotificationProcessor();
  }

  private async initializeGymId() {
    try {
      this.gymId = await getCurrentGymId();
    } catch (error) {
      console.error('Failed to initialize gym ID for compliance logging:', error);
    }
  }

  private setupNotificationProcessor() {
    // Process notifications every 30 seconds
    setInterval(() => {
      this.processNotificationQueue();
    }, 30000);
  }

  private async processNotificationQueue() {
    if (this.notificationQueue.length === 0 || !this.gymId) return;

    const notifications = [...this.notificationQueue];
    this.notificationQueue = [];

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification.type, notification.data);
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Re-queue failed notifications
        this.notificationQueue.push(notification);
      }
    }
  }

  private async sendNotification(type: string, data: any) {
    const rateLimitKey = `${type}_${this.gymId}`;
    const now = Date.now();
    const lastSent = this.rateLimitMap.get(rateLimitKey) || 0;
    const rateLimitMs = 5 * 60 * 1000; // 5 minutes

    if (now - lastSent < rateLimitMs) {
      // Rate limited, re-queue
      this.notificationQueue.push({ type, data, timestamp: now });
      return;
    }

    try {
      // Get notification configuration
      const { data: config } = await supabase
        .from('audit_notifications')
        .select('*')
        .eq('gym_id', this.gymId)
        .eq('trigger_event', type)
        .eq('is_active', true)
        .single();

      if (config) {
        await this.executeNotification(config, data);
        this.rateLimitMap.set(rateLimitKey, now);

        // Update last_sent_at
        await supabase
          .from('audit_notifications')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', config.id);
      }
    } catch (error) {
      console.error('Notification execution failed:', error);
    }
  }

  private async executeNotification(config: any, data: any) {
    const { notification_type, configuration } = config;

    switch (notification_type) {
      case 'email':
        await this.sendEmailNotification(configuration, data);
        break;
      case 'webhook':
        await this.sendWebhookNotification(configuration, data);
        break;
      case 'slack':
        await this.sendSlackNotification(configuration, data);
        break;
      default:
        console.warn(`Unsupported notification type: ${notification_type}`);
    }
  }

  private async sendEmailNotification(config: any, data: any) {
    // Integration with email service (SendGrid, AWS SES, etc.)
    console.log('Email notification:', { config, data });
    // Implementation would depend on email service provider
  }

  private async sendWebhookNotification(config: any, data: any) {
    const { endpoint, headers, method = 'POST' } = config;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          gym_id: this.gymId,
          ...data
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook notification failed:', error);
      throw error;
    }
  }

  private async sendSlackNotification(config: any, data: any) {
    const { webhook_url, channel } = config;

    try {
      const response = await fetch(webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel,
          text: `🚨 Security Alert: ${data.anomalyType}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Security Alert Detected*\n\n*Type:* ${data.anomalyType}\n*Severity:* ${data.severity.toUpperCase()}\n*Description:* ${data.description}\n*Gym ID:* ${this.gymId}\n*Time:* ${new Date().toISOString()}`
              }
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Slack notification failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Slack notification failed:', error);
      throw error;
    }
  }

  // Compliance Configuration Management
  async configureCompliance(config: ComplianceConfig): Promise<boolean> {
    if (!this.gymId) return false;

    try {
      const { error } = await supabase
        .from('compliance_configurations')
        .upsert({
          gym_id: this.gymId,
          compliance_type: config.complianceType,
          retention_days: config.retentionDays,
          requires_consent: config.requiresConsent,
          data_subject_rights: config.dataSubjectRights,
          breach_notification_hours: config.breachNotificationHours,
          encryption_required: config.encryptionRequired,
          audit_frequency: config.auditFrequency,
          additional_settings: config.additionalSettings || {}
        });

      if (error) throw error;

      // Log configuration change
      debugLogger.logUserInteraction('compliance_config_updated', {
        complianceType: config.complianceType,
        retentionDays: config.retentionDays
      });

      return true;
    } catch (error) {
      console.error('Failed to configure compliance:', error);
      return false;
    }
  }

  async getComplianceConfiguration(complianceType?: string): Promise<ComplianceConfig | null> {
    if (!this.gymId) return null;

    try {
      let query = supabase
        .from('compliance_configurations')
        .select('*')
        .eq('gym_id', this.gymId);

      if (complianceType) {
        query = query.eq('compliance_type', complianceType);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      return {
        complianceType: data.compliance_type,
        retentionDays: data.retention_days,
        requiresConsent: data.requires_consent,
        dataSubjectRights: data.data_subject_rights,
        breachNotificationHours: data.breach_notification_hours,
        encryptionRequired: data.encryption_required,
        auditFrequency: data.audit_frequency,
        additionalSettings: data.additional_settings
      };
    } catch (error) {
      console.error('Failed to get compliance configuration:', error);
      return null;
    }
  }

  // Anomaly Detection
  async createAnomalyRule(rule: Omit<AnomalyRule, 'ruleName'> & { ruleName?: string }): Promise<boolean> {
    if (!this.gymId) return false;

    try {
      const { error } = await supabase
        .from('anomaly_detection_rules')
        .insert({
          gym_id: this.gymId,
          rule_name: rule.ruleName || `rule_${Date.now()}`,
          rule_type: rule.ruleType,
          conditions: rule.conditions,
          threshold_value: rule.thresholdValue,
          time_window_minutes: rule.timeWindowMinutes,
          severity_level: rule.severityLevel,
          description: rule.description,
          is_active: rule.isActive
        });

      if (error) throw error;

      debugLogger.logUserInteraction('anomaly_rule_created', {
        ruleType: rule.ruleType,
        severityLevel: rule.severityLevel
      });

      return true;
    } catch (error) {
      console.error('Failed to create anomaly rule:', error);
      return false;
    }
  }

  async logAnomaly(anomaly: AnomalyDetection): Promise<boolean> {
    if (!this.gymId) return false;

    try {
      const { error } = await supabase
        .from('audit_anomalies')
        .insert({
          gym_id: this.gymId,
          session_id: debugLogger.getSessionId(),
          anomaly_type: anomaly.anomalyType,
          severity: anomaly.severity,
          confidence_score: anomaly.confidenceScore,
          description: anomaly.description,
          affected_user_id: anomaly.affectedUserId,
          affected_resource_type: anomaly.affectedResourceType,
          affected_resource_id: anomaly.affectedResourceId,
          raw_data: anomaly.rawData || {},
          detection_rule_id: anomaly.detectionRuleId
        });

      if (error) throw error;

      // Trigger notifications for high/critical severity
      if (['high', 'critical'].includes(anomaly.severity)) {
        this.notificationQueue.push({
          type: 'anomaly_detected',
          data: {
            anomalyType: anomaly.anomalyType,
            severity: anomaly.severity,
            description: anomaly.description,
            confidenceScore: anomaly.confidenceScore
          },
          timestamp: Date.now()
        });
      }

      // Also log to debug system
      debugLogger.logError(new Error(anomaly.description), {
        context: 'anomaly_detection',
        anomalyType: anomaly.anomalyType,
        severity: anomaly.severity
      });

      return true;
    } catch (error) {
      console.error('Failed to log anomaly:', error);
      return false;
    }
  }

  // Compliance Reporting
  async generateComplianceReport(report: Omit<ComplianceReport, 'reportData'>): Promise<string | null> {
    if (!this.gymId) return null;

    try {
      let reportData: Record<string, any> = {};

      switch (report.reportType) {
        case 'access_log':
          reportData = await this.generateAccessLogReport(report.periodStart, report.periodEnd);
          break;
        case 'security_incident':
          reportData = await this.generateSecurityIncidentReport(report.periodStart, report.periodEnd);
          break;
        case 'data_processing':
          reportData = await this.generateDataProcessingReport(report.periodStart, report.periodEnd);
          break;
        case 'retention':
          reportData = await this.generateRetentionReport();
          break;
      }

      const { data, error } = await supabase
        .from('compliance_reports')
        .insert({
          gym_id: this.gymId,
          report_type: report.reportType,
          compliance_standard: report.complianceStandard,
          report_period_start: report.periodStart.toISOString().split('T')[0],
          report_period_end: report.periodEnd.toISOString().split('T')[0],
          report_data: reportData,
          status: report.status
        })
        .select('id')
        .single();

      if (error) throw error;

      debugLogger.logUserInteraction('compliance_report_generated', {
        reportType: report.reportType,
        reportId: data.id
      });

      return data.id;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      return null;
    }
  }

  private async generateAccessLogReport(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    try {
      const { data: accessLogs } = await supabase
        .from('gym_audit_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .eq('gym_id', this.gymId);

      const { data: apiLogs } = await supabase
        .from('gym_api_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .eq('gym_id', this.gymId);

      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalAuditEvents: accessLogs?.length || 0,
          totalApiCalls: apiLogs?.length || 0,
          uniqueUsers: new Set(accessLogs?.map(log => log.user_id).filter(Boolean)).size,
          uniqueSessions: new Set(accessLogs?.map(log => log.session_id)).size,
          errorRate: ((accessLogs?.filter(log => !log.success).length || 0) / (accessLogs?.length || 1)) * 100
        },
        userActivity: this.aggregateUserActivity(accessLogs || []),
        apiActivity: this.aggregateApiActivity(apiLogs || []),
        securityEvents: accessLogs?.filter(log => log.event_type === 'error') || []
      };
    } catch (error) {
      console.error('Failed to generate access log report:', error);
      return {};
    }
  }

  private async generateSecurityIncidentReport(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    try {
      const { data: anomalies } = await supabase
        .from('audit_anomalies')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('gym_id', this.gymId);

      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalIncidents: anomalies?.length || 0,
          criticalIncidents: anomalies?.filter(a => a.severity === 'critical').length || 0,
          highIncidents: anomalies?.filter(a => a.severity === 'high').length || 0,
          resolvedIncidents: anomalies?.filter(a => a.status === 'resolved').length || 0,
          openIncidents: anomalies?.filter(a => a.status === 'open').length || 0
        },
        incidents: anomalies?.map(anomaly => ({
          id: anomaly.id,
          type: anomaly.anomaly_type,
          severity: anomaly.severity,
          confidence: anomaly.confidence_score,
          description: anomaly.description,
          status: anomaly.status,
          createdAt: anomaly.created_at,
          affectedUser: anomaly.affected_user_id
        })) || []
      };
    } catch (error) {
      console.error('Failed to generate security incident report:', error);
      return {};
    }
  }

  private async generateDataProcessingReport(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    try {
      const { data: auditLogs } = await supabase
        .from('gym_audit_logs')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .eq('gym_id', this.gymId);

      const processingActivities = auditLogs?.reduce((acc: any, log) => {
        const activity = log.event_category;
        if (!acc[activity]) {
          acc[activity] = {
            count: 0,
            purposes: new Set(),
            legalBasis: new Set(),
            dataSubjects: new Set()
          };
        }
        acc[activity].count++;
        acc[activity].purposes.add(log.action);
        if (log.user_id) acc[activity].dataSubjects.add(log.user_id);
        return acc;
      }, {});

      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        processingActivities: Object.entries(processingActivities || {}).map(([activity, data]: [string, any]) => ({
          activity,
          count: data.count,
          purposes: Array.from(data.purposes),
          legalBasis: ['Legitimate Interest', 'Contractual Necessity'], // Would be configurable
          dataSubjectsCount: data.dataSubjects.size
        }))
      };
    } catch (error) {
      console.error('Failed to generate data processing report:', error);
      return {};
    }
  }

  private async generateRetentionReport(): Promise<Record<string, any>> {
    try {
      const { data: configs } = await supabase
        .from('compliance_configurations')
        .select('*')
        .eq('gym_id', this.gymId);

      return {
        retentionPolicies: configs?.map(config => ({
          complianceType: config.compliance_type,
          retentionDays: config.retention_days,
          requiresConsent: config.requires_consent,
          dataSubjectRights: config.data_subject_rights,
          breachNotificationHours: config.breach_notification_hours
        })) || []
      };
    } catch (error) {
      console.error('Failed to generate retention report:', error);
      return {};
    }
  }

  private aggregateUserActivity(logs: any[]): any[] {
    const userActivity = logs.reduce((acc: any, log) => {
      if (!log.user_id) return acc;

      if (!acc[log.user_id]) {
        acc[log.user_id] = {
          userId: log.user_id,
          actionCount: 0,
          lastActivity: log.timestamp,
          actions: new Set()
        };
      }

      acc[log.user_id].actionCount++;
      acc[log.user_id].actions.add(log.action);
      if (new Date(log.timestamp) > new Date(acc[log.user_id].lastActivity)) {
        acc[log.user_id].lastActivity = log.timestamp;
      }

      return acc;
    }, {});

    return Object.values(userActivity).map((user: any) => ({
      ...user,
      uniqueActions: user.actions.size
    }));
  }

  private aggregateApiActivity(logs: any[]): any[] {
    const apiActivity = logs.reduce((acc: any, log) => {
      const endpoint = log.endpoint;
      if (!acc[endpoint]) {
        acc[endpoint] = {
          endpoint,
          callCount: 0,
          totalDuration: 0,
          errorCount: 0,
          avgDuration: 0
        };
      }

      acc[endpoint].callCount++;
      acc[endpoint].totalDuration += log.duration_ms || 0;
      if (log.response_status >= 400) {
        acc[endpoint].errorCount++;
      }

      return acc;
    }, {});

    return Object.values(apiActivity).map((api: any) => ({
      ...api,
      avgDuration: api.totalDuration / api.callCount,
      errorRate: (api.errorCount / api.callCount) * 100
    }));
  }

  // Integrity Verification
  async verifyLogIntegrity(date?: Date): Promise<boolean> {
    if (!this.gymId) return false;

    try {
      const checkDate = date || new Date();
      const { data, error } = await supabase
        .rpc('verify_audit_log_integrity', { p_date: checkDate.toISOString().split('T')[0] });

      if (error) throw error;

      const isValid = (data as any[]).every(check => check.is_valid);

      debugLogger.logUserInteraction('log_integrity_verified', {
        date: checkDate.toISOString().split('T')[0],
        isValid,
        tables: data
      });

      return isValid;
    } catch (error) {
      console.error('Failed to verify log integrity:', error);
      return false;
    }
  }

  // Automated Anomaly Detection
  async runAnomalyDetection(): Promise<void> {
    if (!this.gymId) return;

    try {
      // Detect unusual login patterns
      const { data: loginAnomalies } = await supabase
        .rpc('detect_unusual_login_patterns');

      if (loginAnomalies && loginAnomalies.length > 0) {
        for (const anomaly of loginAnomalies) {
          await this.logAnomaly({
            anomalyType: 'unusual_login_pattern',
            severity: anomaly.severity,
            confidenceScore: 0.8,
            description: anomaly.anomaly_description,
            rawData: anomaly
          });
        }
      }

      // Detect performance anomalies
      await this.detectPerformanceAnomalies();

      // Detect access pattern anomalies
      await this.detectAccessPatternAnomalies();

    } catch (error) {
      console.error('Failed to run anomaly detection:', error);
    }
  }

  private async detectPerformanceAnomalies(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const { data: slowApis } = await supabase
        .from('gym_api_logs')
        .select('*')
        .gte('timestamp', oneHourAgo.toISOString())
        .eq('gym_id', this.gymId)
        .gte('duration_ms', 5000); // APIs taking more than 5 seconds

      if (slowApis && slowApis.length > 0) {
        await this.logAnomaly({
          anomalyType: 'performance_degradation',
          severity: 'medium',
          confidenceScore: 0.9,
          description: `Detected ${slowApis.length} slow API responses (>5s) in the last hour`,
          rawData: { slowApis: slowApis.length, avgDuration: slowApis.reduce((sum, api) => sum + api.duration_ms, 0) / slowApis.length }
        });
      }
    } catch (error) {
      console.error('Failed to detect performance anomalies:', error);
    }
  }

  private async detectAccessPatternAnomalies(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const { data: errorLogs } = await supabase
        .from('gym_audit_logs')
        .select('*')
        .gte('timestamp', oneHourAgo.toISOString())
        .eq('gym_id', this.gymId)
        .eq('success', false);

      if (errorLogs && errorLogs.length > 10) { // More than 10 errors in an hour
        await this.logAnomaly({
          anomalyType: 'high_error_rate',
          severity: 'high',
          confidenceScore: 0.85,
          description: `High error rate detected: ${errorLogs.length} errors in the last hour`,
          rawData: { errorCount: errorLogs.length, timeWindow: '1 hour' }
        });
      }
    } catch (error) {
      console.error('Failed to detect access pattern anomalies:', error);
    }
  }
}

// Create singleton instance
export const complianceLogger = new ComplianceLogger();

// Utility functions
export const createComplianceReport = async (report: Omit<ComplianceReport, 'reportData'>) => {
  return await complianceLogger.generateComplianceReport(report);
};

export const detectAnomalies = async () => {
  return await complianceLogger.runAnomalyDetection();
};

export const verifyAuditIntegrity = async (date?: Date) => {
  return await complianceLogger.verifyLogIntegrity(date);
};