import { supabaseRaw, getCurrentGymId, setSessionId } from './supabase';

// Use raw supabase to avoid infinite logging loops
const supabase = supabaseRaw;

export interface LogEntry {
  eventType: 'user_interaction' | 'api_call' | 'system_event' | 'error' | 'performance';
  eventCategory: 'user_action' | 'navigation' | 'form_submit' | 'auth' | 'error' | 'api_call' | 'performance';
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: Record<string, unknown>;
  duration?: number;
  success?: boolean;
  error?: Error;
  timestamp?: string;
}

interface ApiLogEntry {
  method: string;
  endpoint: string;
  requestHeaders?: Record<string, unknown>;
  requestBody?: unknown;
  responseStatus?: number;
  responseHeaders?: Record<string, unknown>;
  responseBody?: unknown;
  duration: number;
  success: boolean;
  error?: Error;
  metadata?: Record<string, unknown>;
}

interface SessionData {
  gymId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
}

class DebugLogger {
  private sessionId: string;
  private queue: LogEntry[] = [];
  private apiQueue: ApiLogEntry[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isDevelopment = import.meta.env.DEV;
  private sessionData: SessionData | null = null;
  private batchProcessorInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    // Share session ID with supabase tracker
    setSessionId(this.sessionId);
    this.setupEventListeners();
    this.startBatchProcessor();
    this.initializeSession();
  }

  // Only active in development
  private shouldLog(): boolean {
    return this.isDevelopment;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async initializeSession(sessionData?: any) {
    if (!this.shouldLog()) return;

    try {
      const gymId = await getCurrentGymId();
      if (gymId) {
        this.sessionData = {
          gymId,
          ipAddress: await this.getClientIpAddress(),
          userAgent: navigator.userAgent,
          deviceInfo: {
            browser: this.getBrowserInfo(),
            os: this.getOSInfo(),
            screen: {
              width: window.screen.width,
              height: window.screen.height,
              colorDepth: window.screen.colorDepth
            },
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        };

        // Log session start
        await this.logSessionStart();
      }
    } catch (error) {
      console.error('Failed to initialize debug session:', error);
    }
  }

  private async getClientIpAddress(): Promise<string> {
    try {
      // Simple IP detection - you might want to use a more sophisticated service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOSInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueues();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Listen for page unload to flush queues
    window.addEventListener('beforeunload', () => {
      this.flushQueues();
    });

    // Listen for errors
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        unhandled: true
      });
    });

    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(event.reason), {
        unhandledRejection: true,
        promise: event.promise
      });
    });
  }

  private startBatchProcessor() {
    // Process every 5 seconds
    this.batchProcessorInterval = setInterval(() => {
      this.flushQueues();
    }, 5000);
  }

  private async flushQueues() {
    if (!this.isOnline) return;

    await Promise.all([
      this.flushAuditQueue(),
      this.flushApiQueue()
    ]);
  }

  private async flushAuditQueue() {
    if (this.queue.length === 0) return;

    const logs = [...this.queue];
    this.queue = [];

    try {
      // Enhance logs with session data and convert to snake_case for database
      const enhancedLogs = logs.map(log => ({
        gym_id: this.sessionData?.gymId,
        session_id: this.sessionId,
        user_id: this.sessionData?.userId,
        event_type: log.eventType,
        event_category: log.eventCategory,
        action: log.action,
        resource_type: log.resourceType,
        resource_id: log.resourceId,
        old_values: log.oldValues,
        new_values: log.newValues,
        metadata: log.metadata,
        duration_ms: log.duration,
        success: log.success !== false,
        error_message: log.error?.message,
        error_stack: log.error?.stack,
        user_agent: this.sessionData?.userAgent,
        ip_address: this.sessionData?.ipAddress,
        timestamp: log.timestamp || new Date().toISOString()
      }));

      // Filter out sensitive data before sending
      const sanitizedLogs = enhancedLogs.map(log => this.sanitizeLogData(log));

      const { error } = await supabase.from('gym_audit_logs').insert(sanitizedLogs);
      if (error) {
        console.error('Failed to send audit logs:', error);
        this.storeLocally('audit_logs', logs);
      }
    } catch (error) {
      console.error('Error flushing audit queue:', error);
      this.storeLocally('audit_logs', logs);
    }
  }

  private async flushApiQueue() {
    if (this.apiQueue.length === 0) return;

    const apiLogs = [...this.apiQueue];
    this.apiQueue = [];

    try {
      // Enhance API logs with session data
      const enhancedApiLogs = apiLogs.map(log => ({
        gym_id: this.sessionData?.gymId,
        session_id: this.sessionId,
        user_id: this.sessionData?.userId,
        method: log.method,
        endpoint: log.endpoint,
        request_headers: log.requestHeaders,
        request_body: log.requestBody,
        response_status: log.responseStatus,
        response_headers: log.responseHeaders,
        response_body: log.responseBody,
        duration_ms: log.duration,
        ip_address: this.sessionData?.ipAddress,
        user_agent: this.sessionData?.userAgent,
        created_at: new Date().toISOString()
      }));

      // Filter out sensitive data before sending
      const sanitizedApiLogs = enhancedApiLogs.map(log => this.sanitizeApiLogData(log));

      const { error } = await supabase.from('gym_api_logs').insert(sanitizedApiLogs);
      if (error) {
        console.error('Failed to send API logs:', error);
        this.storeLocally('api_logs', apiLogs);
      }
    } catch (error) {
      console.error('Error flushing API queue:', error);
      this.storeLocally('api_logs', apiLogs);
    }
  }

  private sanitizeLogData(log: any): any {
    // Remove sensitive PII data while preserving debugging information
    const sanitized = { ...log };

    // Sanitize metadata if present
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeMetadata(sanitized.metadata);
    }

    // Sanitize oldValues and newValues (remove passwords, tokens, etc.)
    if (sanitized.oldValues) {
      sanitized.oldValues = this.sanitizeValues(sanitized.oldValues);
    }

    if (sanitized.newValues) {
      sanitized.newValues = this.sanitizeValues(sanitized.newValues);
    }

    return sanitized;
  }

  private sanitizeApiLogData(log: any): any {
    const sanitized = { ...log };

    // Sanitize request/response bodies
    if (sanitized.request_body) {
      sanitized.request_body = this.sanitizeValues(sanitized.request_body);
    }

    if (sanitized.response_body) {
      sanitized.response_body = this.sanitizeValues(sanitized.response_body);
    }

    return sanitized;
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Skip or sanitize sensitive fields
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeValues(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeValues(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeValues(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeValues(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth',
      'credit_card', 'ssn', 'social_security', 'email',
      'phone', 'address', 'personal', 'private'
    ];

    return sensitiveFields.some(sensitive =>
      fieldName.toLowerCase().includes(sensitive)
    );
  }

  private storeLocally(type: string, data: any) {
    try {
      const key = `debug_logs_${type}_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(data));

      // Clean old local logs (keep only last 10)
      const keys = Object.keys(localStorage).filter(k => k.startsWith(`debug_logs_${type}_`));
      if (keys.length > 10) {
        keys.sort().slice(0, -10).forEach(k => localStorage.removeItem(k));
      }
    } catch (error) {
      console.error('Failed to store logs locally:', error);
    }
  }

  private async logSessionStart() {
    if (!this.sessionData) return;

    try {
      const { error } = await supabase.from('gym_sessions').insert({
        session_id: this.sessionId,
        gym_id: this.sessionData.gymId,
        user_id: this.sessionData.userId,
        start_time: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        ip_address: this.sessionData.ipAddress,
        user_agent: this.sessionData.userAgent,
        device_info: this.sessionData.deviceInfo,
        is_active: true,
        page_views: 0,
        actions_count: 0,
        errors_count: 0
      });

      if (error) {
        console.error('Failed to log session start:', error);
      }
    } catch (error) {
      console.error('Error logging session start:', error);
    }
  }

  // Log click events
  async logClick(element: HTMLElement, event: MouseEvent) {
    if (!this.shouldLog() || !this.sessionData) return;

    try {
      await supabase.from('gym_click_logs').insert({
        gym_id: this.sessionData.gymId,
        session_id: this.sessionId,
        user_id: this.sessionData.userId,
        element_type: element.tagName.toLowerCase(),
        element_id: element.id || null,
        element_class: element.className || null,
        element_text: element.textContent?.slice(0, 100) || null,
        element_name: element.getAttribute('name') || element.getAttribute('data-name') || null,
        page_path: window.location.pathname,
        page_title: document.title,
        x_position: Math.round(event.clientX),
        y_position: Math.round(event.clientY),
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        metadata: {
          href: element.getAttribute('href'),
          role: element.getAttribute('role'),
          ariaLabel: element.getAttribute('aria-label')
        }
      });
    } catch (error) {
      console.error('Failed to log click:', error);
    }
  }

  // Log navigation events  
  async logNavigationEvent(fromPath: string, toPath: string, navigationType: string = 'push') {
    if (!this.shouldLog() || !this.sessionData) return;

    try {
      await supabase.from('gym_navigation_logs').insert({
        gym_id: this.sessionData.gymId,
        session_id: this.sessionId,
        user_id: this.sessionData.userId,
        from_path: fromPath,
        to_path: toPath,
        from_title: document.title,
        to_title: document.title,
        navigation_type: navigationType,
        referrer: document.referrer || null,
        metadata: {
          timestamp: Date.now(),
          historyLength: window.history.length
        }
      });

      // Update page views count in session
      await supabase
        .from('gym_sessions')
        .update({ 
          page_views: supabase.rpc('increment_page_views', { session_id: this.sessionId }),
          last_activity: new Date().toISOString()
        })
        .eq('session_id', this.sessionId);
    } catch (error) {
      console.error('Failed to log navigation:', error);
    }
  }

  // Log errors to dedicated error table
  async logErrorEvent(error: Error, context: Record<string, any> = {}) {
    if (!this.shouldLog() || !this.sessionData) return;

    try {
      await supabase.from('gym_error_logs').insert({
        gym_id: this.sessionData.gymId,
        session_id: this.sessionId,
        user_id: this.sessionData.userId,
        error_type: error.name || 'Error',
        error_message: error.message,
        error_stack: error.stack,
        component_name: context.componentName || null,
        page_path: window.location.pathname,
        user_action: context.userAction || null,
        browser_info: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform
        },
        is_handled: context.isHandled || false,
        severity: context.severity || 'medium',
        metadata: this.sanitizeValues(context)
      });

      // Also log to main error tracking
      this.logError(error, context);
    } catch (err) {
      console.error('Failed to log error event:', err);
    }
  }

  // Log performance metrics
  async logPerformanceMetric(metricType: string, metricName: string, value: number, unit: string = 'ms') {
    if (!this.shouldLog() || !this.sessionData) return;

    try {
      await supabase.from('gym_performance_logs').insert({
        gym_id: this.sessionData.gymId,
        session_id: this.sessionId,
        user_id: this.sessionData.userId,
        metric_type: metricType,
        metric_name: metricName,
        metric_value: value,
        unit,
        page_path: window.location.pathname,
        metadata: {
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to log performance metric:', error);
    }
  }

  // Public API methods
  logUserInteraction(action: string, details: any = {}) {
    if (!this.shouldLog()) return;

    this.log({
      eventType: 'user_interaction',
      eventCategory: 'user_action',
      action,
      ...details
    });
  }

  logNavigation(path: string, details: any = {}) {
    if (!this.shouldLog()) return;

    this.log({
      eventType: 'user_interaction',
      eventCategory: 'navigation',
      action: 'page_navigation',
      resourceType: 'route',
      resourceId: path,
      metadata: {
        path,
        ...details
      }
    });
  }

  logFormSubmit(formName: string, data: any, details: any = {}) {
    if (!this.shouldLog()) return;

    this.log({
      eventType: 'user_interaction',
      eventCategory: 'form_submit',
      action: `${formName}_submit`,
      resourceType: 'form',
      resourceId: formName,
      newValues: data,
      metadata: {
        formName,
        ...details
      }
    });
  }

  logApiCall(entry: ApiLogEntry) {
    if (!this.shouldLog()) return;

    this.apiQueue.push(entry);

    // Process immediately for errors
    if (!entry.success) {
      this.flushApiQueue();
    }
  }

  logError(error: Error, context: any = {}) {
    if (!this.shouldLog()) return;

    this.log({
      eventType: 'error',
      eventCategory: 'error',
      action: error.message,
      error,
      success: false,
      metadata: {
        stack: error.stack,
        ...context
      }
    });
  }

  logPerformance(name: string, duration: number, details: any = {}) {
    if (!this.shouldLog()) return;

    this.log({
      eventType: 'performance',
      eventCategory: 'performance',
      action: name,
      duration,
      metadata: details
    });
  }

  logAuth(action: string, details: any = {}) {
    if (!this.shouldLog()) return;

    this.log({
      eventType: 'system_event',
      eventCategory: 'auth',
      action,
      metadata: details
    });
  }

  private log(entry: LogEntry) {
    // Add timestamp if not provided
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }

    this.queue.push(entry);

    // Update session activity
    this.updateSessionActivity();
  }

  private async updateSessionActivity() {
    if (!this.sessionData || !this.shouldLog()) return;

    try {
      const { error } = await supabase
        .from('gym_sessions')
        .update({
          last_activity: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.sessionId);

      if (error) {
        console.error('Failed to update session activity:', error);
      }
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  // Update user ID when user logs in
  setUserId(userId: string) {
    if (this.sessionData) {
      this.sessionData.userId = userId;
    }
  }

  // Force flush all queues (call this on page unload)
  async flushAll() {
    await this.flushQueues();
    if (this.batchProcessorInterval) {
      clearInterval(this.batchProcessorInterval);
      this.batchProcessorInterval = null;
    }
  }

  // Get current session ID
  getSessionId(): string {
    return this.sessionId;
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();

// Export function to create logged Supabase client
export function createLoggedSupabaseClient() {
  const { supabase } = require('./supabase');

  return {
    ...supabase,
    from: (table: string) => {
      const originalFrom = supabase.from(table);

      return new Proxy(originalFrom, {
        get(target, prop) {
          const originalMethod = target[prop as keyof typeof target];

          if (typeof originalMethod === 'function') {
            return async (...args: any[]) => {
              const startTime = performance.now();
              const action = `${table}.${prop.toString()}`;

              try {
                const result = await originalMethod.apply(target, args);
                const duration = performance.now() - startTime;

                debugLogger.logApiCall({
                  method: prop.toString().toUpperCase(),
                  endpoint: table,
                  requestHeaders: {}, // You might want to capture headers
                  requestBody: args[0],
                  responseStatus: result.error ? null : 200,
                  responseHeaders: {},
                  responseBody: result.data,
                  duration,
                  success: !result.error
                });

                return result;
              } catch (error) {
                const duration = performance.now() - startTime;

                debugLogger.logApiCall({
                  method: prop.toString().toUpperCase(),
                  endpoint: table,
                  requestHeaders: {},
                  requestBody: args[0],
                  responseStatus: 500,
                  responseHeaders: {},
                  responseBody: null,
                  duration,
                  success: false,
                  error: error as Error
                });

                throw error;
              }
            };
          }

          return originalMethod;
        }
      });
    }
  };
}