import { useEffect, useRef, useCallback } from 'react';
import { debugLogger } from '../lib/debugLogger';

interface DebugLoggerOptions {
  logRenders?: boolean;
  logInteractions?: boolean;
  logErrors?: boolean;
}

interface InteractionDetails {
  element?: string;
  component?: string;
  [key: string]: any;
}

export function useDebugLogger(
  componentName: string,
  options: DebugLoggerOptions = { logRenders: false, logInteractions: true, logErrors: true }
) {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());
  const isDevelopment = import.meta.env.DEV;

  // Log component renders if enabled
  useEffect(() => {
    if (!isDevelopment || !options.logRenders) return;

    renderCount.current += 1;
    const currentTime = Date.now();
    const timeSinceMount = currentTime - mountTime.current;

    debugLogger.logPerformance(`${componentName}_render`, timeSinceMount, {
      renderCount: renderCount.current,
      component: componentName,
      timeSinceMount
    });
  });

  // Log component unmount
  useEffect(() => {
    return () => {
      if (!isDevelopment || !options.logRenders) return;

      const totalTime = Date.now() - mountTime.current;
      debugLogger.logPerformance(`${componentName}_unmount`, totalTime, {
        totalRenderTime: totalTime,
        renderCount: renderCount.current,
        component: componentName
      });
    };
  }, []);

  // Log user interactions
  const logInteraction = useCallback((action: string, details: InteractionDetails = {}) => {
    if (!isDevelopment || !options.logInteractions) return;

    debugLogger.logUserInteraction(`${componentName}_${action}`, {
      component: componentName,
      ...details
    });
  }, [componentName, isDevelopment, options.logInteractions]);

  // Log form submissions
  const logFormSubmit = useCallback((formName: string, data: any, details: InteractionDetails = {}) => {
    if (!isDevelopment || !options.logInteractions) return;

    debugLogger.logFormSubmit(formName, data, {
      component: componentName,
      ...details
    });
  }, [componentName, isDevelopment, options.logInteractions]);

  // Log navigation
  const logNavigation = useCallback((path: string, details: InteractionDetails = {}) => {
    if (!isDevelopment || !options.logInteractions) return;

    debugLogger.logNavigation(path, {
      component: componentName,
      ...details
    });
  }, [componentName, isDevelopment, options.logInteractions]);

  // Log errors
  const logError = useCallback((error: Error, details: InteractionDetails = {}) => {
    if (!isDevelopment || !options.logErrors) return;

    debugLogger.logError(error, {
      component: componentName,
      ...details
    });
  }, [componentName, isDevelopment, options.logErrors]);

  // Log performance metrics
  const logPerformance = useCallback((name: string, duration: number, details: InteractionDetails = {}) => {
    if (!isDevelopment) return;

    debugLogger.logPerformance(`${componentName}_${name}`, duration, {
      component: componentName,
      ...details
    });
  }, [componentName, isDevelopment]);

  // Log API calls
  const logApiCall = useCallback((apiDetails: {
    method: string;
    endpoint: string;
    request?: any;
    response?: any;
    duration: number;
    success: boolean;
    error?: Error;
  }) => {
    if (!isDevelopment || !options.logInteractions) return;

    debugLogger.logApiCall({
      ...apiDetails,
      metadata: {
        component: componentName
      }
    });
  }, [componentName, isDevelopment, options.logInteractions]);

  return {
    logInteraction,
    logFormSubmit,
    logNavigation,
    logError,
    logPerformance,
    logApiCall,
    renderCount: renderCount.current,
    sessionId: debugLogger.getSessionId()
  };
}

// Hook for global error logging
export function useGlobalErrorLogger() {
  const isDevelopment = import.meta.env.DEV;

  const logGlobalError = useCallback((error: Error, context: any = {}) => {
    if (!isDevelopment) return;

    debugLogger.logError(error, {
      context: 'global',
      ...context
    });
  }, [isDevelopment]);

  return { logGlobalError };
}

// Hook for authentication logging
export function useAuthLogger() {
  const isDevelopment = import.meta.env.DEV;

  const logAuth = useCallback((action: string, details: any = {}) => {
    if (!isDevelopment) return;

    debugLogger.logAuth(action, details);
  }, [isDevelopment]);

  const logLogin = useCallback((user: any, details: any = {}) => {
    if (!isDevelopment) return;

    debugLogger.setUserId(user.id);
    debugLogger.logAuth('login_success', {
      userId: user.id,
      email: user.email,
      ...details
    });
  }, [isDevelopment]);

  const logLogout = useCallback((details: any = {}) => {
    if (!isDevelopment) return;

    debugLogger.logAuth('logout', {
      ...details
    });
    debugLogger.setUserId('');
  }, [isDevelopment]);

  const logAuthError = useCallback((error: Error, details: any = {}) => {
    if (!isDevelopment) return;

    debugLogger.logError(error, {
      context: 'authentication',
      ...details
    });
  }, [isDevelopment]);

  return {
    logAuth,
    logLogin,
    logLogout,
    logAuthError
  };
}

// Hook for page view tracking
export function usePageViewLogger(pageName: string) {
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    if (!isDevelopment) return;

    debugLogger.logNavigation(`page_view_${pageName}`, {
      pageName,
      timestamp: Date.now()
    });
  }, [pageName, isDevelopment]);
}

// Hook for performance monitoring
export function usePerformanceLogger() {
  const isDevelopment = import.meta.env.DEV;

  const measurePerformance = useCallback((name: string, callback: () => void) => {
    if (!isDevelopment) {
      callback();
      return;
    }

    const startTime = performance.now();
    callback();
    const endTime = performance.now();

    debugLogger.logPerformance(name, endTime - startTime, {
      timestamp: Date.now()
    });
  }, [isDevelopment]);

  const markPerformance = useCallback((name: string, details: any = {}) => {
    if (!isDevelopment) return;

    debugLogger.logPerformance(name, 0, {
      ...details,
      timestamp: Date.now()
    });
  }, [isDevelopment]);

  return {
    measurePerformance,
    markPerformance
  };
}

// Hook for network request logging
export function useNetworkLogger() {
  const isDevelopment = import.meta.env.DEV;

  const logFetchRequest = useCallback((url: string, options: RequestInit, response: Response) => {
    if (!isDevelopment) return;

    debugLogger.logApiCall({
      method: options.method || 'GET',
      endpoint: url,
      requestHeaders: options.headers as Record<string, any>,
      requestBody: options.body,
      responseStatus: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      duration: 0, // Would need to measure this externally
      success: response.ok
    });
  }, [isDevelopment]);

  return { logFetchRequest };
}