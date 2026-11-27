import type { NavGroupId, NavItem } from '../types/security';

export const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: 'OVERVIEW', label: 'OVERVIEW' },
  { id: 'IDENTITY', label: 'IDENTITY' },
  { id: 'SECURITY', label: 'SECURITY' },
  { id: 'OPERATIONS', label: 'OPERATIONS' },
];

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    group: 'OVERVIEW',
    breadcrumb: 'Overview',
    description: 'Monitor identity trust, cryptographic state, access activity, and system integrity.',
    plannedCapabilities: [],
    targetPhase: 'Phase 1 (Active)',
  },
  {
    id: 'identities',
    label: 'Identities & Devices',
    group: 'IDENTITY',
    breadcrumb: 'Identity / Identities & Devices',
    description: 'Manage synthetic user identities, service principals, hardware device enrollments, and trust bindings.',
    plannedCapabilities: [
      'Identity directory with role and clearance metadata',
      'Enrolled device inventory and attestation status',
      'Simulated device quarantine and identity revocation controls',
    ],
    targetPhase: 'Phase 2',
  },
  {
    id: 'access-control',
    label: 'Access Control',
    group: 'IDENTITY',
    breadcrumb: 'Identity / Access Control',
    description: 'Inspect zero-trust policy rules, least-privilege service scopes, and simulated authorization decisions.',
    plannedCapabilities: [
      'Service-to-identity policy matrix',
      'Just-in-time access grant inspection',
      'Dry-run policy evaluation against synthetic identities',
    ],
    targetPhase: 'Phase 2',
  },
  {
    id: 'key-management',
    label: 'Key Management',
    group: 'SECURITY',
    breadcrumb: 'Security / Key Management',
    description: 'Track post-quantum cryptographic key lifecycles, rotation schedules, and simulated key revocation states.',
    plannedCapabilities: [
      'ML-KEM / ML-DSA key inventory and rotation timelines',
      'Key expiration and compromise simulation workflows',
      'Service key binding verification status',
    ],
    targetPhase: 'Phase 3',
  },
  {
    id: 'threat-detection',
    label: 'Threat Detection',
    group: 'SECURITY',
    breadcrumb: 'Security / Threat Detection',
    description: 'Review explainable anomaly detections, lateral movement indicators, and prioritized security findings.',
    plannedCapabilities: [
      'Explainable alert scoring and evidence breakdown',
      'Lateral movement path indicators across synthetic nodes',
      'Analyst triage and containment simulation actions',
    ],
    targetPhase: 'Phase 3',
  },
  {
    id: 'trust-graph',
    label: 'Trust Graph',
    group: 'SECURITY',
    breadcrumb: 'Security / Trust Graph',
    description: 'Visualize dynamic trust relationships between identities, devices, keys, and internal service nodes.',
    plannedCapabilities: [
      'Interactive identity-to-service topology map',
      'Blast radius highlighting on simulated compromise',
      'Trust score edge inspection',
    ],
    targetPhase: 'Phase 4',
  },
  {
    id: 'secure-messaging',
    label: 'Secure Messaging',
    group: 'OPERATIONS',
    breadcrumb: 'Operations / Secure Messaging',
    description: 'Prototype encrypted operator-to-operator channels bound to verified identities and active key pairs.',
    plannedCapabilities: [
      'End-to-end key-verified channel inspection',
      'Sender identity and key fingerprint verification',
      'Revocation impact testing on active sessions',
    ],
    targetPhase: 'Phase 4',
  },
  {
    id: 'audit-center',
    label: 'Audit Center',
    group: 'OPERATIONS',
    breadcrumb: 'Operations / Audit Center',
    description: 'Verify tamper-evident audit trails, hash-chain integrity proofs, and exportable compliance snapshots.',
    plannedCapabilities: [
      'Append-only event log integrity verification',
      'Cryptographic chain validation status',
      'Filterable compliance and incident export',
    ],
    targetPhase: 'Phase 5',
  },
  {
    id: 'simulation-lab',
    label: 'Simulation Lab',
    group: 'OPERATIONS',
    breadcrumb: 'Operations / Simulation Lab',
    description: 'Execute controlled synthetic attack scenarios, key compromise drills, and policy stress tests.',
    plannedCapabilities: [
      'Pre-built lateral movement and credential replay scenarios',
      'One-click key rotation and revocation drill triggers',
      'Live telemetry playback inside the Organizer Sandbox',
    ],
    targetPhase: 'Phase 5',
  },
  {
    id: 'settings',
    label: 'Settings',
    group: 'SYSTEM',
    breadcrumb: 'System / Settings',
    description: 'Configure Organizer Sandbox preferences, telemetry display intervals, and operator workspace options.',
    plannedCapabilities: [
      'Sandbox dataset reset and snapshot controls',
      'Alert threshold and notification preferences',
      'Backend API endpoint configuration (when available)',
    ],
    targetPhase: 'Phase 2',
  },
];

export function getNavItem(id: NavItem['id']): NavItem {
  return NAV_ITEMS.find((item) => item.id === id) ?? NAV_ITEMS[0];
}
