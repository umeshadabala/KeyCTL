import { CheckCircle2, Filter } from 'lucide-react';
import type { SecurityAlert, SecurityEvent, ServiceNode } from '../../types/security';
import { StatusBadge } from '../ui/StatusBadge';
import { DetailRow } from './DetailRow';

export function EventInspectionBody({
  event,
  onFilterByService,
}: {
  event: SecurityEvent;
  onFilterByService: (serviceName: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <StatusBadge tone="neutral">{event.status}</StatusBadge>
          <span className="font-mono text-[11px] text-[#71717A]">{event.id}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-[#F4F4F5]">{event.description}</h3>
        <p className="mt-1 font-mono text-xs text-[#A1A1AA]">
          {event.timestamp} ({event.relativeTime})
        </p>
      </div>

      <dl className="divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B] text-xs">
        <DetailRow label="Identity" value={event.identity} mono />
        <DetailRow label="Service" value={event.service} />
        <DetailRow label="Source IP" value={event.simulatedMetadata.sourceIp} mono />
        <DetailRow label="Device ID" value={event.simulatedMetadata.deviceId} mono />
        <DetailRow label="Policy Note" value={event.simulatedMetadata.policyResult} />
        <DetailRow label="Enforcement" value={event.simulatedMetadata.enforcementNote} />
      </dl>

      <button
        type="button"
        onClick={() => onFilterByService(event.service)}
        className="inline-flex items-center gap-2 rounded border border-[#27272A] bg-[#19191C] px-3 py-2 text-xs font-medium text-[#F4F4F5] hover:border-[#3F3F46]"
      >
        <Filter className="h-3.5 w-3.5 text-[#A1A1AA]" />
        <span>Filter feed by {event.service}</span>
      </button>
    </div>
  );
}

export function AlertInspectionBody({
  alert,
  onToggleAcknowledge,
  onFilterByService,
}: {
  alert: SecurityAlert;
  onToggleAcknowledge: (alertId: string) => void;
  onFilterByService: (serviceName: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={alert.severity === 'high' ? 'danger' : 'warning'}>
            {alert.severity.toUpperCase()}
          </StatusBadge>
          <StatusBadge tone={alert.acknowledged ? 'success' : 'neutral'}>
            {alert.acknowledged ? 'Acknowledged (Local)' : 'Active (Simulated)'}
          </StatusBadge>
        </div>
        <h3 className="mt-2 text-base font-semibold text-[#F4F4F5]">{alert.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">{alert.reason}</p>
      </div>

      <dl className="divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B] text-xs">
        <DetailRow label="Alert ID" value={alert.id} mono />
        <DetailRow label="Identity" value={alert.identity} mono />
        <DetailRow label="Target Service" value={alert.service} />
        <DetailRow label="Detected" value={alert.timestamp} mono />
        <DetailRow label="Next Step" value={alert.simulatedRecommendation} />
      </dl>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onToggleAcknowledge(alert.id)}
          className="inline-flex items-center gap-2 rounded border border-[#27272A] bg-[#19191C] px-3 py-2 text-xs font-medium text-[#F4F4F5] hover:border-[#3F3F46]"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-[#A1A1AA]" />
          <span>
            {alert.acknowledged ? 'Restore Alert to Active' : 'Acknowledge in Sandbox'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onFilterByService(alert.service)}
          className="inline-flex items-center gap-2 rounded border border-[#27272A] bg-[#19191C] px-3 py-2 text-xs font-medium text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#F4F4F5]"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filter {alert.service} Events</span>
        </button>
      </div>
    </div>
  );
}

export function ServiceInspectionBody({
  service,
  onFilterByService,
}: {
  service: ServiceNode;
  onFilterByService: (serviceName: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={service.health === 'Healthy' ? 'success' : 'warning'} dot>
            {service.health} (Simulated)
          </StatusBadge>
          <span className="text-xs text-[#A1A1AA]">{service.role}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-[#F4F4F5]">{service.name}</h3>
      </div>

      <dl className="divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B] text-xs">
        <DetailRow label="Node ID" value={service.id} mono />
        <DetailRow label="Endpoint" value={service.simulatedEndpoint} mono />
        <DetailRow label="Last Activity" value={service.lastActivity} mono />
        <DetailRow label="Sim Latency" value={`${service.latencyMs} ms`} mono />
        <DetailRow label="Telemetry Mode" value="Organizer Sandbox (Mocked)" />
      </dl>

      <button
        type="button"
        onClick={() => onFilterByService(service.name)}
        className="inline-flex items-center gap-2 rounded border border-[#27272A] bg-[#19191C] px-3 py-2 text-xs font-medium text-[#F4F4F5] hover:border-[#3F3F46]"
      >
        <Filter className="h-3.5 w-3.5 text-[#A1A1AA]" />
        <span>Filter Event Feed for {service.name}</span>
      </button>
    </div>
  );
}
