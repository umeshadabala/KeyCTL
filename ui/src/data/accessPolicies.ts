import type {
  AccessEvaluationResult,
  AccessPolicy,
  PermissionEntry,
  ServiceName,
} from '../types/access';

export const SANDBOX_SERVICES: ServiceName[] = [
  'Internal Chat',
  'Cloud Storage',
  'HR Portal',
  'Finance',
  'Admin Console',
  'Identity Service',
  'Key Service',
  'Audit Service',
];

export const ACCESS_POLICIES: AccessPolicy[] = [
  {
    id: 'POL-001',
    name: 'Suspended Identity Hard Block',
    status: 'Active (Simulated)',
    scope: 'All Services • Global',
    lastUpdated: '2026-11-20',
    description:
      'Denies all simulated service requests for any identity in Suspended status regardless of prior matrix grants.',
    effect: 'DENY',
    priority: 1,
  },
  {
    id: 'POL-004',
    name: 'Device Trust Posture Gate',
    status: 'Active (Simulated)',
    scope: 'All Identities • Device Binding',
    lastUpdated: '2026-11-24',
    description:
      'Requires at least one Trusted device registered to the requesting identity before evaluating service permissions.',
    effect: 'DENY',
    priority: 2,
  },
  {
    id: 'POL-003',
    name: 'Risk-Adaptive Sensitive Service Guard',
    status: 'Active (Simulated)',
    scope: 'Finance, Admin Console, Key Service',
    lastUpdated: '2026-11-25',
    description:
      'Blocks Write or Admin requests to sensitive control-plane and financial services when an identity is flagged Elevated risk.',
    effect: 'DENY',
    priority: 3,
  },
  {
    id: 'POL-002',
    name: 'Least-Privilege Role Matrix',
    status: 'Active (Simulated)',
    scope: 'Role-Scoped Service Matrix',
    lastUpdated: '2026-11-26',
    description:
      'Grants Read, Write, or Admin levels strictly according to the identity-service permission matrix entry.',
    effect: 'ALLOW',
    priority: 4,
  },
  {
    id: 'POL-005',
    name: 'Audit Trail Read Oversight',
    status: 'Monitoring (Simulated)',
    scope: 'Audit Service',
    lastUpdated: '2026-11-22',
    description:
      'Logs all simulated evaluation attempts targeting Audit Service for compliance telemetry review.',
    effect: 'ALLOW',
    priority: 5,
  },
];

export const INITIAL_PERMISSIONS: PermissionEntry[] = [
  // ID-101 Elena Vance
  { identityId: 'ID-101', service: 'Internal Chat', level: 'Write', policyId: 'POL-002', rationale: 'Standard team communication' },
  { identityId: 'ID-101', service: 'Cloud Storage', level: 'Write', policyId: 'POL-002', rationale: 'Infrastructure artifact management' },
  { identityId: 'ID-101', service: 'HR Portal', level: 'Read', policyId: 'POL-002', rationale: 'Self-service directory access' },
  { identityId: 'ID-101', service: 'Finance', level: 'Denied', policyId: 'POL-002', rationale: 'Outside engineering remit' },
  { identityId: 'ID-101', service: 'Admin Console', level: 'Admin', policyId: 'POL-002', rationale: 'Principal infrastructure admin' },
  { identityId: 'ID-101', service: 'Identity Service', level: 'Read', policyId: 'POL-002', rationale: 'Read-only directory inspection' },
  { identityId: 'ID-101', service: 'Key Service', level: 'Admin', policyId: 'POL-002', rationale: 'KMS prototype maintainer' },
  { identityId: 'ID-101', service: 'Audit Service', level: 'Read', policyId: 'POL-005', rationale: 'Audit telemetry visibility' },

  // ID-102 Marcus Chen (Elevated risk)
  { identityId: 'ID-102', service: 'Internal Chat', level: 'Write', policyId: 'POL-002', rationale: 'Standard team communication' },
  { identityId: 'ID-102', service: 'Cloud Storage', level: 'Write', policyId: 'POL-002', rationale: 'Core service build artifacts' },
  { identityId: 'ID-102', service: 'HR Portal', level: 'Read', policyId: 'POL-002', rationale: 'Self-service employee profile' },
  { identityId: 'ID-102', service: 'Finance', level: 'Denied', policyId: 'POL-003', rationale: 'Blocked: engineering role lacks Finance access' },
  { identityId: 'ID-102', service: 'Admin Console', level: 'Denied', policyId: 'POL-002', rationale: 'No administrative clearance' },
  { identityId: 'ID-102', service: 'Identity Service', level: 'Read', policyId: 'POL-002', rationale: 'Basic lookup scope' },
  { identityId: 'ID-102', service: 'Key Service', level: 'Denied', policyId: 'POL-003', rationale: 'Key operations restricted' },
  { identityId: 'ID-102', service: 'Audit Service', level: 'Denied', policyId: 'POL-002', rationale: 'Restricted to security/audit roles' },

  // ID-103 Rohan Patel (Elevated risk)
  { identityId: 'ID-103', service: 'Internal Chat', level: 'Write', policyId: 'POL-002', rationale: 'Security ops coordination' },
  { identityId: 'ID-103', service: 'Cloud Storage', level: 'Read', policyId: 'POL-002', rationale: 'Artifact inspection' },
  { identityId: 'ID-103', service: 'HR Portal', level: 'Read', policyId: 'POL-002', rationale: 'Self-service access' },
  { identityId: 'ID-103', service: 'Finance', level: 'Denied', policyId: 'POL-002', rationale: 'Outside DevSecOps scope' },
  { identityId: 'ID-103', service: 'Admin Console', level: 'Read', policyId: 'POL-003', rationale: 'Read-only oversight while Elevated risk' },
  { identityId: 'ID-103', service: 'Identity Service', level: 'Write', policyId: 'POL-002', rationale: 'Device posture triage' },
  { identityId: 'ID-103', service: 'Key Service', level: 'Read', policyId: 'POL-002', rationale: 'Key inventory visibility' },
  { identityId: 'ID-103', service: 'Audit Service', level: 'Read', policyId: 'POL-005', rationale: 'Security telemetry inspection' },

  // ID-104 Dara Okafor
  { identityId: 'ID-104', service: 'Internal Chat', level: 'Write', policyId: 'POL-002', rationale: 'Workforce coordination' },
  { identityId: 'ID-104', service: 'Cloud Storage', level: 'Read', policyId: 'POL-002', rationale: 'HR policy document store' },
  { identityId: 'ID-104', service: 'HR Portal', level: 'Admin', policyId: 'POL-002', rationale: 'Workforce Operations Lead' },
  { identityId: 'ID-104', service: 'Finance', level: 'Read', policyId: 'POL-002', rationale: 'Payroll alignment view' },
  { identityId: 'ID-104', service: 'Admin Console', level: 'Denied', policyId: 'POL-002', rationale: 'No infrastructure admin scope' },
  { identityId: 'ID-104', service: 'Identity Service', level: 'Read', policyId: 'POL-002', rationale: 'Directory onboarding lookup' },
  { identityId: 'ID-104', service: 'Key Service', level: 'Denied', policyId: 'POL-002', rationale: 'Non-cryptographic role' },
  { identityId: 'ID-104', service: 'Audit Service', level: 'Denied', policyId: 'POL-002', rationale: 'Restricted to security/audit roles' },

  // ID-105 Security Ops Lead
  { identityId: 'ID-105', service: 'Internal Chat', level: 'Write', policyId: 'POL-002', rationale: 'Incident response channel' },
  { identityId: 'ID-105', service: 'Cloud Storage', level: 'Read', policyId: 'POL-002', rationale: 'Evidence inspection' },
  { identityId: 'ID-105', service: 'HR Portal', level: 'Read', policyId: 'POL-002', rationale: 'Identity verification context' },
  { identityId: 'ID-105', service: 'Finance', level: 'Read', policyId: 'POL-002', rationale: 'Read-only fraud investigation' },
  { identityId: 'ID-105', service: 'Admin Console', level: 'Admin', policyId: 'POL-002', rationale: 'SOC Lead full console governance' },
  { identityId: 'ID-105', service: 'Identity Service', level: 'Admin', policyId: 'POL-002', rationale: 'Identity & device enforcement lead' },
  { identityId: 'ID-105', service: 'Key Service', level: 'Write', policyId: 'POL-002', rationale: 'Key rotation initiation scope' },
  { identityId: 'ID-105', service: 'Audit Service', level: 'Admin', policyId: 'POL-005', rationale: 'Audit integrity oversight' },

  // ID-106 Contractor 04
  { identityId: 'ID-106', service: 'Internal Chat', level: 'Read', policyId: 'POL-002', rationale: 'Scoped channel participation' },
  { identityId: 'ID-106', service: 'Cloud Storage', level: 'Read', policyId: 'POL-002', rationale: 'QA test artifact download' },
  { identityId: 'ID-106', service: 'HR Portal', level: 'Denied', policyId: 'POL-002', rationale: 'External contractor exclusion' },
  { identityId: 'ID-106', service: 'Finance', level: 'Denied', policyId: 'POL-002', rationale: 'External contractor exclusion' },
  { identityId: 'ID-106', service: 'Admin Console', level: 'Denied', policyId: 'POL-003', rationale: 'Explicitly denied after elevation attempts' },
  { identityId: 'ID-106', service: 'Identity Service', level: 'Denied', policyId: 'POL-002', rationale: 'No directory access' },
  { identityId: 'ID-106', service: 'Key Service', level: 'Denied', policyId: 'POL-002', rationale: 'No key management access' },
  { identityId: 'ID-106', service: 'Audit Service', level: 'Denied', policyId: 'POL-002', rationale: 'No audit log access' },

  // ID-107 Nadia Lindqvist
  { identityId: 'ID-107', service: 'Internal Chat', level: 'Write', policyId: 'POL-002', rationale: 'Standard team communication' },
  { identityId: 'ID-107', service: 'Cloud Storage', level: 'Write', policyId: 'POL-002', rationale: 'Financial report archiving' },
  { identityId: 'ID-107', service: 'HR Portal', level: 'Read', policyId: 'POL-002', rationale: 'Payroll headcount reconciliation' },
  { identityId: 'ID-107', service: 'Finance', level: 'Admin', policyId: 'POL-002', rationale: 'Finance Controller governance' },
  { identityId: 'ID-107', service: 'Admin Console', level: 'Denied', policyId: 'POL-002', rationale: 'Outside Finance role' },
  { identityId: 'ID-107', service: 'Identity Service', level: 'Denied', policyId: 'POL-002', rationale: 'Outside Finance role' },
  { identityId: 'ID-107', service: 'Key Service', level: 'Denied', policyId: 'POL-002', rationale: 'Outside Finance role' },
  { identityId: 'ID-107', service: 'Audit Service', level: 'Read', policyId: 'POL-005', rationale: 'Quarterly audit verification' },

  // ID-108 svc-audit-relay
  { identityId: 'ID-108', service: 'Internal Chat', level: 'Denied', policyId: 'POL-002', rationale: 'Non-human service principal' },
  { identityId: 'ID-108', service: 'Cloud Storage', level: 'Denied', policyId: 'POL-002', rationale: 'Not required for relay' },
  { identityId: 'ID-108', service: 'HR Portal', level: 'Denied', policyId: 'POL-002', rationale: 'Non-human service principal' },
  { identityId: 'ID-108', service: 'Finance', level: 'Denied', policyId: 'POL-002', rationale: 'Non-human service principal' },
  { identityId: 'ID-108', service: 'Admin Console', level: 'Denied', policyId: 'POL-002', rationale: 'No interactive admin access' },
  { identityId: 'ID-108', service: 'Identity Service', level: 'Read', policyId: 'POL-002', rationale: 'Principal verification lookup' },
  { identityId: 'ID-108', service: 'Key Service', level: 'Write', policyId: 'POL-002', rationale: 'Simulated rotation epoch reporting' },
  { identityId: 'ID-108', service: 'Audit Service', level: 'Write', policyId: 'POL-005', rationale: 'Telemetry relay ingestion' },

  // ID-109 svc-audit-log
  { identityId: 'ID-109', service: 'Internal Chat', level: 'Denied', policyId: 'POL-002', rationale: 'Non-human service principal' },
  { identityId: 'ID-109', service: 'Cloud Storage', level: 'Denied', policyId: 'POL-002', rationale: 'Isolated audit scope' },
  { identityId: 'ID-109', service: 'HR Portal', level: 'Denied', policyId: 'POL-002', rationale: 'Non-human service principal' },
  { identityId: 'ID-109', service: 'Finance', level: 'Denied', policyId: 'POL-002', rationale: 'Non-human service principal' },
  { identityId: 'ID-109', service: 'Admin Console', level: 'Denied', policyId: 'POL-002', rationale: 'No admin console access' },
  { identityId: 'ID-109', service: 'Identity Service', level: 'Denied', policyId: 'POL-002', rationale: 'Isolated ledger role' },
  { identityId: 'ID-109', service: 'Key Service', level: 'Read', policyId: 'POL-002', rationale: 'Public verification key lookup' },
  { identityId: 'ID-109', service: 'Audit Service', level: 'Write', policyId: 'POL-005', rationale: 'Append synthetic checkpoints' },

  // ID-110 Former Sandbox Intern (Suspended)
  { identityId: 'ID-110', service: 'Internal Chat', level: 'Denied', policyId: 'POL-001', rationale: 'Suspended identity hard block' },
  { identityId: 'ID-110', service: 'Cloud Storage', level: 'Denied', policyId: 'POL-001', rationale: 'Suspended identity hard block' },
  { identityId: 'ID-110', service: 'HR Portal', level: 'Denied', policyId: 'POL-001', rationale: 'Suspended identity hard block' },
  { identityId: 'ID-110', service: 'Finance', level: 'Denied', policyId: 'POL-001', rationale: 'Suspended identity hard block' },
  { identityId: 'ID-110', service: 'Admin Console', level: 'Denied', policyId: 'POL-001', rationale: 'Suspended identity hard block' },
  { identityId: 'ID-110', service: 'Identity Service', level: 'Denied', policyId: 'POL-001', rationale: 'Suspended identity hard block' },
  { identityId: 'ID-110', service: 'Key Service', level: 'Denied', policyId: 'POL-001', rationale: 'Suspended identity hard block' },
  { identityId: 'ID-110', service: 'Audit Service', level: 'Denied', policyId: 'POL-001', rationale: 'Suspended identity hard block' },
];

export const INITIAL_EVALUATION_HISTORY: AccessEvaluationResult[] = [
  {
    id: 'SIM-204',
    timestamp: '14:29:42 UTC',
    identityId: 'ID-102',
    identityName: 'Marcus Chen',
    identityHandle: 'm.chen@sandbox.local',
    identityStatus: 'Elevated risk',
    service: 'Finance',
    requestedPermission: 'Read',
    decision: 'DENY',
    relevantPolicyId: 'POL-002',
    relevantPolicyName: 'Least-Privilege Role Matrix',
    grantedLevel: 'Denied',
    reason:
      'Matrix entry for m.chen@sandbox.local on Finance is Denied (engineering role lacks Finance scope).',
  },
  {
    id: 'SIM-203',
    timestamp: '14:11:03 UTC',
    identityId: 'ID-106',
    identityName: 'Contractor 04',
    identityHandle: 'contractor-04@sandbox.local',
    identityStatus: 'Elevated risk',
    service: 'Admin Console',
    requestedPermission: 'Admin',
    decision: 'DENY',
    relevantPolicyId: 'POL-003',
    relevantPolicyName: 'Risk-Adaptive Sensitive Service Guard',
    grantedLevel: 'Denied',
    reason:
      'Identity is flagged Elevated risk and requested Admin on sensitive service Admin Console.',
  },
];
