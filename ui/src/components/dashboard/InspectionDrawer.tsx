import { Laptop, Server, ShieldAlert, Terminal, User, X } from 'lucide-react';
import type { InspectionTarget } from '../../hooks/useSandboxState';
import type { DeviceActionKind } from '../../lib/sandboxDomain';
import type { PermissionEntry } from '../../types/access';
import type { SyntheticDevice } from '../../types/device';
import type { SyntheticIdentity } from '../../types/identity';
import type { SecurityEvent } from '../../types/security';
import { DeviceInspectionBody } from '../inspection/DeviceInspectionBody';
import { IdentityInspectionBody } from '../inspection/IdentityInspectionBody';
import {
  AlertInspectionBody,
  EventInspectionBody,
  ServiceInspectionBody,
} from '../inspection/TelemetryInspectionBodies';

interface InspectionDrawerProps {
  target: InspectionTarget;
  identities: SyntheticIdentity[];
  devices: SyntheticDevice[];
  events: SecurityEvent[];
  permissions: PermissionEntry[];
  onClose: () => void;
  onSelectInspection: (target: InspectionTarget) => void;
  onToggleAlertAcknowledge: (alertId: string) => void;
  onFilterByService: (serviceName: string) => void;
  onRequestDeviceAction: (action: DeviceActionKind, device: SyntheticDevice) => void;
}

const HEADER_CONFIG = {
  event: { title: 'Event Inspection', icon: Terminal, iconClass: 'text-[#A1A1AA]' },
  alert: { title: 'Alert Inspection', icon: ShieldAlert, iconClass: 'text-amber-400' },
  service: { title: 'Service Node Inspection', icon: Server, iconClass: 'text-[#A1A1AA]' },
  identity: { title: 'Identity Inspection', icon: User, iconClass: 'text-[#A1A1AA]' },
  device: { title: 'Device Inspection', icon: Laptop, iconClass: 'text-[#A1A1AA]' },
} as const;

export function InspectionDrawer({
  target,
  identities,
  devices,
  events,
  permissions,
  onClose,
  onSelectInspection,
  onToggleAlertAcknowledge,
  onFilterByService,
  onRequestDeviceAction,
}: InspectionDrawerProps) {
  if (!target) return null;

  const { title, icon: HeaderIcon, iconClass } = HEADER_CONFIG[target.kind];

  const handleFilterService = (serviceName: string) => {
    onFilterByService(serviceName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Telemetry inspection panel"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#27272A] bg-[#141517] shadow-2xl"
      >
        <div className="flex h-13 items-center justify-between border-b border-[#27272A] px-5">
          <div className="flex items-center gap-2">
            <HeaderIcon className={`h-4 w-4 ${iconClass}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#F4F4F5]">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspection panel"
            className="rounded p-1 text-[#71717A] hover:bg-[#19191C] hover:text-[#F4F4F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="rounded border border-[#27272A] bg-[#090A0B] px-3 py-2 text-[11px] text-[#A1A1AA]">
            Simulated Sandbox Telemetry — Local demo state only. No live backend or cryptographic
            enforcement is active.
          </div>

          {target.kind === 'event' && (
            <EventInspectionBody event={target.item} onFilterByService={handleFilterService} />
          )}

          {target.kind === 'alert' && (
            <AlertInspectionBody
              alert={target.item}
              onToggleAcknowledge={onToggleAlertAcknowledge}
              onFilterByService={handleFilterService}
            />
          )}

          {target.kind === 'service' && (
            <ServiceInspectionBody
              service={target.item}
              onFilterByService={handleFilterService}
            />
          )}

          {target.kind === 'identity' && (
            <IdentityInspectionBody
              identity={target.item}
              devices={devices.filter((d) => d.identityId === target.item.id)}
              events={events.filter((e) => e.identity === target.item.handle).slice(0, 4)}
              permissions={permissions.filter((p) => p.identityId === target.item.id)}
              onInspectDevice={(device) => onSelectInspection({ kind: 'device', item: device })}
            />
          )}

          {target.kind === 'device' && (
            <DeviceInspectionBody
              device={target.item}
              owner={identities.find((i) => i.id === target.item.identityId)}
              events={events
                .filter(
                  (e) =>
                    e.simulatedMetadata.deviceId === target.item.id ||
                    e.identity === target.item.identityHandle,
                )
                .slice(0, 4)}
              onInspectIdentity={(identity) =>
                onSelectInspection({ kind: 'identity', item: identity })
              }
              onRequestAction={(action) => onRequestDeviceAction(action, target.item)}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
