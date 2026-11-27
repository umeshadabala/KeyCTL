import { RotateCcw, ShieldBan, ShieldOff } from 'lucide-react';
import { type DeviceActionKind, canPerformDeviceAction } from '../../lib/sandboxDomain';
import type { SyntheticDevice } from '../../types/device';
import type { SyntheticIdentity } from '../../types/identity';
import type { SecurityEvent, StatusTone } from '../../types/security';
import { StatusBadge } from '../ui/StatusBadge';
import { DetailRow } from './DetailRow';

const DEVICE_TRUST_TONE: Record<SyntheticDevice['trustState'], StatusTone> = {
  Trusted: 'success',
  'Pending verification': 'warning',
  Quarantined: 'warning',
  Revoked: 'danger',
};

export function DeviceInspectionBody({
  device,
  owner,
  events,
  onInspectIdentity,
  onRequestAction,
}: {
  device: SyntheticDevice;
  owner?: SyntheticIdentity;
  events: SecurityEvent[];
  onInspectIdentity: (identity: SyntheticIdentity) => void;
  onRequestAction: (action: DeviceActionKind) => void;
}) {
  const canQuarantine = canPerformDeviceAction(device, 'quarantine');
  const canRestore = canPerformDeviceAction(device, 'restore');
  const canRevoke = canPerformDeviceAction(device, 'revoke');

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={DEVICE_TRUST_TONE[device.trustState]} dot>
            {device.trustState}
          </StatusBadge>
          <StatusBadge tone="neutral">{device.statusLabel}</StatusBadge>
        </div>
        <h3 className="mt-2 text-base font-semibold text-[#F4F4F5]">{device.name}</h3>
        <p className="font-mono text-xs text-[#A1A1AA]">
          {device.id} • {device.deviceType}
        </p>
      </div>

      <div className="rounded border border-[#27272A] bg-[#090A0B] p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#A1A1AA]">
            Simulated Device Actions
          </span>
          <span className="font-mono text-[10px] text-[#71717A]">Sandbox UI only</span>
        </div>

        {device.trustState === 'Revoked' ? (
          <div className="mt-2.5 flex items-center gap-2 rounded border border-red-500/25 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-400">
            <ShieldBan className="h-3.5 w-3.5 shrink-0" />
            <span>
              Device is permanently revoked in sandbox and cannot be restored via a simple
              restore action.
            </span>
          </div>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {canQuarantine && (
              <button
                type="button"
                onClick={() => onRequestAction('quarantine')}
                className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/20"
              >
                <ShieldOff className="h-3.5 w-3.5" />
                <span>Quarantine Device</span>
              </button>
            )}
            {canRestore && (
              <button
                type="button"
                onClick={() => onRequestAction('restore')}
                className="inline-flex items-center gap-1.5 rounded border border-green-500/30 bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore to Trusted</span>
              </button>
            )}
            {canRevoke && (
              <button
                type="button"
                onClick={() => onRequestAction('revoke')}
                className="inline-flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
              >
                <ShieldBan className="h-3.5 w-3.5" />
                <span>Revoke Device</span>
              </button>
            )}
          </div>
        )}
      </div>

      <dl className="divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B] text-xs">
        <DetailRow label="Device ID" value={device.id} mono />
        <DetailRow label="OS / Runtime" value={device.osVersion} />
        <DetailRow label="Registered" value={device.registrationDate} mono />
        <DetailRow label="Last Seen" value={device.lastSeen} mono />
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="shrink-0 text-[#71717A]">Owner Identity</dt>
          <dd className="text-right">
            {owner ? (
              <button
                type="button"
                onClick={() => onInspectIdentity(owner)}
                className="font-mono text-[11px] text-[#F4F4F5] underline-offset-2 hover:underline"
              >
                {owner.displayName} ({owner.id})
              </button>
            ) : (
              <span className="font-mono text-[11px] text-[#A1A1AA]">{device.identityHandle}</span>
            )}
          </dd>
        </div>
      </dl>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
          Associated Services
        </div>
        {device.associatedServices.length === 0 ? (
          <div className="rounded border border-[#27272A] bg-[#090A0B] px-3 py-2.5 text-xs text-[#71717A]">
            No active service associations.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {device.associatedServices.map((svc) => (
              <StatusBadge key={svc} tone="neutral">
                {svc}
              </StatusBadge>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
          Device Lifecycle History
        </div>
        <div className="divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B]">
          {device.lifecycleHistory.map((entry) => (
            <div key={entry.id} className="px-3 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#F4F4F5]">{entry.action}</span>
                <span className="font-mono text-[10px] text-[#71717A]">{entry.timestamp}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-[#A1A1AA]">{entry.note}</div>
              <div className="mt-0.5 font-mono text-[10px] text-[#71717A]">
                Actor: {entry.actor}
              </div>
            </div>
          ))}
        </div>
      </div>

      {events.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
            Related Recent Activity
          </div>
          <div className="divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B]">
            {events.map((evt) => (
              <div key={evt.id} className="px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#F4F4F5]">{evt.description}</span>
                  <span className="font-mono text-[10px] text-[#71717A]">{evt.relativeTime}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-[#71717A]">{evt.service}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
