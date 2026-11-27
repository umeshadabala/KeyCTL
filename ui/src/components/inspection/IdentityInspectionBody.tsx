import type { PermissionEntry } from '../../types/access';
import type { SyntheticDevice } from '../../types/device';
import type { SyntheticIdentity } from '../../types/identity';
import type { SecurityEvent, StatusTone } from '../../types/security';
import { StatusBadge } from '../ui/StatusBadge';
import { DetailRow } from './DetailRow';

const IDENTITY_STATUS_TONE: Record<SyntheticIdentity['status'], StatusTone> = {
  Active: 'success',
  'Elevated risk': 'warning',
  Suspended: 'danger',
};

const IDENTITY_TRUST_TONE: Record<SyntheticIdentity['trustStatus'], StatusTone> = {
  Verified: 'success',
  'Review required': 'warning',
  Restricted: 'danger',
};

const DEVICE_TRUST_TONE: Record<SyntheticDevice['trustState'], StatusTone> = {
  Trusted: 'success',
  'Pending verification': 'warning',
  Quarantined: 'warning',
  Revoked: 'danger',
};

export function IdentityInspectionBody({
  identity,
  devices,
  events,
  permissions,
  onInspectDevice,
}: {
  identity: SyntheticIdentity;
  devices: SyntheticDevice[];
  events: SecurityEvent[];
  permissions: PermissionEntry[];
  onInspectDevice: (device: SyntheticDevice) => void;
}) {
  const nonDeniedPerms = permissions.filter((p) => p.level !== 'Denied');

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={IDENTITY_STATUS_TONE[identity.status]} dot>
            {identity.status}
          </StatusBadge>
          <StatusBadge tone={IDENTITY_TRUST_TONE[identity.trustStatus]}>
            Trust: {identity.trustStatus}
          </StatusBadge>
          <span className="font-mono text-[11px] text-[#71717A]">{identity.id}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-[#F4F4F5]">{identity.displayName}</h3>
        <p className="font-mono text-xs text-[#A1A1AA]">{identity.handle}</p>
        <p className="mt-1.5 text-xs text-[#71717A]">{identity.notes}</p>
      </div>

      <dl className="divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B] text-xs">
        <DetailRow label="Identity ID" value={identity.id} mono />
        <DetailRow label="Type" value={identity.identityType} />
        <DetailRow label="Role" value={identity.role} />
        <DetailRow label="Department" value={identity.department} />
        <DetailRow label="Last Activity" value={identity.lastActivity} mono />
      </dl>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
          Registered Devices ({devices.length})
        </div>
        {devices.length === 0 ? (
          <div className="rounded border border-[#27272A] bg-[#090A0B] px-3 py-2.5 text-xs text-[#71717A]">
            No devices enrolled in sandbox.
          </div>
        ) : (
          <div className="space-y-1.5">
            {devices.map((dev) => (
              <button
                key={dev.id}
                type="button"
                onClick={() => onInspectDevice(dev)}
                className="flex w-full items-center justify-between rounded border border-[#27272A] bg-[#090A0B] px-3 py-2 text-left text-xs transition-colors hover:border-[#3F3F46] hover:bg-[#19191C]"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-[#F4F4F5]">{dev.name}</div>
                  <div className="font-mono text-[10px] text-[#71717A]">
                    {dev.id} • {dev.deviceType}
                  </div>
                </div>
                <StatusBadge tone={DEVICE_TRUST_TONE[dev.trustState]}>
                  {dev.trustState}
                </StatusBadge>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
          Permissions Overview (Sandbox Matrix)
        </div>
        {nonDeniedPerms.length === 0 ? (
          <div className="rounded border border-[#27272A] bg-[#090A0B] px-3 py-2.5 text-xs text-[#71717A]">
            All services currently Denied for this identity.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {nonDeniedPerms.map((perm) => (
              <div
                key={perm.service}
                className="flex items-center justify-between rounded border border-[#27272A] bg-[#090A0B] px-2.5 py-1.5 text-[11px]"
              >
                <span className="truncate text-[#A1A1AA]">{perm.service}</span>
                <span className="font-mono text-[10px] font-medium text-[#F4F4F5]">
                  {perm.level}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
          Recent Synthetic Events
        </div>
        {events.length === 0 ? (
          <div className="rounded border border-[#27272A] bg-[#090A0B] px-3 py-2.5 text-xs text-[#71717A]">
            No recent events recorded for this identity.
          </div>
        ) : (
          <div className="divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B]">
            {events.map((evt) => (
              <div key={evt.id} className="px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#F4F4F5]">{evt.description}</span>
                  <span className="font-mono text-[10px] text-[#71717A]">{evt.relativeTime}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-[#71717A]">
                  {evt.service} • {evt.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
