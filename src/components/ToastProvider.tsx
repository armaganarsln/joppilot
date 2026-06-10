import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  /** Show a transient toast. Returns the toast id. */
  toast: (message: string, variant?: ToastVariant, durationMs?: number) => number;
  success: (message: string, durationMs?: number) => number;
  error: (message: string, durationMs?: number) => number;
  warning: (message: string, durationMs?: number) => number;
  info: (message: string, durationMs?: number) => number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4000;

const VARIANT_STYLES: Record<ToastVariant, { border: string; icon: ReactNode }> = {
  success: { border: 'border-l-joppli-green', icon: <CheckCircle2 className="w-4 h-4 text-joppli-green" /> },
  error: { border: 'border-l-joppli-red', icon: <XCircle className="w-4 h-4 text-joppli-red" /> },
  warning: { border: 'border-l-joppli-yellow', icon: <AlertTriangle className="w-4 h-4 text-joppli-yellow" /> },
  info: { border: 'border-l-joppli-blue', icon: <Info className="w-4 h-4 text-joppli-blue" /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', durationMs = DEFAULT_DURATION_MS) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs);
      }
      return id;
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    toast,
    success: (m, d) => toast(m, 'success', d),
    error: (m, d) => toast(m, 'error', d),
    warning: (m, d) => toast(m, 'warning', d),
    info: (m, d) => toast(m, 'info', d),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport — fixed, top-right, above everything */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto bg-white border border-joppli-grey border-l-4 ${VARIANT_STYLES[t.variant].border} rounded-xl md-elevation-3 px-4 py-3 flex items-start gap-3 animate-fade-in`}
          >
            <span className="shrink-0 mt-0.5">{VARIANT_STYLES[t.variant].icon}</span>
            <p className="flex-1 text-sm font-semibold text-joppli-dark leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-joppli-dark/30 hover:text-joppli-dark transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-joppli-blue rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Access the toast API. Must be used within <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
