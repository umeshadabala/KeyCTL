export type NavPageId =
  | 'overview'
  | 'identities'
  | 'access-control'
  | 'key-management'
  | 'threat-detection'
  | 'trust-graph'
  | 'secure-messaging'
  | 'audit-center'
  | 'simulation-lab'
  | 'settings';

export type NavGroupId = 'OVERVIEW' | 'IDENTITY' | 'SECURITY' | 'OPERATIONS' | 'SYSTEM';

export interface NavItem {
  id: NavPageId;
  label: string;
  group: NavGroupId;
  breadcrumb: string;
  description: string;
  plannedCapabilities: string[];
  targetPhase: string;
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export type EventCategory = 'authentication' | 'access' | 'key_event' | 'revocation';

export type SeverityLevel = 'info' | 'low' | 'medium' | 'high';

export interface SecurityMetric {
  id: string;
  label: string;
  value: string;
  description: string;
  accentTone: StatusTone;
  statusTag: string;
  targetPage: NavPageId;
}

export interface ActivityPoint {
  timeLabel: string;
  authentication: number;
  access: number;
  keyEvents: number;
  revocations: number;
}

export interface SecurityEvent {
  id: string;
  description: string;
  category: EventCategory;
  identity: string;
  service: string;
  timestamp: string;
  relativeTime: string;
  severity: SeverityLevel;
  status: string;
  simulatedMetadata: {
    sourceIp: string;
    deviceId: string;
    policyResult: string;
    enforcementNote: string;
  };
}

export type ServiceHealthState = 'Healthy' | 'Advisory';

export interface ServiceNode {
  id: string;
  name: string;
  role: string;
  health: ServiceHealthState;
  lastActivity: string;
  latencyMs: number;
  simulatedEndpoint: string;
}

export interface PostureItem {
  id: string;
  label: string;
  stateLabel: string;
  tone: StatusTone;
  detail: string;
}

export interface SecurityAlert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  identity: string;
  service: string;
  reason: string;
  timestamp: string;
  acknowledged: boolean;
  simulatedRecommendation: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: StatusTone;
  read: boolean;
  targetPage?: NavPageId;
}

export type InspectionKind = 'event' | 'alert' | 'service' | 'identity' | 'device';

export interface InspectionSelection {
  kind: InspectionKind;
  id: string;
}

export interface FeedbackNotice {
  id: string;
  message: string;
  tone: StatusTone;
}
