import { Laptop, RefreshCw, Server, ShieldAlert, Users } from 'lucide-react';
import { useMemo } from 'react';
import { ActivityChart } from '../components/dashboard/ActivityChart';
import { AlertList } from '../components/dashboard/AlertList';
import { EventFeed } from '../components/dashboard/EventFeed';
import { MetricCard } from '../components/dashboard/MetricCard';
import { SecurityPosture } from '../components/dashboard/SecurityPosture';
import { ServiceHealth } from '../components/dashboard/ServiceHealth';
import { StatusBadge } from '../components/ui/StatusBadge';
import { OVERVIEW_METRICS } from '../data/mockDashboardData';
import type { InspectionTarget } from '../hooks/useSandboxState';
import { cn } from '../lib/cn';
import {
  filterSecurityAlerts,
  filterSecurityEvents,
  filterServiceNodes,
} from '../lib/telemetryFilters';
import type {
  EventCategory,
  NavPageId,
  SecurityAlert,
  SecurityEvent,
  ServiceNode,
} from '../types/security';

interface OverviewPageProps {
  searchQuery: string;
  onClearSearch: () => void;
  eventCategoryFilter: 'all' | EventCategory;
  onEventCategoryChange: (cat: 'all' | EventCategory) => void;
  serviceFilter: string | null;
  onClearServiceFilter: () => void;
  activityRange: '24h' | '7d';
  onActivityRangeChange: (range: '24h' | '7d') => void;
  events: SecurityEvent[];
  services: ServiceNode[];
  alerts: SecurityAlert[];
  unacknowledgedAlertCount: number;
  onToggleAlertAcknowledge: (id: string) => void;
  isRefreshing: boolean;
  lastSyncedLabel: string;
  onTriggerRefresh: () => void;
  selectedInspection: InspectionTarget;
  onSelectInspection: (target: InspectionTarget) => void;
  onNavigate: (page: NavPageId) => void;
}

const METRIC_ICONS = {
  'active-identities': Users,
  'registered-devices': Laptop,
  'active-alerts': ShieldAlert,
  'service-nodes': Server,
} as const;

export function OverviewPage({
  searchQuery,
  onClearSearch,
  eventCategoryFilter,
  onEventCategoryChange,
  serviceFilter,
  onClearServiceFilter,
  activityRange,
  onActivityRangeChange,
  events,
  services,
  alerts,
  unacknowledgedAlertCount,
  onToggleAlertAcknowledge,
  isRefreshing,
  lastSyncedLabel,
  onTriggerRefresh,
  selectedInspection,
  onSelectInspection,
  onNavigate,
}: OverviewPageProps) {
  const filteredEvents = useMemo(
    () =>
      filterSecurityEvents(events, {
        category: eventCategoryFilter,
        serviceFilter,
        query: searchQuery,
      }),
    [events, eventCategoryFilter, serviceFilter, searchQuery],
  );

  const filteredAlerts = useMemo(
    () => filterSecurityAlerts(alerts, searchQuery),
    [alerts, searchQuery],
  );

  const filteredServices = useMemo(
    () => filterServiceNodes(services, searchQuery),
    [services, searchQuery],
  );

  const handleClearAllFilters = () => {
    onEventCategoryChange('all');
    onClearServiceFilter();
    onClearSearch();
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-md border border-[#27272A] bg-[#141517] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight text-[#F4F4F5] sm:text-lg">
              Security Overview
            </h1>
            <StatusBadge tone="success" dot>
              System Health: Nominal (Simulated)
            </StatusBadge>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Monitor identity trust, cryptographic state, access activity, and system integrity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded border border-[#27272A] bg-[#090A0B] px-2.5 py-1.5 text-xs">
            <span className="text-[#71717A]">Environment: </span>
            <span className="font-medium text-[#F4F4F5]">Organizer Sandbox</span>
          </div>

          <button
            type="button"
            onClick={onTriggerRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded border border-[#27272A] bg-[#19191C] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] transition-colors hover:border-[#3F3F46] disabled:opacity-60"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 text-[#A1A1AA]', isRefreshing && 'animate-spin')} />
            <span>{isRefreshing ? 'Syncing...' : 'Simulate Sync'}</span>
          </button>
        </div>
      </section>

      <section
        aria-label="Key security metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {OVERVIEW_METRICS.map((metric) => {
          const Icon = METRIC_ICONS[metric.id as keyof typeof METRIC_ICONS] ?? Server;
          const dynamicValue =
            metric.id === 'active-alerts'
              ? String(unacknowledgedAlertCount).padStart(2, '0')
              : metric.value;

          return (
            <MetricCard
              key={metric.id}
              metric={metric}
              displayValue={dynamicValue}
              icon={Icon}
              loading={isRefreshing}
              onClick={() => onNavigate(metric.targetPage)}
            />
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <ActivityChart
            range={activityRange}
            onRangeChange={onActivityRangeChange}
            loading={isRefreshing}
          />

          <EventFeed
            events={filteredEvents}
            categoryFilter={eventCategoryFilter}
            onCategoryChange={onEventCategoryChange}
            serviceFilter={serviceFilter}
            onClearServiceFilter={onClearServiceFilter}
            searchQuery={searchQuery}
            onClearAllFilters={handleClearAllFilters}
            onSelectEvent={(event) => onSelectInspection({ kind: 'event', item: event })}
            selectedEventId={
              selectedInspection?.kind === 'event' ? selectedInspection.item.id : undefined
            }
            loading={isRefreshing}
          />
        </div>

        <div className="space-y-5 xl:col-span-4">
          <SecurityPosture />

          <AlertList
            alerts={filteredAlerts}
            onSelectAlert={(alert) => onSelectInspection({ kind: 'alert', item: alert })}
            onToggleAcknowledge={onToggleAlertAcknowledge}
            loading={isRefreshing}
          />

          <ServiceHealth
            services={filteredServices}
            activeServiceFilter={serviceFilter}
            onSelectService={(service) => onSelectInspection({ kind: 'service', item: service })}
            loading={isRefreshing}
          />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#27272A] pt-3 text-[11px] text-[#71717A]">
        <span>KeyCtl — Identity. Integrity. Zero Blind Trust.</span>
        <span className="font-mono">{lastSyncedLabel}</span>
      </footer>
    </div>
  );
}
