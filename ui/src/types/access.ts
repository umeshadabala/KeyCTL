import type { IdentityStatus } from './identity';

export type PermissionLevel = 'Read' | 'Write' | 'Admin' | 'Denied';

export type RequestedPermission = Exclude<PermissionLevel, 'Denied'>;

export type ServiceName =
  | 'Internal Chat'
  | 'Cloud Storage'
  | 'HR Portal'
  | 'Finance'
  | 'Admin Console'
  | 'Identity Service'
  | 'Key Service'
  | 'Audit Service';

export type PolicyStatus = 'Active (Simulated)' | 'Monitoring (Simulated)' | 'Draft (Sandbox)';

export interface AccessPolicy {
  id: string;
  name: string;
  status: PolicyStatus;
  scope: string;
  lastUpdated: string;
  description: string;
  effect: 'ALLOW' | 'DENY';
  priority: number;
}

export interface PermissionEntry {
  identityId: string;
  service: ServiceName;
  level: PermissionLevel;
  policyId: string;
  rationale: string;
}

export type EvaluationDecision = 'ALLOW' | 'DENY';

export interface AccessEvaluationResult {
  id: string;
  timestamp: string;
  identityId: string;
  identityName: string;
  identityHandle: string;
  identityStatus: IdentityStatus;
  service: ServiceName;
  requestedPermission: RequestedPermission;
  decision: EvaluationDecision;
  relevantPolicyId: string;
  relevantPolicyName: string;
  grantedLevel: PermissionLevel;
  reason: string;
}
