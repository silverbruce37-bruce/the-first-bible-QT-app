import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center text-slate-300 p-4">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-red-400 mb-4">앱 오류 발생</h1>
            <p className="mb-6">애플리케이션에서 오류가 발생했습니다. 페이지를 새로고침해 주세요.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
            >
              새로고침
            </button>
            {this.state.error && (
              <details className="mt-4 text-left text-xs text-slate-400">
                <summary className="cursor-pointer mb-2">오류 세부사항</summary>
                <pre className="bg-slate-800 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;