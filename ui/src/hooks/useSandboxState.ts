import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_EVALUATION_HISTORY,
  INITIAL_PERMISSIONS,
} from '../data/accessPolicies';
import { INITIAL_DEVICES } from '../data/devices';
import { INITIAL_IDENTITIES } from '../data/identities';
import {
  INITIAL_ALERTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SECURITY_EVENTS,
  SERVICE_NODES,
} from '../data/mockDashboardData';
import { evaluateSyntheticAccess } from '../lib/evaluateAccess';
import {
  type DeviceActionKind,
  type ResolvedInspectionTarget,
  applyDeviceAction,
  applyPermissionUpdate,
  createAccessSimulationEvent,
  formatUtcTime,
  nextSandboxId,
  resolveInspectionTarget,
} from '../lib/sandboxDomain';
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
  EventCategory,
  FeedbackNotice,
  InspectionSelection,
  NavPageId,
  NotificationItem,
  SecurityAlert,
  SecurityEvent,
} from '../types/security';

export type { FeedbackNotice } from '../types/security';
export type InspectionTarget = ResolvedInspectionTarget;

export function useSandboxState() {
  const [activePage, setActivePage] = useState<NavPageId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<'all' | EventCategory>('all');
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [activityRange, setActivityRange] = useState<'24h' | '7d'>('24h');

  const [events, setEvents] = useState<SecurityEvent[]>(INITIAL_SECURITY_EVENTS);
  const [alerts, setAlerts] = useState<SecurityAlert[]>(INITIAL_ALERTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [identities, setIdentities] = useState<SyntheticIdentity[]>(INITIAL_IDENTITIES);
  const [devices, setDevices] = useState<SyntheticDevice[]>(INITIAL_DEVICES);
  const [permissions, setPermissions] = useState<PermissionEntry[]>(INITIAL_PERMISSIONS);
  const [evaluationHistory, setEvaluationHistory] = useState<AccessEvaluationResult[]>(
    INITIAL_EVALUATION_HISTORY,
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedLabel, setLastSyncedLabel] = useState('Synced just now (Simulated)');
  const [inspectionSelection, setInspectionSelection] = useState<InspectionSelection | null>(null);
  const [feedback, setFeedback] = useState<FeedbackNotice | null>(null);

  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInspectionSelection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedInspection = useMemo(
    () =>
      resolveInspectionTarget(inspectionSelection, {
        events,
        alerts,
        services: SERVICE_NODES,
        identities,
        devices,
      }),
    [inspectionSelection, events, alerts, identities, devices],
  );

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const navigateTo = useCallback((page: NavPageId) => {
    setActivePage(page);
    setInspectionSelection(null);
    setFeedback(null);
  }, []);

  const toggleAlertAcknowledge = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: !alert.acknowledged } : alert,
      ),
    );
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const executeDeviceAction = useCallback(
    (deviceId: string, action: DeviceActionKind, reason?: string) => {
      const transition = applyDeviceAction({
        devices,
        identities,
        deviceId,
        action,
        reason,
      });
      if (!transition) return;

      setDevices(transition.devices);
      setIdentities(transition.identities);
      setEvents((prev) => [transition.event, ...prev]);
      setFeedback(transition.feedback);
    },
    [devices, identities],
  );

  const quarantineDevice = useCallback(
    (deviceId: string, reason?: string) => executeDeviceAction(deviceId, 'quarantine', reason),
    [executeDeviceAction],
  );

  const restoreDevice = useCallback(
    (deviceId: string) => executeDeviceAction(deviceId, 'restore'),
    [executeDeviceAction],
  );

  const revokeDevice = useCallback(
    (deviceId: string, reason?: string) => executeDeviceAction(deviceId, 'revoke', reason),
    [executeDeviceAction],
  );

  const updatePermissionLevel = useCallback(
    (identityId: string, service: ServiceName, level: PermissionLevel) => {
      const identity = identities.find((i) => i.id === identityId);
      if (!identity) return;

      const update = applyPermissionUpdate({ permissions, identity, service, level });
      setPermissions(update.permissions);
      setEvents((prev) => [update.event, ...prev]);
      setFeedback(update.feedback);
    },
    [identities, permissions],
  );

  const runAccessSimulation = useCallback(
    (identityId: string, service: ServiceName, requestedPermission: RequestedPermission) => {
      const identity = identities.find((i) => i.id === identityId);
      if (!identity) return null;

      const result = evaluateSyntheticAccess({
        identity,
        devices,
        permissions,
        service,
        requestedPermission,
      });

      const simEvent = createAccessSimulationEvent(
        identity,
        service,
        requestedPermission,
        result,
      );

      setEvaluationHistory((prev) => [result, ...prev]);
      setEvents((prev) => [simEvent, ...prev]);
      return result;
    },
    [identities, devices, permissions],
  );

  const triggerSimulatedRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
    setIsRefreshing(true);
    refreshTimerRef.current = window.setTimeout(() => {
      setIsRefreshing(false);
      setLastSyncedLabel(`Refreshed ${formatUtcTime()} (Demo data)`);
      refreshTimerRef.current = null;
    }, 550);
  }, []);

  const resetDemoState = useCallback(() => {
    setEvents(INITIAL_SECURITY_EVENTS);
    setAlerts(INITIAL_ALERTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setIdentities(INITIAL_IDENTITIES);
    setDevices(INITIAL_DEVICES);
    setPermissions(INITIAL_PERMISSIONS);
    setEvaluationHistory(INITIAL_EVALUATION_HISTORY);
    setSearchQuery('');
    setEventCategoryFilter('all');
    setServiceFilter(null);
    setInspectionSelection(null);
    setFeedback({
      id: nextSandboxId('fb'),
      message: 'All Organizer Sandbox demo datasets reset to initial state.',
      tone: 'neutral',
    });
    setLastSyncedLabel('Demo state reset (Simulated)');
  }, []);

  const selectInspectionTarget = useCallback((target: ResolvedInspectionTarget) => {
    setInspectionSelection(target ? { kind: target.kind, id: target.item.id } : null);
  }, []);

  const unacknowledgedAlertCount = useMemo(
    () => alerts.filter((a) => !a.acknowledged).length,
    [alerts],
  );
  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return {
    activePage,
    navigateTo,
    searchQuery,
    setSearchQuery,
    eventCategoryFilter,
    setEventCategoryFilter,
    serviceFilter,
    setServiceFilter,
    activityRange,
    setActivityRange,
    alerts,
    unacknowledgedAlertCount,
    toggleAlertAcknowledge,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    events,
    services: SERVICE_NODES,
    identities,
    devices,
    permissions,
    evaluationHistory,
    quarantineDevice,
    restoreDevice,
    revokeDevice,
    updatePermissionLevel,
    runAccessSimulation,
    isRefreshing,
    lastSyncedLabel,
    triggerSimulatedRefresh,
    selectedInspection,
    setSelectedInspection: selectInspectionTarget,
    feedback,
    clearFeedback,
    resetDemoState,
  };
}
