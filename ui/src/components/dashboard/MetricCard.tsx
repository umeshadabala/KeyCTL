import { ArrowUpRight } from 'lucide-react';
import type { ComponentType } from 'react';
import type { SecurityMetric } from '../../types/security';

interface MetricCardProps {
  metric: SecurityMetric;
  displayValue?: string;
  icon: ComponentType<{ className?: string }>;
  loading?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  metric,
  displayValue,
  icon: Icon,
  loading = false,
  onClick,
}: MetricCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col justify-between rounded-md border border-[#27272A] bg-[#141517] p-4 text-left transition-colors hover:border-[#3F3F46] hover:bg-[#19191C] focus:outline-none focus-visible:border-[#52525B]"
    >
      {loading ? (
        <div className="animate-pulse space-y-3 py-0.5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 rounded bg-[#27272A]" />
            <div className="h-6 w-6 rounded bg-[#27272A]" />
          </div>
          <div className="h-7 w-16 rounded bg-[#27272A]" />
          <div className="h-3 w-40 rounded bg-[#19191C]" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium tracking-[0.06em] text-[#A1A1AA]">
              {metric.label}
            </span>
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#71717A] transition-colors group-hover:text-[#A1A1AA]" />
          </div>

          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight text-[#F4F4F5] tabular-nums">
              {displayValue ?? metric.value}
            </span>
            <span className="font-mono text-[10px] text-[#71717A]">{metric.statusTag}</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#27272A]/70 pt-2.5">
            <p className="truncate text-[11px] text-[#71717A]">{metric.description}</p>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#52525B] transition-colors group-hover:text-[#F4F4F5]" />
          </div>
        </>
      )}
    </button>
  );
}
