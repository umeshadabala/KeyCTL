export type DeviceTrustState = 'Trusted' | 'Pending verification' | 'Quarantined' | 'Revoked';

export type DeviceType =
  | 'macOS Workstation'
  | 'Linux Workstation'
  | 'Windows Endpoint'
  | 'Virtual Node';

export interface DeviceLifecycleEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  note: string;
}

export interface SyntheticDevice {
  id: string;
  name: string;
  identityId: string;
  identityHandle: string;
  deviceType: DeviceType;
  osVersion: string;
  registrationDate: string;
  lastSeen: string;
  trustState: DeviceTrustState;
  statusLabel: string;
  associatedServices: string[];
  lifecycleHistory: DeviceLifecycleEntry[];
}
