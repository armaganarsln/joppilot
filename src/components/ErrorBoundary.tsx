import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-time errors anywhere in the tree and shows a recoverable
 * fallback instead of a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Declared explicitly because this project has no React type definitions
  // installed (React resolves to `any`), so inherited props/state typing is
  // not available from the base class.
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-joppli-light flex flex-col justify-center items-center font-sans p-6">
        <div className="bg-white border border-joppli-grey rounded-2xl shadow-sm max-w-md w-full p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-joppli-red/10 flex items-center justify-center text-joppli-red mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-joppli-dark uppercase">
            Terminal Encountered an Error
          </h2>
          <p className="mt-3 text-sm text-joppli-dark/60 font-medium leading-relaxed">
            The interface hit an unexpected problem. Your fleet data is safe — reloading the
            terminal usually resolves it.
          </p>
          {this.state.error?.message && (
            <pre className="mt-4 w-full text-left text-[11px] font-mono text-joppli-dark/50 bg-joppli-light border border-joppli-grey/80 rounded-xl p-3 overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-joppli-dark text-white hover:bg-joppli-blue px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
          >
            Reload Terminal
          </button>
        </div>
      </div>
    );
  }
}
