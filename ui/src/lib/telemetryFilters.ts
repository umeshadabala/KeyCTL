import type { DeviceTrustState, SyntheticDevice } from '../types/device';
import type { IdentityStatus, SyntheticIdentity } from '../types/identity';
import type {
  EventCategory,
  NavItem,
  SecurityAlert,
  SecurityEvent,
  ServiceNode,
} from '../types/security';

export function filterSecurityEvents(
  events: SecurityEvent[],
  filters: {
    category: 'all' | EventCategory;
    serviceFilter: string | null;
    query: string;
  },
): SecurityEvent[] {
  const q = filters.query.trim().toLowerCase();
  return events.filter((evt) => {
    if (filters.category !== 'all' && evt.category !== filters.category) {
      return false;
    }
    if (filters.serviceFilter && evt.service !== filters.serviceFilter) {
      return false;
    }
    if (q) {
      return (
        evt.description.toLowerCase().includes(q) ||
        evt.identity.toLowerCase().includes(q) ||
        evt.service.toLowerCase().includes(q) ||
        evt.status.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export function filterSecurityAlerts(alerts: SecurityAlert[], query: string): SecurityAlert[] {
  const q = query.trim().toLowerCase();
  if (!q) return alerts;
  return alerts.filter(
    (alert) =>
      alert.title.toLowerCase().includes(q) ||
      alert.identity.toLowerCase().includes(q) ||
      alert.reason.toLowerCase().includes(q) ||
      alert.service.toLowerCase().includes(q),
  );
}

export function filterServiceNodes(services: ServiceNode[], query: string): ServiceNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return services;
  return services.filter(
    (svc) =>
      svc.name.toLowerCase().includes(q) ||
      svc.role.toLowerCase().includes(q) ||
      svc.health.toLowerCase().includes(q),
  );
}

export function filterIdentities(
  identities: SyntheticIdentity[],
  filters: {
    status: 'all' | IdentityStatus;
    query: string;
  },
): SyntheticIdentity[] {
  const q = filters.query.trim().toLowerCase();
  return identities.filter((ident) => {
    if (filters.status !== 'all' && ident.status !== filters.status) {
      return false;
    }
    if (q) {
      return (
        ident.displayName.toLowerCase().includes(q) ||
        ident.id.toLowerCase().includes(q) ||
        ident.handle.toLowerCase().includes(q) ||
        ident.role.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export function filterDevices(
  devices: SyntheticDevice[],
  filters: {
    trustState: 'all' | DeviceTrustState;
    query: string;
  },
): SyntheticDevice[] {
  const q = filters.query.trim().toLowerCase();
  return devices.filter((dev) => {
    if (filters.trustState !== 'all' && dev.trustState !== filters.trustState) {
      return false;
    }
    if (q) {
      return (
        dev.name.toLowerCase().includes(q) ||
        dev.id.toLowerCase().includes(q) ||
        dev.identityHandle.toLowerCase().includes(q) ||
        dev.deviceType.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export function searchQuickJumpResults(params: {
  query: string;
  navItems: NavItem[];
  events: SecurityEvent[];
  services: ServiceNode[];
}) {
  const q = params.query.trim().toLowerCase();
  if (!q) return null;

  const matchedPages = params.navItems
    .filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
    )
    .slice(0, 3);

  const matchedEvents = params.events
    .filter(
      (evt) =>
        evt.description.toLowerCase().includes(q) ||
        evt.identity.toLowerCase().includes(q) ||
        evt.service.toLowerCase().includes(q),
    )
    .slice(0, 3);

  const matchedServices = params.services
    .filter((svc) => svc.name.toLowerCase().includes(q) || svc.role.toLowerCase().includes(q))
    .slice(0, 3);

  return { matchedPages, matchedEvents, matchedServices };
}
