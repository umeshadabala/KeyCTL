import type {
  AccessEvaluationResult,
  PermissionEntry,
  PermissionLevel,
  RequestedPermission,
  ServiceName,
} from '../types/access';
import type { SyntheticDevice } from '../types/device';
import type { SyntheticIdentity } from '../types/identity';
import type {
  FeedbackNotice,
  InspectionSelection,
  SecurityAlert,
  SecurityEvent,
  ServiceNode,
} from '../types/security';

export type DeviceActionKind = 'quarantine' | 'restore' | 'revoke';

export type ResolvedInspectionTarget =
  | { kind: 'event'; item: SecurityEvent }
  | { kind: 'alert'; item: SecurityAlert }
  | { kind: 'service'; item: ServiceNode }
  | { kind: 'identity'; item: SyntheticIdentity }
  | { kind: 'device'; item: SyntheticDevice }
  | null;

let idSequence = 0;

export function nextSandboxId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence}`;
}

export function formatUtcTime(date: Date = new Date()): string {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(
    date.getUTCMinutes(),
  ).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')} UTC`;
}

export function canPerformDeviceAction(
  device: SyntheticDevice,
  action: DeviceActionKind,
): boolean {
  if (device.trustState === 'Revoked') return false;
  if (action === 'quarantine') {
    return device.trustState === 'Trusted' || device.trustState === 'Pending verification';
  }
  if (action === 'restore') {
    return device.trustState === 'Quarantined' || device.trustState === 'Pending verification';
  }
  return true;
}

export function recalculateIdentitiesTrust(
  identities: SyntheticIdentity[],
  devices: SyntheticDevice[],
  changedIdentityId: string,
): SyntheticIdentity[] {
  const ownerDevices = devices.filter((d) => d.identityId === changedIdentityId);
  const hasTrusted = ownerDevices.some((d) => d.trustState === 'Trusted');
  const hasQuarantinedOrRevoked = ownerDevices.some(
    (d) => d.trustState === 'Quarantined' || d.trustState === 'Revoked',
  );

  return identities.map((ident) => {
    if (ident.id !== changedIdentityId) return ident;

    let nextTrust = ident.trustStatus;
    if (!hasTrusted) {
      nextTrust = 'Restricted';
    } else if (hasQuarantinedOrRevoked || ident.status === 'Elevated risk') {
      nextTrust = 'Review required';
    } else if (ident.status === 'Active') {
      nextTrust = 'Verified';
    }

    return {
      ...ident,
      trustStatus: nextTrust,
      lastActivity: 'just now',
    };
  });
}

interface DeviceTransitionMeta {
  nextTrustState: SyntheticDevice['trustState'];
  nextStatusLabel: string;
  lifecycleAction: string;
  defaultNote: string;
  eventDescription: (name: string) => string;
  eventCategory: SecurityEvent['category'];
  eventSeverity: SecurityEvent['severity'];
  eventStatus: string;
  defaultPolicyResult: string;
  enforcementNote: string;
  feedbackTone: FeedbackNotice['tone'];
  feedbackMessage: (name: string, id: string) => string;
  clearServices: boolean;
}

const DEVICE_ACTION_META: Record<DeviceActionKind, DeviceTransitionMeta> = {
  quarantine: {
    nextTrustState: 'Quarantined',
    nextStatusLabel: 'Quarantined (Sim)',
    lifecycleAction: 'Device quarantined (Simulated)',
    defaultNote: 'Manual quarantine triggered in Organizer Sandbox.',
    eventDescription: (name) => `Device quarantined (${name})`,
    eventCategory: 'revocation',
    eventSeverity: 'medium',
    eventStatus: 'Quarantined (Sim)',
    defaultPolicyResult: 'Simulated quarantine applied locally',
    enforcementNote: 'Not yet enforced — local sandbox state only',
    feedbackTone: 'warning',
    feedbackMessage: (name, id) =>
      `Simulated quarantine applied to ${name} (${id}). Event logged in sandbox feed.`,
    clearServices: false,
  },
  restore: {
    nextTrustState: 'Trusted',
    nextStatusLabel: 'Attested (Demo)',
    lifecycleAction: 'Device restored to Trusted (Simulated)',
    defaultNote: 'Posture verified in sandbox; device trust restored locally.',
    eventDescription: (name) => `Device restored (${name})`,
    eventCategory: 'authentication',
    eventSeverity: 'info',
    eventStatus: 'Restored (Sim)',
    defaultPolicyResult: 'Simulated device trust restored to Trusted',
    enforcementNote: 'Not yet enforced — local sandbox state only',
    feedbackTone: 'success',
    feedbackMessage: (name, id) => `Simulated trust restored for ${name} (${id}).`,
    clearServices: false,
  },
  revoke: {
    nextTrustState: 'Revoked',
    nextStatusLabel: 'Revoked (Sim)',
    lifecycleAction: 'Device revoked permanently (Simulated)',
    defaultNote: 'Simulated revocation executed; device cannot be restored in sandbox.',
    eventDescription: (name) => `Device revocation executed (${name})`,
    eventCategory: 'revocation',
    eventSeverity: 'high',
    eventStatus: 'Revoked (Sim)',
    defaultPolicyResult: 'Permanent sandbox revocation recorded',
    enforcementNote: 'Not yet enforced — backend certificate revocation pending',
    feedbackTone: 'danger',
    feedbackMessage: (name, id) =>
      `Simulated revocation completed for ${name} (${id}). Device is now permanently revoked in sandbox.`,
    clearServices: true,
  },
};

export function applyDeviceAction(params: {
  devices: SyntheticDevice[];
  identities: SyntheticIdentity[];
  deviceId: string;
  action: DeviceActionKind;
  reason?: string;
}): {
  devices: SyntheticDevice[];
  identities: SyntheticIdentity[];
  event: SecurityEvent;
  feedback: FeedbackNotice;
} | null {
  const { devices, identities, deviceId, action, reason } = params;
  const target = devices.find((d) => d.id === deviceId);
  if (!target || !canPerformDeviceAction(target, action)) {
    return null;
  }

  const meta = DEVICE_ACTION_META[action];
  const timestamp = formatUtcTime();
  const note = reason?.trim() || meta.defaultNote;

  const updatedDevices = devices.map((d) => {
    if (d.id !== deviceId) return d;
    return {
      ...d,
      trustState: meta.nextTrustState,
      statusLabel: meta.nextStatusLabel,
      lastSeen: 'just now',
      associatedServices: meta.clearServices ? [] : d.associatedServices,
      lifecycleHistory: [
        {
          id: nextSandboxId('lh'),
          timestamp: `Today ${timestamp}`,
          action: meta.lifecycleAction,
          actor: 'Security Operator (Sandbox)',
          note,
        },
        ...d.lifecycleHistory,
      ],
    };
  });

  const updatedIdentities = recalculateIdentitiesTrust(
    identities,
    updatedDevices,
    target.identityId,
  );

  const event: SecurityEvent = {
    id: nextSandboxId('evt'),
    description: meta.eventDescription(target.name),
    category: meta.eventCategory,
    identity: target.identityHandle,
    service: 'Identity Service',
    timestamp,
    relativeTime: 'just now',
    severity: meta.eventSeverity,
    status: meta.eventStatus,
    simulatedMetadata: {
      sourceIp: '10.42.0.10 (Sandbox UI)',
      deviceId: target.id,
      policyResult: reason?.trim() || meta.defaultPolicyResult,
      enforcementNote: meta.enforcementNote,
    },
  };

  const feedback: FeedbackNotice = {
    id: nextSandboxId('fb'),
    message: meta.feedbackMessage(target.name, target.id),
    tone: meta.feedbackTone,
  };

  return {
    devices: updatedDevices,
    identities: updatedIdentities,
    event,
    feedback,
  };
}

export function applyPermissionUpdate(params: {
  permissions: PermissionEntry[];
  identity: SyntheticIdentity;
  service: ServiceName;
  level: PermissionLevel;
}): {
  permissions: PermissionEntry[];
  event: SecurityEvent;
  feedback: FeedbackNotice;
} {
  const { permissions, identity, service, level } = params;
  const timestamp = formatUtcTime();

  const exists = permissions.some((p) => p.identityId === identity.id && p.service === service);
  const updatedPermissions = exists
    ? permissions.map((p) =>
        p.identityId === identity.id && p.service === service
          ? { ...p, level, rationale: 'Updated in Organizer Sandbox matrix' }
          : p,
      )
    : [
        ...permissions,
        {
          identityId: identity.id,
          service,
          level,
          policyId: 'POL-002',
          rationale: 'Updated in Organizer Sandbox matrix',
        },
      ];

  const event: SecurityEvent = {
    id: nextSandboxId('evt'),
    description: `Permission updated (${level} on ${service})`,
    category: 'access',
    identity: identity.handle,
    service,
    timestamp,
    relativeTime: 'just now',
    severity: level === 'Admin' ? 'medium' : 'low',
    status: 'Logged (Sim)',
    simulatedMetadata: {
      sourceIp: '10.42.0.10 (Sandbox UI)',
      deviceId: 'console-local',
      policyResult: `Matrix level set to ${level} (Demo)`,
      enforcementNote: 'Simulated policy update — no live service enforcement',
    },
  };

  const feedback: FeedbackNotice = {
    id: nextSandboxId('fb'),
    message: `Updated simulated permission for ${identity.displayName} on ${service} to ${level}.`,
    tone: 'neutral',
  };

  return { permissions: updatedPermissions, event, feedback };
}

export function createAccessSimulationEvent(
  identity: SyntheticIdentity,
  service: ServiceName,
  requestedPermission: RequestedPermission,
  result: AccessEvaluationResult,
): SecurityEvent {
  return {
    id: nextSandboxId('evt'),
    description:
      result.decision === 'ALLOW'
        ? `Access simulation ALLOWED (${requestedPermission})`
        : `Access simulation DENIED (${requestedPermission})`,
    category: 'access',
    identity: identity.handle,
    service,
    timestamp: result.timestamp,
    relativeTime: 'just now',
    severity: result.decision === 'ALLOW' ? 'info' : 'medium',
    status: result.decision === 'ALLOW' ? 'Allowed (Sim)' : 'Denied (Sim)',
    simulatedMetadata: {
      sourceIp: '10.42.0.10 (Sandbox Evaluator)',
      deviceId: 'policy-sim-local',
      policyResult: `${result.relevantPolicyId}: ${result.reason}`,
      enforcementNote: 'Deterministic sandbox simulation — no external enforcement',
    },
  };
}

export function resolveInspectionTarget(
  selection: InspectionSelection | null,
  sources: {
    events: SecurityEvent[];
    alerts: SecurityAlert[];
    services: ServiceNode[];
    identities: SyntheticIdentity[];
    devices: SyntheticDevice[];
  },
): ResolvedInspectionTarget {
  if (!selection) return null;

  switch (selection.kind) {
    case 'event': {
      const item = sources.events.find((e) => e.id === selection.id);
      return item ? { kind: 'event', item } : null;
    }
    case 'alert': {
      const item = sources.alerts.find((a) => a.id === selection.id);
      return item ? { kind: 'alert', item } : null;
    }
    case 'service': {
      const item = sources.services.find((s) => s.id === selection.id);
      return item ? { kind: 'service', item } : null;
    }
    case 'identity': {
      const item = sources.identities.find((i) => i.id === selection.id);
      return item ? { kind: 'identity', item } : null;
    }
    case 'device': {
      const item = sources.devices.find((d) => d.id === selection.id);
      return item ? { kind: 'device', item } : null;
    }
  }
}
