import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { EventCategory, SecurityEvent } from '../../types/security';
import { EmptyState } from '../ui/EmptyState';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface EventFeedProps {
  events: SecurityEvent[];
  categoryFilter: 'all' | EventCategory;
  onCategoryChange: (cat: 'all' | EventCategory) => void;
  serviceFilter: string | null;
  onClearServiceFilter: () => void;
  searchQuery: string;
  onClearAllFilters: () => void;
  onSelectEvent: (event: SecurityEvent) => void;
  selectedEventId?: string;
  loading?: boolean;
}

const CATEGORY_TABS: { id: 'all' | EventCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'authentication', label: 'Auth' },
  { id: 'access', label: 'Access' },
  { id: 'key_event', label: 'Key events' },
  { id: 'revocation', label: 'Revocations' },
];

export function EventFeed({
  events,
  categoryFilter,
  onCategoryChange,
  serviceFilter,
  onClearServiceFilter,
  searchQuery,
  onClearAllFilters,
  onSelectEvent,
  selectedEventId,
  loading = false,
}: EventFeedProps) {
  const hasFilters = categoryFilter !== 'all' || Boolean(serviceFilter) || Boolean(searchQuery);

  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Security Event Feed"
        subtitle="Recent sandbox telemetry events across identities, devices, and services."
        badge={<StatusBadge tone="neutral">Demo data</StatusBadge>}
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            {serviceFilter && (
              <button
                type="button"
                onClick={onClearServiceFilter}
                className="inline-flex items-center gap-1 rounded border border-[#27272A] bg-[#19191C] px-2 py-1 text-[11px] font-medium text-[#F4F4F5] hover:border-[#3F3F46]"
              >
                <span>Node: {serviceFilter}</span>
                <X className="h-3 w-3 text-[#71717A]" />
              </button>
            )}
          </div>
        }
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] pb-3">
        <div role="tablist" aria-label="Filter events by category" className="flex flex-wrap gap-1">
          {CATEGORY_TABS.map((tab) => {
            const active = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onCategoryChange(tab.id)}
                className={cn(
                  'rounded px-2.5 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'border border-[#27272A] bg-[#19191C] text-[#F4F4F5]'
                    : 'border border-transparent text-[#71717A] hover:text-[#A1A1AA]',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[11px] text-[#71717A] tabular-nums">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="flex h-10 animate-pulse items-center justify-between rounded border border-[#27272A] bg-[#090A0B] px-3"
            >
              <div className="h-3 w-48 rounded bg-[#27272A]" />
              <div className="h-3 w-24 rounded bg-[#27272A]" />
              <div className="h-4 w-16 rounded bg-[#27272A]" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No simulated events match your current filters"
          description="Adjust your category filter or search query to inspect sandbox activity."
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? onClearAllFilters : undefined}
        />
      ) : (
        <div className="mt-1 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#27272A] text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
                <th className="py-2.5 pr-3">Event</th>
                <th className="px-3 py-2.5">Identity</th>
                <th className="px-3 py-2.5">Service</th>
                <th className="px-3 py-2.5">Time</th>
                <th className="py-2.5 pl-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/70">
              {events.map((evt) => {
                const isSelected = selectedEventId === evt.id;
                return (
                  <tr
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className={cn(
                      'cursor-pointer text-xs transition-colors',
                      isSelected ? 'bg-[#19191C]' : 'hover:bg-[#19191C]/60',
                    )}
                  >
                    <td className="py-2.5 pr-3 font-medium text-[#F4F4F5]">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-1.5 w-1.5 shrink-0 rounded-full',
                            evt.severity === 'high' && 'bg-red-400',
                            evt.severity === 'medium' && 'bg-amber-400',
                            (evt.severity === 'low' || evt.severity === 'info') && 'bg-[#71717A]',
                          )}
                        />
                        <span>{evt.description}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#A1A1AA]">
                      {evt.identity}
                    </td>
                    <td className="px-3 py-2.5 text-[#A1A1AA]">{evt.service}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#71717A] tabular-nums">
                      {evt.relativeTime}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <span
                        className={cn(
                          'font-mono text-[11px]',
                          evt.severity === 'high' && 'text-red-400',
                          evt.severity === 'medium' && 'text-amber-400',
                          (evt.severity === 'low' || evt.severity === 'info') && 'text-[#A1A1AA]',
                        )}
                      >
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
