import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center space-y-6 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-9 h-9 text-destructive" />
            </div>

            {/* Text */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went sideways 💀</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The chaos was too much to handle. Don't worry — your drafts are safe.
              </p>
              {this.state.error && (
                <p className="text-xs font-mono text-muted-foreground/60 mt-2 bg-secondary/50 rounded-lg p-2 text-left break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh &amp; Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
