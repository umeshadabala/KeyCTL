export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'security';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  duration?: number | null;
  action?: ToastAction;
  dedupeKey?: string;
}

export interface ToastItem {
  id: string;
  type: ToastVariant;
  title: string;
  description?: string;
  createdAt: string;
  duration: number | null;
  action?: ToastAction;
  dedupeKey: string;
}
