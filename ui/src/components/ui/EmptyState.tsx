import { FilterX } from 'lucide-react';
import type { ComponentType } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ComponentType<{ className?: string }>;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon = FilterX,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded border border-dashed border-[#27272A] bg-[#090A0B] px-4 text-center ${
        compact ? 'mt-3 py-8' : 'mt-4 py-10'
      }`}
    >
      <Icon className="h-5 w-5 text-[#71717A]" />
      <p className="mt-2.5 text-xs font-medium text-[#F4F4F5]">{title}</p>
      {description && <p className="mt-1 text-[11px] text-[#71717A]">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded border border-[#27272A] bg-[#19191C] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] transition-colors hover:border-[#3F3F46]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
