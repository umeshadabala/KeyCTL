import { CheckCircle2, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { FeedbackNotice, StatusTone } from '../../types/security';

interface FeedbackBannerProps {
  feedback: FeedbackNotice | null;
  onDismiss: () => void;
}

const BANNER_STYLES: Record<StatusTone, string> = {
  success: 'border-green-500/25 bg-green-500/10 text-green-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  danger: 'border-red-500/25 bg-red-500/10 text-red-300',
  neutral: 'border-[#27272A] bg-[#19191C] text-[#F4F4F5]',
};

export function FeedbackBanner({ feedback, onDismiss }: FeedbackBannerProps) {
  if (!feedback) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-3 rounded border px-3.5 py-2.5 text-xs',
        BANNER_STYLES[feedback.tone],
      )}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>{feedback.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="rounded p-0.5 opacity-75 hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
