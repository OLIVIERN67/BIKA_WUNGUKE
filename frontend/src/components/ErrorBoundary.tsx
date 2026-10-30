import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time errors anywhere in the tree so a single broken component
 * shows a recoverable fallback instead of a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ui] render error caught by ErrorBoundary', error, info.componentStack);
  }

  private reload = () => {
    window.location.assign('/dashboard');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{i18n.t('errorBoundary.title')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {i18n.t('errorBoundary.body')}
          </p>
          <button onClick={this.reload} className="btn-primary mt-6 w-full">
            <RefreshCw className="h-4 w-4" /> {i18n.t('errorBoundary.reload')}
          </button>
        </div>
      </div>
    );
  }
}
