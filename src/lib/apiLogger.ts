import { useState, useCallback } from 'react';
import { supabase } from './supabase';
import { debugLogger } from './debugLogger';

// API logging configuration
interface ApiLogConfig {
  logRequests: boolean;
  logResponses: boolean;
  logHeaders: boolean;
  logBody: boolean;
  sanitizeData: boolean;
  excludeEndpoints: string[];
}

const DEFAULT_CONFIG: ApiLogConfig = {
  logRequests: true,
  logResponses: true,
  logHeaders: false, // Headers can contain sensitive info
  logBody: true,
  sanitizeData: true,
  excludeEndpoints: [
    // Exclude health checks and auth token refresh
    '/health',
    '/auth/refresh',
    // Exclude debug logging endpoints to prevent infinite loops
    '/gym_audit_logs',
    '/gym_api_logs',
    '/gym_sessions'
  ]
};

class ApiLogger {
  private config: ApiLogConfig;
  private originalSupabase: any;

  constructor(config: Partial<ApiLogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.originalSupabase = supabase;
  }

  // Check if endpoint should be excluded from logging
  private shouldExcludeEndpoint(endpoint: string): boolean {
    return this.config.excludeEndpoints.some(excluded =>
      endpoint.includes(excluded)
    );
  }

  // Sanitize request/response data
  private sanitizeData(data: any): any {
    if (!this.config.sanitizeData || !data) return data;

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth',
      'credit_card', 'ssn', 'social_security', 'email',
      'phone', 'address', 'personal', 'private',
      'api_key', 'access_token', 'refresh_token'
    ];

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Check if key is sensitive
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Sanitize headers (remove sensitive auth headers)
  private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    if (!this.config.logHeaders) return {};

    const sanitized: Record<string, any> = {};
    const sensitiveHeaders = [
      'authorization', 'api-key', 'x-api-key',
      'cookie', 'set-cookie', 'authentication'
    ];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveHeaders.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Extract endpoint from Supabase query
  private extractEndpoint(table: string, method: string): string {
    return `/rest/v1/${table}`;
  }

  // Create a logged version of a Supabase method
  private createLoggedMethod(originalMethod: any, table: string, methodName: string) {
    return async (...args: any[]) => {
      const startTime = performance.now();
      const endpoint = this.extractEndpoint(table, methodName);

      // Skip logging for excluded endpoints
      if (this.shouldExcludeEndpoint(endpoint)) {
        return originalMethod.apply(this.originalSupabase.from(table), args);
      }

      let requestHeaders: Record<string, any> = {};
      let requestBody: any = args[0] || {};
      let response: any;
      let error: Error | undefined;

      try {
        // Attempt to capture request info
        if (this.config.logRequests) {
          requestHeaders = this.config.logHeaders ? {} : {};
          requestBody = this.config.logBody ? this.sanitizeData(args[0]) : {};
        }

        // Execute the original method
        response = await originalMethod.apply(this.originalSupabase.from(table), args);

        const duration = performance.now() - startTime;
        const success = !response?.error;

        // Log the API call
        if (this.config.logRequests || this.config.logResponses) {
          debugLogger.logApiCall({
            method: methodName.toUpperCase(),
            endpoint,
            requestHeaders: this.config.logHeaders ? this.sanitizeHeaders(requestHeaders) : {},
            requestBody: this.config.logBody ? requestBody : {},
            responseStatus: success ? 200 : (response?.error?.status || 500),
            responseHeaders: this.config.logHeaders ? {} : {},
            responseBody: this.config.logResponses && success ? this.sanitizeData(response?.data || response) : {},
            duration,
            success
          });
        }

        return response;
      } catch (err) {
        error = err as Error;
        const duration = performance.now() - startTime;

        // Log the failed API call
        if (this.config.logRequests) {
          debugLogger.logApiCall({
            method: methodName.toUpperCase(),
            endpoint,
            requestHeaders: this.config.logHeaders ? this.sanitizeHeaders(requestHeaders) : {},
            requestBody: this.config.logBody ? requestBody : {},
            responseStatus: 500,
            responseHeaders: {},
            responseBody: null,
            duration,
            success: false,
            error
          });
        }

        throw error;
      }
    };
  }

  // Create a logged Supabase client
  createLoggedSupabaseClient() {
    return {
      ...this.originalSupabase,
      from: (table: string) => {
        const originalFrom = this.originalSupabase.from(table);

        return new Proxy(originalFrom, {
          get(target, prop) {
            const originalMethod = target[prop as keyof typeof target];

            if (typeof originalMethod === 'function' &&
                ['select', 'insert', 'update', 'delete', 'upsert'].includes(prop.toString())) {
              return this.createLoggedMethod(originalMethod, table, prop.toString());
            }

            return originalMethod;
          }
        });
      }
    };
  }

  // Global fetch interceptor for external API calls
  createLoggedFetch() {
    const originalFetch = window.fetch;
    const self = this; // Capture 'this' reference

    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      const method = init?.method || 'GET';

      // Skip logging for excluded endpoints
      if (self.shouldExcludeEndpoint(url)) {
        return originalFetch(input, init);
      }

      let requestHeaders: Record<string, unknown> = {};
      let requestBody: unknown = {};

      try {
        // Capture request info
        if (init) {
          requestHeaders = self.config.logHeaders ?
            self.sanitizeHeaders(Object.fromEntries(new Headers(init.headers).entries())) :
            {};

          if (init.body && self.config.logBody) {
            try {
              requestBody = JSON.parse(init.body as string);
            } catch {
              requestBody = init.body;
            }
          }
        }

        // Execute the original fetch
        const response = await originalFetch(input, init);
        const duration = performance.now() - startTime;
        const success = response.ok;

        // Capture response info
        let responseHeaders: Record<string, unknown> = {};
        let responseBody: unknown = null;

        if (self.config.logHeaders) {
          responseHeaders = self.sanitizeHeaders(
            Object.fromEntries(response.headers.entries())
          );
        }

        if (self.config.logResponses && success) {
          try {
            const clonedResponse = response.clone();
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
              responseBody = await clonedResponse.json();
            } else if (contentType.includes('text/')) {
              responseBody = await clonedResponse.text();
            }
          } catch {
            // Response body capture failed, but we continue
          }
        }

        // Log the API call
        debugLogger.logApiCall({
          method: method.toUpperCase(),
          endpoint: url,
          requestHeaders: self.config.logHeaders ? requestHeaders : {},
          requestBody: self.config.logBody ? self.sanitizeData(requestBody) : {},
          responseStatus: response.status,
          responseHeaders: self.config.logHeaders ? responseHeaders : {},
          responseBody: self.config.logResponses ? self.sanitizeData(responseBody) : {},
          duration,
          success
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        // Log the failed API call
        debugLogger.logApiCall({
          method: method.toUpperCase(),
          endpoint: url,
          requestHeaders: self.config.logHeaders ? requestHeaders : {},
          requestBody: self.config.logBody ? self.sanitizeData(requestBody) : {},
          responseStatus: 0,
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

  // Setup global fetch interception
  setupGlobalFetch() {
    if (typeof window !== 'undefined' && window.fetch) {
      window.fetch = this.createLoggedFetch();
    }
  }

  // Get logging statistics
  getLoggingStats() {
    return {
      config: this.config,
      excludedEndpoints: this.config.excludeEndpoints,
      isDevelopment: import.meta.env.DEV
    };
  }
}

// Create singleton instance
const apiLogger = new ApiLogger();

// Create logged Supabase client
export const loggedSupabase = apiLogger.createLoggedSupabaseClient();

// Setup global fetch interception
apiLogger.setupGlobalFetch();

// Export for testing and configuration
export { ApiLogger };
export default apiLogger;

// Utility function to create API logger with custom config
export function createApiLogger(config: Partial<ApiLogConfig>) {
  return new ApiLogger(config);
}

// React hook to use API logger
export function useApiLogger(config?: Partial<ApiLogConfig>) {
  const [apiLoggerInstance] = useState(() =>
    config ? createApiLogger(config) : apiLogger
  );

  const logApiCall = useCallback((details: {
    method: string;
    endpoint: string;
    request?: unknown;
    response?: unknown;
    duration: number;
    success: boolean;
    error?: Error;
  }) => {
    debugLogger.logApiCall(details);
  }, []);

  const getStats = useCallback(() => {
    return apiLoggerInstance.getLoggingStats();
  }, [apiLoggerInstance]);

  return {
    logApiCall,
    getStats
  };
}