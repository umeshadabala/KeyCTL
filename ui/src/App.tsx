import { useState } from 'react';
import { InspectionDrawer } from './components/dashboard/InspectionDrawer';
import { AppLayout } from './components/layout/AppLayout';
import { ConfirmModal } from './components/ui/ConfirmModal';
import { getNavItem } from './data/navigation';
import { useSandboxState } from './hooks/useSandboxState';
import { useLiveKeyctlState } from './hooks/useLiveKeyctlState';
import type { DeviceActionKind } from './lib/sandboxDomain';
import { LiveAccessControlPage, LiveIdentitiesPage, LiveOverviewPage } from './pages/LiveCorePages';
import { DataIngestionPage } from './pages/DataIngestionPage';
import { BackendOperationsPage } from './pages/BackendOperationsPage';
import type { SyntheticDevice } from './types/device';

interface PendingDeviceAction {
  action: DeviceActionKind;
  device: SyntheticDevice;
}

function getModalCopy(pending: PendingDeviceAction | null) {
  if (!pending) {
    return {
      title: '',
      description: '',
      confirmLabel: '',
      tone: 'warning' as const,
      requireReason: false,
      warningNote: undefined,
    };
  }

  const { action, device } = pending;
  if (action === 'quarantine') {
    return {
      title: `Quarantine ${device.name}?`,
      description: `This places ${device.id} (${device.identityHandle}) into simulated Quarantine and updates local trust posture indicators.`,
      confirmLabel: 'Confirm Quarantine (Sim)',
      tone: 'warning' as const,
      requireReason: true,
      warningNote: undefined,
    };
  }
  if (action === 'restore') {
    return {
      title: `Restore ${device.name} to Trusted?`,
      description: `This restores ${device.id} (${device.identityHandle}) to Trusted state in the Organizer Sandbox.`,
      confirmLabel: 'Confirm Restore (Sim)',
      tone: 'success' as const,
      requireReason: false,
      warningNote: undefined,
    };
  }
  return {
    title: `Revoke ${device.name}?`,
    description: `This permanently revokes ${device.id} (${device.identityHandle}) inside the Organizer Sandbox.`,
    confirmLabel: 'Confirm Revoke (Sim)',
    tone: 'danger' as const,
    requireReason: true,
    warningNote:
      'Revoked devices cannot be restored through a simple restore action in the sandbox.',
  };
}

export function App() {
  const {
    activePage,
    navigateTo,
    searchQuery,
    setSearchQuery,
    setServiceFilter,
    unacknowledgedAlertCount,
    toggleAlertAcknowledge,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    events,
    services,
    identities,
    devices,
    permissions,
    quarantineDevice,
    restoreDevice,
    revokeDevice,
    selectedInspection,
    setSelectedInspection,
    resetDemoState,
  } = useSandboxState();

  const [pendingDeviceAction, setPendingDeviceAction] = useState<PendingDeviceAction | null>(
    null,
  );

  const live = useLiveKeyctlState(2500);
  const currentNav = getNavItem(activePage);
  const modalCopy = getModalCopy(pendingDeviceAction);

  const handleConfirmDeviceAction = (reason?: string) => {
    if (!pendingDeviceAction) return;
    const { action, device } = pendingDeviceAction;

    if (action === 'quarantine') {
      quarantineDevice(device.id, reason);
    } else if (action === 'restore') {
      restoreDevice(device.id);
    } else {
      revokeDevice(device.id, reason);
    }
    setPendingDeviceAction(null);
  };

  const renderPage = () => {
    if (activePage === 'overview') {
      return (
        <LiveOverviewPage
          overview={live.overview}
          loading={live.loading}
          error={live.error}
          onRefresh={live.refresh}
        />
      );
    }

    if (activePage === 'identities') {
      return (
        <LiveIdentitiesPage
          overview={live.overview}
          loading={live.loading}
          error={live.error}
          onRefresh={live.refresh}
        />
      );
    }

    if (activePage === 'access-control') {
      return (
        <LiveAccessControlPage
          overview={live.overview}
          loading={live.loading}
          error={live.error}
          onRefresh={live.refresh}
        />
      );
    }

    if (activePage === 'simulation-lab') {
      return <DataIngestionPage overview={live.overview} onRefresh={live.refresh} />;
    }

    return (
      <BackendOperationsPage
        pageId={currentNav.id}
        title={currentNav.label}
        description={currentNav.description}
      />
    );
  };

  return (
    <>
      <AppLayout
        currentNav={currentNav}
        onNavigate={navigateTo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unacknowledgedAlerts={unacknowledgedAlertCount}
        notifications={notifications}
        unreadNotifications={unreadNotificationCount}
        onMarkNotificationRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
        onResetDemoState={resetDemoState}
        events={events}
        services={services}
        onSelectEvent={(event) => setSelectedInspection({ kind: 'event', item: event })}
        onSelectService={(service) => setSelectedInspection({ kind: 'service', item: service })}
      >
        {renderPage()}
      </AppLayout>

      <InspectionDrawer
        target={selectedInspection}
        identities={identities}
        devices={devices}
        events={events}
        permissions={permissions}
        onClose={() => setSelectedInspection(null)}
        onSelectInspection={setSelectedInspection}
        onToggleAlertAcknowledge={toggleAlertAcknowledge}
        onFilterByService={(serviceName) => {
          navigateTo('overview');
          setServiceFilter(serviceName);
        }}
        onRequestDeviceAction={(action, device) =>
          setPendingDeviceAction({ action, device })
        }
      />

      <ConfirmModal
        open={Boolean(pendingDeviceAction)}
        title={modalCopy.title}
        description={modalCopy.description}
        confirmLabel={modalCopy.confirmLabel}
        tone={modalCopy.tone}
        requireReason={modalCopy.requireReason}
        warningNote={modalCopy.warningNote}
        onCancel={() => setPendingDeviceAction(null)}
        onConfirm={handleConfirmDeviceAction}
      />
    </>
  );
}

export default App;
