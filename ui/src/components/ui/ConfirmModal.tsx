import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';
import type { StatusTone } from '../../types/security';
import { StatusBadge } from './StatusBadge';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: Extract<StatusTone, 'warning' | 'danger' | 'success'>;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  warningNote?: string;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}

const CONFIRM_STYLES: Record<Extract<StatusTone, 'warning' | 'danger' | 'success'>, string> = {
  warning: 'border-amber-500/35 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25',
  danger: 'border-red-500/35 bg-red-500/15 text-red-300 hover:bg-red-500/25',
  success: 'border-green-500/35 bg-green-500/15 text-green-300 hover:bg-green-500/25',
};

const ICON_BOX_STYLES: Record<Extract<StatusTone, 'warning' | 'danger' | 'success'>, string> = {
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  danger: 'border-red-500/25 bg-red-500/10 text-red-400',
  success: 'border-green-500/25 bg-green-500/10 text-green-400',
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  tone = 'warning',
  requireReason = false,
  reasonPlaceholder = 'Optional operator note for simulated audit trail...',
  warningNote,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/75" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-md border border-[#27272A] bg-[#141517] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded border',
                ICON_BOX_STYLES[tone],
              )}
            >
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h3 id="confirm-modal-title" className="text-sm font-semibold text-[#F4F4F5]">
                {title}
              </h3>
              <StatusBadge tone="neutral" className="mt-1 text-[10px]">
                Simulated • Local Sandbox Only
              </StatusBadge>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="rounded p-1 text-[#71717A] hover:bg-[#19191C] hover:text-[#F4F4F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#A1A1AA]">{description}</p>

        {warningNote && (
          <div className="mt-3 rounded border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] leading-relaxed text-red-300">
            {warningNote}
          </div>
        )}

        {requireReason && (
          <div className="mt-3">
            <label
              htmlFor="modal-reason-input"
              className="block text-[11px] font-medium text-[#A1A1AA]"
            >
              Operator Note (Simulated)
            </label>
            <input
              id="modal-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="mt-1.5 h-8 w-full rounded-md border border-[#27272A] bg-[#090A0B] px-2.5 text-xs text-[#F4F4F5] placeholder:text-[#71717A] focus:border-[#52525B] focus:outline-none"
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#27272A] bg-[#19191C] px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              CONFIRM_STYLES[tone],
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
