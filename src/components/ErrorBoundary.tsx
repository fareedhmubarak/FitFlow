import React, { Component, ReactNode } from 'react';
import { debugLogger } from '../lib/debugLogger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo?: React.ErrorInfo; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableDebug?: boolean;
}

export class DebugErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { enableDebug = true, onError } = this.props;

    // Log the error with comprehensive context
    if (enableDebug) {
      debugLogger.logError(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        location: window.location.href,
        userAgent: navigator.userAgent,
        retryCount: this.retryCount,
        localStorageSize: this.getLocalStorageSize(),
        memoryUsage: this.getMemoryUsage(),
        timestamp: new Date().toISOString()
      });
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({ error, errorInfo });
  }

  private getLocalStorageSize(): string {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return `${(total / 1024).toFixed(2)} KB`;
    } catch {
      return 'Unknown';
    }
  }

  private getMemoryUsage(): string | { used: string; total: string; limit: string } {
    try {
      if ('memory' in performance) {
        const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        return {
          used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
        };
      }
      return 'Not available';
    } catch {
      return 'Unknown';
    }
  }

  private handleRetry = () => {
    this.retryCount++;

    if (this.retryCount <= this.maxRetries) {
      debugLogger.logUserInteraction('error_boundary_retry', {
        retryCount: this.retryCount,
        maxRetries: this.maxRetries
      });

      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    } else {
      debugLogger.logError(new Error('Max retries exceeded'), {
        context: 'error_boundary',
        retryCount: this.retryCount
      });
    }
  };

  private handleReload = () => {
    debugLogger.logUserInteraction('error_boundary_reload', {
      reason: 'Manual reload after error',
      retryCount: this.retryCount
    });

    window.location.reload();
  };

  private getDetailedErrorInfo() {
    const { error, errorInfo } = this.state;
    if (!error) return null;

    return {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      localStorageSize: this.getLocalStorageSize(),
      memoryUsage: this.getMemoryUsage(),
      retryCount: this.retryCount
    };
  }

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback: FallbackComponent } = this.props;

    if (hasError && error) {
      const errorData = this.getDetailedErrorInfo();

      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            retry={this.handleRetry}
          />
        );
      }

      return <DefaultErrorFallback error={error} errorData={errorData} retry={this.handleRetry} onReload={this.handleReload} />;
    }

    return children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  errorData?: any;
  retry: () => void;
  onReload: () => void;
}

function DefaultErrorFallback({ error, errorData, retry, onReload }: DefaultErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        {/* Error Icon */}
        <div className="mx-auto mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13 7h7l-1.274-2.5C18.44 2.667 17.478 1 15.938 1H8.062c-1.54 0-2.502 1.667-1.732 2.5L1 21h7l4.066-7.5c.752-.833 2.212-.833 2.964 0z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>

        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          {error.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            onClick={retry}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>

          <button
            onClick={onReload}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Reload Page
          </button>
        </div>

        {/* Toggle Details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
        >
          {showDetails ? 'Hide' : 'Show'} Error Details
        </button>

        {/* Error Details (Dev Only) */}
        {showDetails && import.meta.env.DEV && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Debug Information:</h3>

            {errorData && (
              <div className="space-y-2 text-xs">
                <div>
                  <strong>Error:</strong> {errorData.message}
                </div>

                {errorData.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 p-2 bg-white rounded border border-gray-200 overflow-x-auto text-xs">
                      {errorData.stack}
                    </pre>
                  </div>
                )}

                <div>
                  <strong>Timestamp:</strong> {errorData.timestamp}
                </div>

                <div>
                  <strong>URL:</strong> {errorData.url}
                </div>

                <div>
                  <strong>User Agent:</strong> {errorData.userAgent}
                </div>

                <div>
                  <strong>LocalStorage Size:</strong> {errorData.localStorageSize}
                </div>

                {typeof errorData.memoryUsage === 'object' && (
                  <div>
                    <strong>Memory Usage:</strong>
                    <ul className="mt-1 ml-4 space-y-1">
                      {Object.entries(errorData.memoryUsage).map(([key, value]) => (
                        <li key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <strong>Retry Count:</strong> {errorData.retryCount}
                </div>
              </div>
            )}

            {!import.meta.env.DEV && (
              <p className="text-xs text-gray-600">
                Debug details are only available in development mode.
              </p>
            )}
          </div>
        )}

        {/* Support Info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If this error persists, please contact our support team with the error details above.
          </p>
        </div>
      </div>
    </div>
  );
}

// HOC to wrap components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <DebugErrorBoundary {...options}>
      <Component {...props} />
    </DebugErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook to use error boundary in functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const captureError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    setError(error);

    debugLogger.logError(error, {
      errorInfo,
      capturedBy: 'useErrorBoundary'
    });
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback(() => {
    clearError();
  }, [clearError]);

  return {
    error,
    captureError,
    clearError,
    retry
  };
}

export default DebugErrorBoundary;