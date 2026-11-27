import { useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { filterIdentities } from '../../lib/telemetryFilters';
import type { SyntheticDevice } from '../../types/device';
import type { IdentityStatus, SyntheticIdentity } from '../../types/identity';
import type { StatusTone } from '../../types/security';
import { EmptyState } from '../ui/EmptyState';
import { Search } from '../ui/Search';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface IdentityDirectoryProps {
  identities: SyntheticIdentity[];
  devices: SyntheticDevice[];
  selectedIdentityId?: string;
  onSelectIdentity: (identity: SyntheticIdentity) => void;
}

type IdentityFilter = 'all' | IdentityStatus;

const FILTER_TABS: { id: IdentityFilter; label: string }[] = [
  { id: 'all', label: 'All identities' },
  { id: 'Active', label: 'Active' },
  { id: 'Suspended', label: 'Suspended' },
  { id: 'Elevated risk', label: 'Elevated risk' },
];

const STATUS_TONE: Record<IdentityStatus, StatusTone> = {
  Active: 'success',
  Suspended: 'danger',
  'Elevated risk': 'warning',
};

const TRUST_TONE: Record<SyntheticIdentity['trustStatus'], StatusTone> = {
  Verified: 'success',
  'Review required': 'warning',
  Restricted: 'danger',
};

export function IdentityDirectory({
  identities,
  devices,
  selectedIdentityId,
  onSelectIdentity,
}: IdentityDirectoryProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IdentityFilter>('all');

  const deviceCountByIdentity = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dev of devices) {
      counts[dev.identityId] = (counts[dev.identityId] ?? 0) + 1;
    }
    return counts;
  }, [devices]);

  const filteredIdentities = useMemo(
    () => filterIdentities(identities, { status: statusFilter, query }),
    [identities, statusFilter, query],
  );

  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Identity Directory"
        subtitle="Synthetic human operators, contractors, and service principals in Organizer Sandbox."
        badge={<StatusBadge tone="neutral">Demo data</StatusBadge>}
        actions={
          <div className="w-full sm:w-64">
            <Search
              value={query}
              onChange={setQuery}
              placeholder="Search name, ID, or role..."
              shortcutHint=""
              ariaLabel="Search identities"
            />
          </div>
        }
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] pb-3">
        <div role="tablist" aria-label="Filter identities by status" className="flex flex-wrap gap-1">
          {FILTER_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab.id)}
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
          {filteredIdentities.length} of {identities.length} identities
        </span>
      </div>

      {filteredIdentities.length === 0 ? (
        <EmptyState
          title="No synthetic identities match your search or status filter"
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setStatusFilter('all');
          }}
        />
      ) : (
        <div className="mt-1 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#27272A] text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
                <th className="py-2.5 pr-3">Identity</th>
                <th className="px-3 py-2.5">Identity ID</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-center">Devices</th>
                <th className="px-3 py-2.5">Last Activity</th>
                <th className="py-2.5 pl-3 text-right">Trust Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/70">
              {filteredIdentities.map((ident) => {
                const count = deviceCountByIdentity[ident.id] ?? 0;
                const isSelected = selectedIdentityId === ident.id;
                return (
                  <tr
                    key={ident.id}
                    onClick={() => onSelectIdentity(ident)}
                    className={cn(
                      'cursor-pointer text-xs transition-colors',
                      isSelected ? 'bg-[#19191C]' : 'hover:bg-[#19191C]/60',
                    )}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-[#F4F4F5]">{ident.displayName}</div>
                      <div className="font-mono text-[11px] text-[#71717A]">{ident.handle}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#A1A1AA]">{ident.id}</td>
                    <td className="px-3 py-2.5 text-[#A1A1AA]">
                      <div className="text-[#F4F4F5]">{ident.role}</div>
                      <div className="text-[10px] text-[#71717A]">{ident.identityType}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={STATUS_TONE[ident.status]} dot>
                        {ident.status}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-[11px] text-[#A1A1AA] tabular-nums">
                      {String(count).padStart(2, '0')}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#71717A] tabular-nums">
                      {ident.lastActivity}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <StatusBadge tone={TRUST_TONE[ident.trustStatus]}>
                        {ident.trustStatus}
                      </StatusBadge>
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
