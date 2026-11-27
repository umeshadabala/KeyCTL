import { Laptop, Users } from 'lucide-react';
import { useState } from 'react';
import { DeviceRegistry } from '../components/devices/DeviceRegistry';
import { IdentityDirectory } from '../components/identity/IdentityDirectory';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { FeedbackNotice, InspectionTarget } from '../hooks/useSandboxState';
import { cn } from '../lib/cn';
import type { DeviceActionKind } from '../lib/sandboxDomain';
import type { SyntheticDevice } from '../types/device';
import type { SyntheticIdentity } from '../types/identity';

interface IdentityDevicesPageProps {
  identities: SyntheticIdentity[];
  devices: SyntheticDevice[];
  selectedInspection: InspectionTarget;
  onSelectInspection: (target: InspectionTarget) => void;
  onRequestDeviceAction: (action: DeviceActionKind, device: SyntheticDevice) => void;
  feedback: FeedbackNotice | null;
  onDismissFeedback: () => void;
}

export function IdentityDevicesPage({
  identities,
  devices,
  selectedInspection,
  onSelectInspection,
  onRequestDeviceAction,
  feedback,
  onDismissFeedback,
}: IdentityDevicesPageProps) {
  const [activeTab, setActiveTab] = useState<'identities' | 'devices'>('identities');

  const activeCount = identities.filter((i) => i.status === 'Active').length;
  const elevatedRiskCount = identities.filter((i) => i.status === 'Elevated risk').length;
  const trustedDeviceCount = devices.filter((d) => d.trustState === 'Trusted').length;
  const quarantinedOrRevokedCount = devices.filter(
    (d) => d.trustState === 'Quarantined' || d.trustState === 'Revoked',
  ).length;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-md border border-[#27272A] bg-[#141517] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight text-[#F4F4F5] sm:text-lg">
              Identities & Devices
            </h1>
            <StatusBadge tone="neutral">Organizer Sandbox • Demo Data</StatusBadge>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Inspect synthetic identities, registered endpoints, and simulated device trust actions.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Identity and device views"
          className="inline-flex self-start rounded border border-[#27272A] bg-[#090A0B] p-0.5 sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'identities'}
            onClick={() => setActiveTab('identities')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'identities'
                ? 'bg-[#19191C] text-[#F4F4F5]'
                : 'text-[#71717A] hover:text-[#A1A1AA]',
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Identities ({identities.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'devices'}
            onClick={() => setActiveTab('devices')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'devices'
                ? 'bg-[#19191C] text-[#F4F4F5]'
                : 'text-[#71717A] hover:text-[#A1A1AA]',
            )}
          >
            <Laptop className="h-3.5 w-3.5" />
            <span>Devices ({devices.length})</span>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="IDENTITIES (ACTIVE)" value={`${activeCount} / ${identities.length}`} />
        <SummaryStat
          label="ELEVATED RISK"
          value={String(elevatedRiskCount).padStart(2, '0')}
          tone="warning"
        />
        <SummaryStat
          label="TRUSTED DEVICES"
          value={`${trustedDeviceCount} / ${devices.length}`}
          tone="success"
        />
        <SummaryStat
          label="QUARANTINED / REVOKED"
          value={String(quarantinedOrRevokedCount).padStart(2, '0')}
          tone="danger"
        />
      </div>

      <FeedbackBanner feedback={feedback} onDismiss={onDismissFeedback} />

      {activeTab === 'identities' ? (
        <IdentityDirectory
          identities={identities}
          devices={devices}
          selectedIdentityId={
            selectedInspection?.kind === 'identity' ? selectedInspection.item.id : undefined
          }
          onSelectIdentity={(identity) =>
            onSelectInspection({ kind: 'identity', item: identity })
          }
        />
      ) : (
        <DeviceRegistry
          devices={devices}
          selectedDeviceId={
            selectedInspection?.kind === 'device' ? selectedInspection.item.id : undefined
          }
          onSelectDevice={(device) => onSelectInspection({ kind: 'device', item: device })}
          onRequestDeviceAction={onRequestDeviceAction}
        />
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="rounded-md border border-[#27272A] bg-[#141517] px-3.5 py-3">
      <div className="text-[10px] font-medium tracking-[0.06em] text-[#71717A]">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono text-lg font-semibold tabular-nums',
          tone === 'success' && 'text-green-400',
          tone === 'warning' && 'text-amber-400',
          tone === 'danger' && 'text-red-400',
          tone === 'neutral' && 'text-[#F4F4F5]',
        )}
      >
        {value}
      </div>
    </div>
  );
}
