import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import type { StatusTone } from '../../types/security';

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
}

const TONE_STYLES: Record<StatusTone, string> = {
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-[#19191C] text-[#A1A1AA] border-[#27272A]',
};

const DOT_STYLES: Record<StatusTone, string> = {
  success: 'bg-green-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  neutral: 'bg-[#71717A]',
};

export function StatusBadge({
  children,
  tone = 'neutral',
  dot = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap',
        TONE_STYLES[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_STYLES[tone])}
        />
      )}
      {children}
    </span>
  );
}
