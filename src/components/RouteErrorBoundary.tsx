import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../lib/logger';
import { Terminal, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  routeName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Route-specific Error Boundary Component
 * Provides a terminal-themed error UI consistent with the app design
 * Includes navigation options specific to route-level errors
 */
class RouteErrorBoundaryClass extends Component<Props & { navigate: (path: string) => void }, State> {
  constructor(props: Props & { navigate: (path: string) => void }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { routeName } = this.props;

    logger.error('Route Error Boundary caught an error', error, {
      route: routeName || 'unknown',
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    this.props.navigate('/');
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { routeName } = this.props;

      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full">
            {/* Terminal Window */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-glow-purple">
              {/* Terminal Header */}
              <div className="bg-gray-800 px-4 py-2 flex items-center space-x-2 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 flex items-center justify-center">
                  <Terminal size={14} className="text-gray-500 mr-2" />
                  <span className="text-xs text-gray-500 font-mono">error.log</span>
                </div>
              </div>

              {/* Terminal Content */}
              <div className="p-6 font-mono">
                <div className="flex items-start space-x-3 mb-4">
                  <span className="text-terminal-pink">$</span>
                  <div className="flex-1">
                    <p className="text-terminal-green mb-2">
                      ERROR: Route rendering failed
                    </p>
                    {routeName && (
                      <p className="text-gray-400 text-sm mb-4">
                        Route: <span className="text-terminal-blue">{routeName}</span>
                      </p>
                    )}

                    <div className="bg-gray-950 border border-gray-800 rounded p-4 mb-4">
                      <p className="text-red-400 text-sm mb-2">
                        {this.state.error?.message || 'An unexpected error occurred'}
                      </p>
                      {import.meta.env.DEV && this.state.error && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">
                            Stack Trace (Development)
                          </summary>
                          <pre className="mt-2 text-xs text-red-400 overflow-x-auto whitespace-pre-wrap">
                            {this.state.error.stack}
                          </pre>
                          {this.state.errorInfo?.componentStack && (
                            <pre className="mt-2 text-xs text-orange-400 overflow-x-auto whitespace-pre-wrap border-t border-gray-800 pt-2">
                              Component Stack:{this.state.errorInfo.componentStack}
                            </pre>
                          )}
                        </details>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={this.handleReset}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-terminal-green hover:bg-terminal-green/80 text-gray-900 rounded font-semibold transition-colors"
                      >
                        <RefreshCw size={16} />
                        <span>Try Again</span>
                      </button>
                      <button
                        onClick={this.handleGoHome}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-terminal-green border border-terminal-green/30 rounded font-semibold transition-colors"
                      >
                        <Home size={16} />
                        <span>Go Home</span>
                      </button>
                    </div>

                    <div className="mt-6 p-3 bg-gray-950 border border-gray-800 rounded">
                      <p className="text-xs text-gray-500">
                        <span className="text-terminal-purple">INFO:</span> The error has been logged for investigation.
                        If this persists, please contact support.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component to inject navigate function
 */
export function RouteErrorBoundary(props: Props) {
  const navigate = useNavigate();
  return <RouteErrorBoundaryClass {...props} navigate={navigate} />;
}

/**
 * Higher-order component to wrap route components with RouteErrorBoundary
 */
export function withRouteErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  routeName?: string
): React.ComponentType<P> {
  return function WithRouteErrorBoundaryComponent(props: P) {
    return (
      <RouteErrorBoundary routeName={routeName}>
        <Component {...props} />
      </RouteErrorBoundary>
    );
  };
}
