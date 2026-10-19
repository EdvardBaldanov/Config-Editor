import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ConfigStudio] Uncaught render error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#0f111a] text-white flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#161b22] border border-rose-500/40 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle size={24} />
            </div>

            <h2 className="text-base font-semibold text-gray-100">
              Произошла ошибка интерфейса
            </h2>

            <p className="text-xs text-gray-400 leading-relaxed font-mono bg-black/40 p-3 rounded-lg border border-gray-800 text-left overflow-x-auto max-h-36">
              {this.state.error?.message || 'Неизвестная ошибка рендера'}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
            >
              <RefreshCw size={14} />
              <span>Перезагрузить приложение</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
