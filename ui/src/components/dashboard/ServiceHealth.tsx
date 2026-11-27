import { cn } from '../../lib/cn';
import type { ServiceNode } from '../../types/security';
import { EmptyState } from '../ui/EmptyState';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface ServiceHealthProps {
  services: ServiceNode[];
  activeServiceFilter: string | null;
  onSelectService: (service: ServiceNode) => void;
  loading?: boolean;
}

export function ServiceHealth({
  services,
  activeServiceFilter,
  onSelectService,
  loading = false,
}: ServiceHealthProps) {
  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Service Health"
        subtitle="Simulated service nodes monitored in Organizer Sandbox."
        badge={<StatusBadge tone="neutral">Simulated</StatusBadge>}
      />

      {loading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="h-10 animate-pulse rounded border border-[#27272A] bg-[#090A0B]"
            />
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState title="No service nodes match your search" compact />
      ) : (
        <ul className="mt-3 divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B]">
          {services.map((svc) => {
            const isHealthy = svc.health === 'Healthy';
            const isFiltered = activeServiceFilter === svc.name;
            return (
              <li key={svc.id}>
                <button
                  type="button"
                  onClick={() => onSelectService(svc)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors',
                    isFiltered ? 'bg-[#19191C]' : 'hover:bg-[#141517]',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        isHealthy ? 'bg-green-400' : 'bg-amber-400',
                      )}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-[#F4F4F5]">{svc.name}</div>
                      <div className="truncate text-[10px] text-[#71717A]">{svc.role}</div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                      {svc.lastActivity}
                    </span>
                    <StatusBadge tone={isHealthy ? 'success' : 'warning'}>
                      {svc.health}
                    </StatusBadge>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
