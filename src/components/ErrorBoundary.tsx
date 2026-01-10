'use client';

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 * Prevents app crashes from propagating
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error reporting service (e.g., Sentry, LogRocket)
      // Example: errorReportingService.captureException(error, { extra: errorInfo });
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl p-8 border border-red-500/30" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Something went wrong</h2>
            <p className="text-sm text-gray-400">An unexpected error occurred</p>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs font-mono text-red-300 break-all">{error.message}</p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer">Stack trace</summary>
                <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-40">{error.stack}</pre>
              </details>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onReset}
            className="w-full py-3 rounded-xl font-semibold bg-[#22C55E] text-white flex items-center justify-center gap-2 hover:bg-[#16a34a] transition-colors"
            style={{ boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-xl font-semibold border border-white/20 text-white flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
