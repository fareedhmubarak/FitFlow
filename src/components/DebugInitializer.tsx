import React, { useEffect } from 'react';
import { debugLogger } from '../lib/debugLogger';

interface DebugInitializerProps {
  children: React.ReactNode;
}

function DebugInitializer({ children }: DebugInitializerProps) {
  useEffect(() => {
    // Initialize debug system on app start
    if (import.meta.env.DEV) {
      debugLogger.initializeSession({
        userAgent: navigator.userAgent,
        startTime: new Date().toISOString(),
        developmentMode: true
      });

      // Log app startup
      debugLogger.logUserInteraction('app_startup', {
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      // Set up global click handler
      const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target) {
          // Only log meaningful clicks (buttons, links, inputs, etc.)
          const clickableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'];
          const isClickable = clickableElements.includes(target.tagName) || 
                              target.closest('button') || 
                              target.closest('a') ||
                              target.getAttribute('role') === 'button' ||
                              target.getAttribute('onclick') ||
                              target.classList.contains('cursor-pointer');
          
          if (isClickable) {
            debugLogger.logClick(target, event);
          }
        }
      };

      // Set up global error handlers
      const handleError = (event: ErrorEvent) => {
        debugLogger.logErrorEvent(event.error || new Error(event.message), {
          context: 'global_error_handler',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message,
          isHandled: false,
          severity: 'high'
        });
      };

      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        debugLogger.logErrorEvent(new Error(String(event.reason)), {
          context: 'unhandled_promise_rejection',
          isHandled: false,
          severity: 'high'
        });
      };

      // Track performance metrics
      const trackPerformance = () => {
        if (window.performance) {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            debugLogger.logPerformanceMetric('page_load', 'dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.startTime);
            debugLogger.logPerformanceMetric('page_load', 'load_complete', navigation.loadEventEnd - navigation.startTime);
            debugLogger.logPerformanceMetric('page_load', 'first_byte', navigation.responseStart - navigation.requestStart);
          }
        }
      };

      document.addEventListener('click', handleClick, true);
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('load', trackPerformance);

      // Cleanup on unmount
      return () => {
        document.removeEventListener('click', handleClick, true);
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('load', trackPerformance);

        // End session
        debugLogger.logUserInteraction('app_shutdown', {
          timestamp: Date.now()
        });
      };
    }
  }, []);

  return <>{children}</>;
}

export default DebugInitializer;