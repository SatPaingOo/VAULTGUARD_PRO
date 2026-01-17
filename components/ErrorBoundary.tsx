import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020408] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] border border-red-500/30 bg-black/50 shadow-4xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <AlertOctagon size={32} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">
                  SYSTEM_ERROR
                </h1>
                <p className="text-xs md:text-sm font-mono text-white/40 uppercase tracking-wider mt-1">
                  Unexpected Error Occurred
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-sm md:text-base font-mono text-white/70 mb-2">
                  <strong className="text-red-400">Error:</strong> {this.state.error?.message || 'Unknown error'}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-xs font-mono text-white/50 cursor-pointer hover:text-white/70 uppercase">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 p-3 rounded-lg bg-black/40 text-[10px] font-mono text-white/60 overflow-auto max-h-48">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-4 rounded-xl bg-red-500 text-black font-black uppercase tracking-wider text-sm hover:bg-red-400 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Reload Application
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-4 rounded-xl bg-white/10 text-white border-2 border-white/20 font-black uppercase tracking-wider text-sm hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
