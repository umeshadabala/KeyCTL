import { describe, expect, it } from 'vitest';
import {
  applyDeviceAction,
  canPerformDeviceAction,
  recalculateIdentitiesTrust,
  resolveInspectionTarget,
} from '../sandboxDomain';
import type { SyntheticDevice } from '../../types/device';
import type { SyntheticIdentity } from '../../types/identity';
import type { SecurityAlert, SecurityEvent, ServiceNode } from '../../types/security';

function makeIdentities(): SyntheticIdentity[] {
  return [
    {
      id: 'ID-1',
      displayName: 'Alice Alpha',
      handle: 'alice@sandbox.local',
      identityType: 'Human Operator',
      role: 'Infra Lead',
      department: 'Platform',
      status: 'Active',
      trustStatus: 'Verified',
      lastActivity: '5m ago',
      associatedServices: ['Admin Console'],
      notes: 'Fixture active identity',
    },
    {
      id: 'ID-2',
      displayName: 'Bob Beta',
      handle: 'bob@sandbox.local',
      identityType: 'Human Operator',
      role: 'Security Engineer',
      department: 'Security',
      status: 'Elevated risk',
      trustStatus: 'Review required',
      lastActivity: '2m ago',
      associatedServices: ['Identity Service'],
      notes: 'Fixture elevated risk identity',
    },
  ];
}

function makeDevices(): SyntheticDevice[] {
  return [
    {
      id: 'dev-1',
      name: 'alice-mac-1',
      identityId: 'ID-1',
      identityHandle: 'alice@sandbox.local',
      deviceType: 'macOS Workstation',
      osVersion: 'macOS 15.3',
      registrationDate: '2026-10-01',
      lastSeen: '5m ago',
      trustState: 'Trusted',
      statusLabel: 'Attested (Demo)',
      associatedServices: ['Admin Console'],
      lifecycleHistory: [],
    },
    {
      id: 'dev-2',
      name: 'bob-linux-1',
      identityId: 'ID-2',
      identityHandle: 'bob@sandbox.local',
      deviceType: 'Linux Workstation',
      osVersion: 'Ubuntu 24.04',
      registrationDate: '2026-10-02',
      lastSeen: '2m ago',
      trustState: 'Trusted',
      statusLabel: 'Attested (Demo)',
      associatedServices: ['Identity Service'],
      lifecycleHistory: [],
    },
  ];
}

describe('sandboxDomain — device lifecycle & identity trust', () => {
  it('quarantines a trusted device, records lifecycle & event, and restricts single-device owner trust', () => {
    const identities = makeIdentities();
    const devices = makeDevices();

    const result = applyDeviceAction({
      devices,
      identities,
      deviceId: 'dev-1',
      action: 'quarantine',
      reason: 'Stale endpoint posture',
    });

    expect(result).not.toBeNull();
    const updatedDevice = result!.devices.find((d) => d.id === 'dev-1')!;
    expect(updatedDevice.trustState).toBe('Quarantined');
    expect(updatedDevice.statusLabel).toBe('Quarantined (Sim)');
    expect(updatedDevice.lifecycleHistory[0].note).toBe('Stale endpoint posture');
    expect(result!.event.description).toBe('Device quarantined (alice-mac-1)');
    expect(result!.feedback.tone).toBe('warning');

    // Owner identity trust drops to Restricted; unrelated identity remains untouched
    expect(result!.identities.find((i) => i.id === 'ID-1')?.trustStatus).toBe('Restricted');
    expect(result!.identities.find((i) => i.id === 'ID-2')?.trustStatus).toBe('Review required');
    expect(result!.identities.find((i) => i.id === 'ID-2')?.lastActivity).toBe('2m ago');
  });

  it('restores a quarantined device back to Trusted and restores Active owner trust to Verified', () => {
    const identities = makeIdentities();
    const devices = makeDevices();

    const quarantined = applyDeviceAction({
      devices,
      identities,
      deviceId: 'dev-1',
      action: 'quarantine',
    })!;

    const restored = applyDeviceAction({
      devices: quarantined.devices,
      identities: quarantined.identities,
      deviceId: 'dev-1',
      action: 'restore',
    });

    expect(restored).not.toBeNull();
    expect(restored!.devices.find((d) => d.id === 'dev-1')?.trustState).toBe('Trusted');
    expect(restored!.identities.find((i) => i.id === 'ID-1')?.trustStatus).toBe('Verified');
    expect(restored!.feedback.tone).toBe('success');
  });

  it('sets Active multi-device owner to Review required when one device is quarantined and another stays Trusted', () => {
    const identities = makeIdentities();
    const devices: SyntheticDevice[] = [
      ...makeDevices(),
      {
        ...makeDevices()[0],
        id: 'dev-1b',
        name: 'alice-mac-2',
      },
    ];

    const result = applyDeviceAction({
      devices,
      identities,
      deviceId: 'dev-1',
      action: 'quarantine',
    })!;

    expect(result.identities.find((i) => i.id === 'ID-1')?.trustStatus).toBe('Review required');
  });

  it('revokes a device, clears its associated services, and blocks restore attempts', () => {
    const identities = makeIdentities();
    const devices = makeDevices();

    const revoked = applyDeviceAction({
      devices,
      identities,
      deviceId: 'dev-1',
      action: 'revoke',
      reason: 'Lost hardware',
    });

    expect(revoked).not.toBeNull();
    const revokedDev = revoked!.devices.find((d) => d.id === 'dev-1')!;
    expect(revokedDev.trustState).toBe('Revoked');
    expect(revokedDev.associatedServices).toEqual([]);
    expect(revoked!.event.severity).toBe('high');
    expect(canPerformDeviceAction(revokedDev, 'restore')).toBe(false);
    expect(canPerformDeviceAction(revokedDev, 'quarantine')).toBe(false);
    expect(canPerformDeviceAction(revokedDev, 'revoke')).toBe(false);

    const restoreAttempt = applyDeviceAction({
      devices: revoked!.devices,
      identities: revoked!.identities,
      deviceId: 'dev-1',
      action: 'restore',
    });
    expect(restoreAttempt).toBeNull();
  });

  it('rejects invalid transitions and unknown device IDs', () => {
    const identities = makeIdentities();
    const devices = makeDevices();

    // Already Trusted -> restore is invalid
    expect(
      applyDeviceAction({ devices, identities, deviceId: 'dev-1', action: 'restore' }),
    ).toBeNull();

    // Unknown device ID
    expect(
      applyDeviceAction({ devices, identities, deviceId: 'dev-missing', action: 'quarantine' }),
    ).toBeNull();

    // Already Quarantined -> quarantine again is invalid
    const quarantined = applyDeviceAction({
      devices,
      identities,
      deviceId: 'dev-1',
      action: 'quarantine',
    })!;
    expect(
      applyDeviceAction({
        devices: quarantined.devices,
        identities: quarantined.identities,
        deviceId: 'dev-1',
        action: 'quarantine',
      }),
    ).toBeNull();
  });

  it('keeps Elevated risk identity at Review required while at least one Trusted device exists', () => {
    const identities = makeIdentities();
    const devices: SyntheticDevice[] = [
      ...makeDevices(),
      {
        ...makeDevices()[1],
        id: 'dev-2b',
        name: 'bob-linux-2',
        trustState: 'Trusted',
      },
    ];

    const updated = recalculateIdentitiesTrust(identities, devices, 'ID-2');
    expect(updated.find((i) => i.id === 'ID-2')?.trustStatus).toBe('Review required');
  });
});

describe('sandboxDomain — resolveInspectionTarget', () => {
  it('resolves live updated device and alert state instead of stale snapshots', () => {
    const identities = makeIdentities();
    const devices = makeDevices();
    const events: SecurityEvent[] = [];
    const services: ServiceNode[] = [];
    const alerts: SecurityAlert[] = [
      {
        id: 'ALT-1',
        severity: 'high',
        title: 'Test alert',
        identity: 'alice@sandbox.local',
        service: 'Admin Console',
        reason: 'Test reason',
        timestamp: '1m ago',
        acknowledged: false,
        simulatedRecommendation: 'Review',
      },
    ];

    const transitioned = applyDeviceAction({
      devices,
      identities,
      deviceId: 'dev-1',
      action: 'quarantine',
    })!;

    const resolvedDevice = resolveInspectionTarget(
      { kind: 'device', id: 'dev-1' },
      {
        events,
        alerts,
        services,
        identities: transitioned.identities,
        devices: transitioned.devices,
      },
    );

    expect(resolvedDevice?.kind).toBe('device');
    if (resolvedDevice?.kind === 'device') {
      expect(resolvedDevice.item.trustState).toBe('Quarantined');
    }

    const updatedAlerts = alerts.map((a) => ({ ...a, acknowledged: true }));
    const resolvedAlert = resolveInspectionTarget(
      { kind: 'alert', id: 'ALT-1' },
      {
        events,
        alerts: updatedAlerts,
        services,
        identities,
        devices,
      },
    );
    expect(resolvedAlert?.kind).toBe('alert');
    if (resolvedAlert?.kind === 'alert') {
      expect(resolvedAlert.item.acknowledged).toBe(true);
    }

    expect(
      resolveInspectionTarget(null, { events, alerts, services, identities, devices }),
    ).toBeNull();
    expect(
      resolveInspectionTarget(
        { kind: 'device', id: 'nonexistent' },
        { events, alerts, services, identities, devices },
      ),
    ).toBeNull();
  });
});
