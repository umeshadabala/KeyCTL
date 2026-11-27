import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ToastItem, ToastOptions, ToastVariant } from '../components/toast/toast.types';

export interface ToastContextValue {
  toasts: ToastItem[];
  notify: (type: ToastVariant, title: string, description?: string, options?: ToastOptions) => string;
  success: (title: string, description?: string, options?: ToastOptions) => string;
  error: (title: string, description?: string, options?: ToastOptions) => string;
  warning: (title: string, description?: string, options?: ToastOptions) => string;
  info: (title: string, description?: string, options?: ToastOptions) => string;
  security: (title: string, description?: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATIONS: Record<ToastVariant, number | null> = {
  success: 3500,
  info: 4000,
  warning: 6000,
  error: 7000,
  security: null,
};

const MAX_VISIBLE_TOASTS = 5;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const notify = useCallback(
    (type: ToastVariant, title: string, description?: string, options?: ToastOptions): string => {
      const dedupeKey = options?.dedupeKey ?? `${type}:${title}:${description ?? ''}`;
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = options?.duration !== undefined ? options.duration : DEFAULT_DURATIONS[type];

      setToasts((prev) => {
        if (prev.some((t) => t.dedupeKey === dedupeKey)) {
          return prev;
        }
        const next: ToastItem = {
          id,
          type,
          title,
          description,
          createdAt: new Date().toISOString(),
          duration,
          action: options?.action,
          dedupeKey,
        };
        return [...prev, next].slice(-MAX_VISIBLE_TOASTS);
      });
      return id;
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      notify,
      success: (title, description, options) => notify('success', title, description, options),
      error: (title, description, options) => notify('error', title, description, options),
      warning: (title, description, options) => notify('warning', title, description, options),
      info: (title, description, options) => notify('info', title, description, options),
      security: (title, description, options) => notify('security', title, description, options),
      dismiss,
      dismissAll,
    }),
    [toasts, notify, dismiss, dismissAll],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
