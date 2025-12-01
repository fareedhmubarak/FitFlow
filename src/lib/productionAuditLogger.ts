import { supabase, getCurrentGymId } from './supabase';
import { debugLogger } from './debugLogger';
import { complianceLogger } from './complianceLogger';

export interface ProductionAuditConfig {
  enableAuditLogging: boolean;
  enableApiLogging: boolean;
  enableSessionTracking: boolean;
  enableErrorTracking: boolean;
  enablePerformanceTracking: boolean;
  enableSecurityMonitoring: boolean;
  dataRetentionDays: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  anonymizeData: boolean;
  excludeEndpoints: string[];
  batchSize: number;
  flushIntervalMs: number;
}

interface ProductionLogEntry {
  id: string;
  gymId: string;
  sessionId: string;
  userId?: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  category: 'audit' | 'api' | 'security' | 'performance' | 'error';
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata: Record<string, any>;
  duration?: number;
  success?: boolean;
  errorCode?: string;
  ipAddress?: string;
  userAgent?: string;
}

class ProductionAuditLogger {
  private config: ProductionAuditConfig;
  private gymId: string | null = null;
  private isEnabled = false;
  private queue: ProductionLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  constructor() {
    this.config = this.getDefaultConfig();
    this.initialize();
  }

  private getDefaultConfig(): ProductionAuditConfig {
    return {
      enableAuditLogging: true,
      enableApiLogging: true,
      enableSessionTracking: true,
      enableErrorTracking: true,
      enablePerformanceTracking: false, // Disabled in production by default
      enableSecurityMonitoring: true,
      dataRetentionDays: 2555, // 7 years for GDPR compliance
      logLevel: 'warn',
      anonymizeData: true,
      excludeEndpoints: [
        '/health',
        '/metrics',
        '/static',
        '/favicon.ico',
        '/auth/refresh',
        '/gym_audit_logs',
        '/gym_api_logs',
        '/gym_sessions'
      ],
      batchSize: 100,
      flushIntervalMs: 30000 // 30 seconds
    };
  }

  private async initialize() {
    try {
      // Get gym ID
      this.gymId = await getCurrentGymId();
      if (!this.gymId) {
        console.warn('Production audit logger: No gym ID found, disabling');
        return;
      }

      // Load configuration from database or environment
      await this.loadConfiguration();

      // Generate session ID
      this.sessionId = this.generateSessionId();

      // Start flush timer
      this.startFlushTimer();

      // Setup global error handlers
      this.setupErrorHandlers();

      this.isEnabled = true;
      console.log('Production audit logger initialized successfully');
    } catch (error) {
      console.error('Failed to initialize production audit logger:', error);
    }
  }

  private async loadConfiguration() {
    try {
      // Try to load from database first
      if (this.gymId) {
        const { data } = await supabase
          .from('production_audit_config')
          .select('*')
          .eq('gym_id', this.gymId)
          .single();

        if (data) {
          this.config = { ...this.config, ...data.config };
        }
      }

      // Override with environment variables if present
      if (import.meta.env.VITE_AUDIT_LOG_LEVEL) {
        this.config.logLevel = import.meta.env.VITE_AUDIT_LOG_LEVEL as any;
      }
      if (import.meta.env.VITE_AUDIT_RETENTION_DAYS) {
        this.config.dataRetentionDays = parseInt(import.meta.env.VITE_AUDIT_RETENTION_DAYS);
      }
      if (import.meta.env.VITE_AUDIT_ENABLED !== undefined) {
        this.config.enableAuditLogging = import.meta.env.VITE_AUDIT_ENABLED === 'true';
      }

    } catch (error) {
      console.warn('Failed to load audit configuration, using defaults:', error);
    }
  }

  private generateSessionId(): string {
    return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.config.flushIntervalMs);
  }

  private setupErrorHandlers() {
    if (typeof window !== 'undefined') {
      // Global error handler
      window.addEventListener('error', (event) => {
        this.logError('Unhandled Error', event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          unhandled: true
        });
      });

      // Unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.logError('Unhandled Promise Rejection', new Error(event.reason), {
          unhandledRejection: true
        });
      });

      // Page unload - flush remaining logs
      window.addEventListener('beforeunload', () => {
        this.flushLogs(true);
      });
    }
  }

  private shouldLog(level: 'error' | 'warn' | 'info' | 'debug'): boolean {
    if (!this.isEnabled) return false;

    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const currentLevelIndex = levels.indexOf(level);

    return currentLevelIndex >= configLevelIndex;
  }

  private anonymizeData(data: any): any {
    if (!this.config.anonymizeData) return data;

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const anonymized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields
      if (this.isSensitiveField(key)) {
        (anonymized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (anonymized as any)[key] = this.anonymizeData(value);
      } else {
        (anonymized as any)[key] = value;
      }
    }

    return anonymized;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth',
      'credit_card', 'ssn', 'social_security', 'email',
      'phone', 'address', 'personal', 'private',
      'api_key', 'access_token', 'refresh_token'
    ];

    return sensitiveFields.some(sensitive =>
      fieldName.toLowerCase().includes(sensitive)
    );
  }

  private createLogEntry(
    level: 'error' | 'warn' | 'info' | 'debug',
    category: 'audit' | 'api' | 'security' | 'performance' | 'error',
    action: string,
    metadata: Record<string, any> = {},
    duration?: number,
    success?: boolean,
    errorCode?: string
  ): ProductionLogEntry | null {
    if (!this.gymId || !this.sessionId) return null;

    return {
      id: this.generateLogId(),
      gymId: this.gymId,
      sessionId: this.sessionId,
      userId: metadata.userId || undefined,
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      resourceType: metadata.resourceType,
      resourceId: metadata.resourceId,
      metadata: this.anonymizeData(metadata),
      duration,
      success,
      errorCode,
      ipAddress: metadata.ipAddress || this.getClientIp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    };
  }

  private generateLogId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIp(): string {
    // In production, this would come from request headers or a geolocation service
    return 'production_ip';
  }

  private async flushLogs(isSync = false) {
    if (this.queue.length === 0) return;

    const logs = this.queue.splice(0, this.config.batchSize);

    if (isSync) {
      // Synchronous flush for page unload
      this.sendLogsSync(logs);
    } else {
      // Asynchronous flush
      this.sendLogs(logs);
    }
  }

  private async sendLogs(logs: ProductionLogEntry[]) {
    try {
      // Filter logs based on category and configuration
      const filteredLogs = logs.filter(log => {
        switch (log.category) {
          case 'audit':
            return this.config.enableAuditLogging;
          case 'api':
            return this.config.enableApiLogging;
          case 'security':
            return this.config.enableSecurityMonitoring;
          case 'error':
            return this.config.enableErrorTracking;
          case 'performance':
            return this.config.enablePerformanceTracking;
          default:
            return true;
        }
      });

      if (filteredLogs.length === 0) return;

      // Send to audit logs table
      const auditLogs = filteredLogs
        .filter(log => log.category === 'audit')
        .map(log => ({
          gym_id: log.gymId,
          session_id: log.sessionId,
          user_id: log.userId,
          event_type: 'production_audit',
          event_category: log.category,
          action: log.action,
          resource_type: log.resourceType,
          resource_id: log.resourceId,
          metadata: log.metadata,
          user_agent: log.userAgent,
          ip_address: log.ipAddress,
          timestamp: log.timestamp,
          duration_ms: log.duration,
          success: log.success,
          error_message: log.level === 'error' ? log.action : null,
          error_code: log.errorCode
        }));

      if (auditLogs.length > 0) {
        const { error } = await supabase
          .from('gym_audit_logs')
          .insert(auditLogs);

        if (error) {
          console.error('Failed to send audit logs:', error);
          // Re-queue failed logs if possible
          this.queue.unshift(...logs);
        }
      }

      // Send security anomalies for high/critical severity
      const securityLogs = filteredLogs.filter(log =>
        log.category === 'security' && ['high', 'critical'].includes(log.metadata.severity)
      );

      for (const securityLog of securityLogs) {
        await complianceLogger.logAnomaly({
          anomalyType: securityLog.metadata.anomalyType || 'security_event',
          severity: securityLog.metadata.severity || 'medium',
          confidenceScore: securityLog.metadata.confidenceScore || 0.8,
          description: securityLog.action,
          affectedUserId: securityLog.userId,
          affectedResourceType: securityLog.resourceType,
          affectedResourceId: securityLog.resourceId,
          rawData: securityLog.metadata
        });
      }

    } catch (error) {
      console.error('Failed to send production logs:', error);
      // Re-queue failed logs
      this.queue.unshift(...logs);
    }
  }

  private sendLogsSync(logs: ProductionLogEntry[]) {
    // Use Beacon API for synchronous logging on page unload
    if (typeof window !== 'undefined' && window.navigator.sendBeacon) {
      try {
        const data = JSON.stringify({
          logs,
          gymId: this.gymId,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        });

        window.navigator.sendBeacon('/api/audit-logs', data);
      } catch (error) {
        console.error('Failed to send logs via beacon:', error);
      }
    }
  }

  // Public API methods
  logAudit(action: string, metadata: Record<string, any> = {}) {
    if (!this.shouldLog('info')) return;

    const logEntry = this.createLogEntry('info', 'audit', action, metadata);
    if (logEntry) {
      this.queue.push(logEntry);
    }
  }

  logApiCall(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    metadata: Record<string, any> = {}
  ) {
    if (!this.shouldLog('info')) return;
    if (!this.config.enableApiLogging) return;

    // Check if endpoint should be excluded
    if (this.config.excludeEndpoints.some(excluded => endpoint.includes(excluded))) {
      return;
    }

    const action = `${method} ${endpoint}`;
    const success = statusCode >= 200 && statusCode < 400;

    const logEntry = this.createLogEntry(
      success ? 'info' : 'warn',
      'api',
      action,
      { ...metadata, method, endpoint, statusCode },
      duration,
      success,
      statusCode >= 400 ? statusCode.toString() : undefined
    );

    if (logEntry) {
      this.queue.push(logEntry);
    }
  }

  logSecurity(
    action: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata: Record<string, any> = {}
  ) {
    if (!this.shouldLog('warn')) return;
    if (!this.config.enableSecurityMonitoring) return;

    const level = severity === 'critical' ? 'error' : 'warn';

    const logEntry = this.createLogEntry(
      level,
      'security',
      action,
      { ...metadata, severity },
      undefined,
      true
    );

    if (logEntry) {
      this.queue.push(logEntry);
    }
  }

  logError(message: string, error: Error, metadata: Record<string, any> = {}) {
    if (!this.shouldLog('error')) return;
    if (!this.config.enableErrorTracking) return;

    const logEntry = this.createLogEntry(
      'error',
      'error',
      message,
      {
        ...metadata,
        errorMessage: error.message,
        stackTrace: error.stack
      },
      undefined,
      false
    );

    if (logEntry) {
      this.queue.push(logEntry);
    }
  }

  logPerformance(name: string, duration: number, metadata: Record<string, any> = {}) {
    if (!this.shouldLog('info')) return;
    if (!this.config.enablePerformanceTracking) return;

    const logEntry = this.createLogEntry(
      'info',
      'performance',
      name,
      metadata,
      duration,
      true
    );

    if (logEntry) {
      this.queue.push(logEntry);
    }
  }

  // Configuration methods
  async updateConfig(newConfig: Partial<ProductionAuditConfig>) {
    this.config = { ...this.config, ...newConfig };

    // Save to database
    if (this.gymId) {
      try {
        await supabase
          .from('production_audit_config')
          .upsert({
            gym_id: this.gymId,
            config: this.config,
            updated_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('Failed to save audit configuration:', error);
      }
    }

    // Restart flush timer with new interval
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.startFlushTimer();
  }

  getConfig(): ProductionAuditConfig {
    return { ...this.config };
  }

  // Utility methods
  setUserId(userId: string) {
    // This would be called when user authenticates
    if (this.queue.length > 0) {
      // Update recent logs with user ID
      const recentLogs = this.queue.slice(-10);
      recentLogs.forEach(log => {
        log.userId = userId;
      });
    }
  }

  forceFlush() {
    this.flushLogs(true);
  }

  // Cleanup
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.forceFlush();
    this.isEnabled = false;
  }
}

// Create singleton instance
export const productionAuditLogger = new ProductionAuditLogger();

// Export utility functions
export const logProductionAudit = (action: string, metadata?: Record<string, any>) => {
  productionAuditLogger.logAudit(action, metadata);
};

export const logProductionApiCall = (
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  metadata?: Record<string, any>
) => {
  productionAuditLogger.logApiCall(method, endpoint, statusCode, duration, metadata);
};

export const logProductionSecurity = (
  action: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>
) => {
  productionAuditLogger.logSecurity(action, severity, metadata);
};

export const logProductionError = (message: string, error: Error, metadata?: Record<string, any>) => {
  productionAuditLogger.logError(message, error, metadata);
};