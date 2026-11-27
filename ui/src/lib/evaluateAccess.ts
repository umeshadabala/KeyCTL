import { ACCESS_POLICIES } from '../data/accessPolicies';
import type {
  AccessEvaluationResult,
  PermissionEntry,
  PermissionLevel,
  RequestedPermission,
  ServiceName,
} from '../types/access';
import type { SyntheticDevice } from '../types/device';
import type { SyntheticIdentity } from '../types/identity';

const LEVEL_RANK: Record<PermissionLevel, number> = {
  Denied: 0,
  Read: 1,
  Write: 2,
  Admin: 3,
};

const SENSITIVE_SERVICES: ServiceName[] = ['Finance', 'Admin Console', 'Key Service'];

function getPolicyName(policyId: string): string {
  return ACCESS_POLICIES.find((p) => p.id === policyId)?.name ?? 'Sandbox Policy';
}

export function evaluateSyntheticAccess(params: {
  identity: SyntheticIdentity;
  devices: SyntheticDevice[];
  permissions: PermissionEntry[];
  service: ServiceName;
  requestedPermission: RequestedPermission;
}): AccessEvaluationResult {
  const { identity, devices, permissions, service, requestedPermission } = params;

  const now = new Date();
  const timestamp = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
    now.getUTCMinutes(),
  ).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')} UTC`;

  const entry = permissions.find(
    (p) => p.identityId === identity.id && p.service === service,
  );
  const grantedLevel: PermissionLevel = entry?.level ?? 'Denied';

  const ownedDevices = devices.filter((d) => d.identityId === identity.id);
  const trustedDevices = ownedDevices.filter((d) => d.trustState === 'Trusted');

  // 1. Suspended identity hard block (POL-001)
  if (identity.status === 'Suspended') {
    return {
      id: `SIM-${Math.floor(205 + Math.random() * 790)}`,
      timestamp,
      identityId: identity.id,
      identityName: identity.displayName,
      identityHandle: identity.handle,
      identityStatus: identity.status,
      service,
      requestedPermission,
      decision: 'DENY',
      relevantPolicyId: 'POL-001',
      relevantPolicyName: getPolicyName('POL-001'),
      grantedLevel: 'Denied',
      reason: `Identity ${identity.handle} is in Suspended status. All sandbox access is blocked by POL-001.`,
    };
  }

  // 2. Device trust posture gate (POL-004)
  if (trustedDevices.length === 0) {
    const deviceSummary =
      ownedDevices.length === 0
        ? 'has no registered devices'
        : `has ${ownedDevices.length} device(s), none in Trusted state (${ownedDevices
            .map((d) => d.trustState)
            .join(', ')})`;

    return {
      id: `SIM-${Math.floor(205 + Math.random() * 790)}`,
      timestamp,
      identityId: identity.id,
      identityName: identity.displayName,
      identityHandle: identity.handle,
      identityStatus: identity.status,
      service,
      requestedPermission,
      decision: 'DENY',
      relevantPolicyId: 'POL-004',
      relevantPolicyName: getPolicyName('POL-004'),
      grantedLevel,
      reason: `Identity ${identity.handle} ${deviceSummary}. At least one Trusted device is required by POL-004.`,
    };
  }

  // 3. Risk-adaptive guard for sensitive services (POL-003)
  if (
    identity.status === 'Elevated risk' &&
    SENSITIVE_SERVICES.includes(service) &&
    (requestedPermission === 'Write' || requestedPermission === 'Admin')
  ) {
    return {
      id: `SIM-${Math.floor(205 + Math.random() * 790)}`,
      timestamp,
      identityId: identity.id,
      identityName: identity.displayName,
      identityHandle: identity.handle,
      identityStatus: identity.status,
      service,
      requestedPermission,
      decision: 'DENY',
      relevantPolicyId: 'POL-003',
      relevantPolicyName: getPolicyName('POL-003'),
      grantedLevel,
      reason: `Identity ${identity.handle} is flagged Elevated risk and cannot obtain ${requestedPermission} access on sensitive service ${service} under POL-003.`,
    };
  }

  // 4. Least-privilege matrix check (POL-002 / POL-005)
  const policyId = entry?.policyId ?? 'POL-002';
  const policyName = getPolicyName(policyId);

  if (grantedLevel === 'Denied') {
    return {
      id: `SIM-${Math.floor(205 + Math.random() * 790)}`,
      timestamp,
      identityId: identity.id,
      identityName: identity.displayName,
      identityHandle: identity.handle,
      identityStatus: identity.status,
      service,
      requestedPermission,
      decision: 'DENY',
      relevantPolicyId: policyId,
      relevantPolicyName: policyName,
      grantedLevel,
      reason: `Matrix rule for ${identity.handle} on ${service} is Denied (${entry?.rationale ?? 'no grant configured'}).`,
    };
  }

  if (LEVEL_RANK[grantedLevel] < LEVEL_RANK[requestedPermission]) {
    return {
      id: `SIM-${Math.floor(205 + Math.random() * 790)}`,
      timestamp,
      identityId: identity.id,
      identityName: identity.displayName,
      identityHandle: identity.handle,
      identityStatus: identity.status,
      service,
      requestedPermission,
      decision: 'DENY',
      relevantPolicyId: policyId,
      relevantPolicyName: policyName,
      grantedLevel,
      reason: `Requested ${requestedPermission} exceeds matrix allowance (${grantedLevel}) for ${identity.handle} on ${service}.`,
    };
  }

  return {
    id: `SIM-${Math.floor(205 + Math.random() * 790)}`,
    timestamp,
    identityId: identity.id,
    identityName: identity.displayName,
    identityHandle: identity.handle,
    identityStatus: identity.status,
    service,
    requestedPermission,
    decision: 'ALLOW',
    relevantPolicyId: policyId,
    relevantPolicyName: policyName,
    grantedLevel,
    reason: `Identity ${identity.handle} (${identity.status}) holds ${trustedDevices.length} Trusted device(s) and matrix grant ${grantedLevel}, satisfying ${requestedPermission} on ${service}.`,
  };
}
