import { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import type { ToastItem, ToastVariant } from './toast.types';

const VARIANT_STYLES: Record<ToastVariant, { border: string; iconColor: string; Icon: typeof Info }> = {
  success: { border: 'border-emerald-500/40', iconColor: 'text-emerald-400', Icon: CheckCircle2 },
  error: { border: 'border-red-500/40', iconColor: 'text-red-400', Icon: AlertCircle },
  warning: { border: 'border-amber-500/40', iconColor: 'text-amber-400', Icon: AlertTriangle },
  info: { border: 'border-sky-500/40', iconColor: 'text-sky-400', Icon: Info },
  security: { border: 'border-rose-500/60', iconColor: 'text-rose-400', Icon: ShieldAlert },
};

export function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const { border, iconColor, Icon } = VARIANT_STYLES[toast.type];

  useEffect(() => {
    if (toast.duration === null || paused) return;
    timerRef.current = window.setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [toast.id, toast.duration, paused, onDismiss]);

  const isUrgent = toast.type === 'error' || toast.type === 'security';

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border ${border} bg-[#141517] p-3.5 text-[#F4F4F5] shadow-lg transition-all`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-[#F4F4F5]">{toast.title}</div>
        {toast.description && <div className="mt-0.5 text-xs text-[#A1A1AA]">{toast.description}</div>}
        {toast.action && (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-medium text-emerald-400 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="rounded p-0.5 text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
