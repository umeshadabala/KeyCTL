import { describe, expect, it } from 'vitest';
import { INITIAL_DEVICES } from '../../data/devices';
import { INITIAL_IDENTITIES } from '../../data/identities';
import {
  INITIAL_ALERTS,
  INITIAL_SECURITY_EVENTS,
  SERVICE_NODES,
} from '../../data/mockDashboardData';
import { NAV_ITEMS } from '../../data/navigation';
import {
  filterDevices,
  filterIdentities,
  filterSecurityAlerts,
  filterSecurityEvents,
  filterServiceNodes,
  searchQuickJumpResults,
} from '../telemetryFilters';

describe('telemetryFilters', () => {
  it('filters identities by status and search query', () => {
    expect(
      filterIdentities(INITIAL_IDENTITIES, { status: 'Suspended', query: '' }).map((i) => i.id),
    ).toEqual(['ID-110']);

    const byRole = filterIdentities(INITIAL_IDENTITIES, { status: 'all', query: 'Finance' });
    expect(byRole.some((i) => i.id === 'ID-107')).toBe(true);

    expect(
      filterIdentities(INITIAL_IDENTITIES, { status: 'Active', query: 'nonexistent-xyz' }),
    ).toEqual([]);
  });

  it('filters devices by trust state and search query', () => {
    const revoked = filterDevices(INITIAL_DEVICES, { trustState: 'Revoked', query: '' });
    expect(revoked).toHaveLength(1);
    expect(revoked[0].id).toBe('dev-win-003');

    const linux = filterDevices(INITIAL_DEVICES, { trustState: 'all', query: 'Linux' });
    expect(linux.length).toBeGreaterThan(0);
    expect(linux.every((d) => d.deviceType === 'Linux Workstation')).toBe(true);

    expect(
      filterDevices(INITIAL_DEVICES, { trustState: 'Trusted', query: 'no-such-device' }),
    ).toEqual([]);
  });

  it('filters alerts by title, identity, service, or reason', () => {
    expect(filterSecurityAlerts(INITIAL_ALERTS, '')).toHaveLength(INITIAL_ALERTS.length);

    const financeAlerts = filterSecurityAlerts(INITIAL_ALERTS, 'Finance');
    expect(financeAlerts).toHaveLength(1);
    expect(financeAlerts[0].id).toBe('ALT-041');

    expect(filterSecurityAlerts(INITIAL_ALERTS, 'unknown-token-999')).toEqual([]);
  });

  it('filters security events by category, serviceFilter, and search query', () => {
    const revocations = filterSecurityEvents(INITIAL_SECURITY_EVENTS, {
      category: 'revocation',
      serviceFilter: null,
      query: '',
    });
    expect(revocations).toHaveLength(1);
    expect(revocations[0].id).toBe('evt-1093');

    const financeEvents = filterSecurityEvents(INITIAL_SECURITY_EVENTS, {
      category: 'all',
      serviceFilter: 'Finance',
      query: '',
    });
    expect(financeEvents).toHaveLength(1);
    expect(financeEvents[0].identity).toBe('m.chen@sandbox.local');

    expect(
      filterSecurityEvents(INITIAL_SECURITY_EVENTS, {
        category: 'authentication',
        serviceFilter: 'Finance',
        query: 'nope',
      }),
    ).toEqual([]);
  });

  it('filters service nodes by name, role, or health state', () => {
    expect(filterServiceNodes(SERVICE_NODES, '')).toHaveLength(8);
    expect(filterServiceNodes(SERVICE_NODES, 'Advisory').map((s) => s.name)).toEqual(['Finance']);
    expect(filterServiceNodes(SERVICE_NODES, 'missing-node')).toEqual([]);
  });

  it('returns quick-jump search matches or null for blank query', () => {
    expect(
      searchQuickJumpResults({
        query: '   ',
        navItems: NAV_ITEMS,
        events: INITIAL_SECURITY_EVENTS,
        services: SERVICE_NODES,
      }),
    ).toBeNull();

    const matches = searchQuickJumpResults({
      query: 'Key',
      navItems: NAV_ITEMS,
      events: INITIAL_SECURITY_EVENTS,
      services: SERVICE_NODES,
    });
    expect(matches).not.toBeNull();
    expect(matches!.matchedPages.some((p) => p.id === 'key-management')).toBe(true);
    expect(matches!.matchedServices.some((s) => s.name === 'Key Service')).toBe(true);
  });
});
