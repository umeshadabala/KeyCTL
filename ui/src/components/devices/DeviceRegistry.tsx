import { RotateCcw, ShieldBan, ShieldOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { type DeviceActionKind, canPerformDeviceAction } from '../../lib/sandboxDomain';
import { filterDevices } from '../../lib/telemetryFilters';
import type { DeviceTrustState, SyntheticDevice } from '../../types/device';
import type { StatusTone } from '../../types/security';
import { EmptyState } from '../ui/EmptyState';
import { Search } from '../ui/Search';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface DeviceRegistryProps {
  devices: SyntheticDevice[];
  selectedDeviceId?: string;
  onSelectDevice: (device: SyntheticDevice) => void;
  onRequestDeviceAction: (action: DeviceActionKind, device: SyntheticDevice) => void;
}

type DeviceFilter = 'all' | DeviceTrustState;

const FILTER_TABS: { id: DeviceFilter; label: string }[] = [
  { id: 'all', label: 'All devices' },
  { id: 'Trusted', label: 'Trusted' },
  { id: 'Pending verification', label: 'Pending verification' },
  { id: 'Quarantined', label: 'Quarantined' },
  { id: 'Revoked', label: 'Revoked' },
];

const TRUST_TONE: Record<DeviceTrustState, StatusTone> = {
  Trusted: 'success',
  'Pending verification': 'warning',
  Quarantined: 'warning',
  Revoked: 'danger',
};

export function DeviceRegistry({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onRequestDeviceAction,
}: DeviceRegistryProps) {
  const [query, setQuery] = useState('');
  const [trustFilter, setTrustFilter] = useState<DeviceFilter>('all');

  const filteredDevices = useMemo(
    () => filterDevices(devices, { trustState: trustFilter, query }),
    [devices, trustFilter, query],
  );

  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Device Registry"
        subtitle="Synthetic endpoints and virtual nodes with simulated quarantine and revocation controls."
        badge={<StatusBadge tone="neutral">Simulated Controls</StatusBadge>}
        actions={
          <div className="w-full sm:w-64">
            <Search
              value={query}
              onChange={setQuery}
              placeholder="Search device, ID, or owner..."
              shortcutHint=""
              ariaLabel="Search devices"
            />
          </div>
        }
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#27272A] pb-3">
        <div role="tablist" aria-label="Filter devices by trust state" className="flex flex-wrap gap-1">
          {FILTER_TABS.map((tab) => {
            const active = trustFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTrustFilter(tab.id)}
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
          {filteredDevices.length} of {devices.length} devices
        </span>
      </div>

      {filteredDevices.length === 0 ? (
        <EmptyState
          title="No sandbox devices match your search or trust filter"
          actionLabel="Clear filters"
          onAction={() => {
            setQuery('');
            setTrustFilter('all');
          }}
        />
      ) : (
        <div className="mt-1 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#27272A] text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
                <th className="py-2.5 pr-3">Device</th>
                <th className="px-3 py-2.5">Associated Identity</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Registered</th>
                <th className="px-3 py-2.5">Last Seen</th>
                <th className="px-3 py-2.5">Trust State</th>
                <th className="py-2.5 pl-3 text-right">Simulated Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]/70">
              {filteredDevices.map((dev) => {
                const isSelected = selectedDeviceId === dev.id;
                const canQuarantine = canPerformDeviceAction(dev, 'quarantine');
                const canRestore = canPerformDeviceAction(dev, 'restore');
                const canRevoke = canPerformDeviceAction(dev, 'revoke');

                return (
                  <tr
                    key={dev.id}
                    onClick={() => onSelectDevice(dev)}
                    className={cn(
                      'cursor-pointer text-xs transition-colors',
                      isSelected ? 'bg-[#19191C]' : 'hover:bg-[#19191C]/60',
                    )}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-[#F4F4F5]">{dev.name}</div>
                      <div className="font-mono text-[11px] text-[#71717A]">{dev.id}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#A1A1AA]">
                      {dev.identityHandle}
                    </td>
                    <td className="px-3 py-2.5 text-[#A1A1AA]">
                      <div className="text-[#F4F4F5]">{dev.deviceType}</div>
                      <div className="text-[10px] text-[#71717A]">{dev.osVersion}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#71717A] tabular-nums">
                      {dev.registrationDate}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#71717A] tabular-nums">
                      {dev.lastSeen}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={TRUST_TONE[dev.trustState]} dot>
                        {dev.trustState}
                      </StatusBadge>
                    </td>
                    <td
                      className="py-2.5 pl-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {dev.trustState === 'Revoked' ? (
                        <span className="font-mono text-[10px] text-[#71717A]">
                          Locked (Revoked)
                        </span>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {canQuarantine && (
                            <button
                              type="button"
                              onClick={() => onRequestDeviceAction('quarantine', dev)}
                              title="Quarantine device (Simulated)"
                              className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/20"
                            >
                              <ShieldOff className="h-3 w-3" />
                              <span>Quarantine</span>
                            </button>
                          )}
                          {canRestore && (
                            <button
                              type="button"
                              onClick={() => onRequestDeviceAction('restore', dev)}
                              title="Restore device to Trusted (Simulated)"
                              className="inline-flex items-center gap-1 rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-[11px] font-medium text-green-400 hover:bg-green-500/20"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Restore</span>
                            </button>
                          )}
                          {canRevoke && (
                            <button
                              type="button"
                              onClick={() => onRequestDeviceAction('revoke', dev)}
                              title="Revoke device permanently in sandbox (Simulated)"
                              className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20"
                            >
                              <ShieldBan className="h-3 w-3" />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      )}
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
