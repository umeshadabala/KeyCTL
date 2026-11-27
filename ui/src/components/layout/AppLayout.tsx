import { type ReactNode, useState } from 'react';
import type {
  NavItem,
  NavPageId,
  NotificationItem,
  SecurityEvent,
  ServiceNode,
} from '../../types/security';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  currentNav: NavItem;
  onNavigate: (page: NavPageId) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unacknowledgedAlerts: number;
  notifications: NotificationItem[];
  unreadNotifications: number;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllRead: () => void;
  onResetDemoState: () => void;
  events: SecurityEvent[];
  services: ServiceNode[];
  onSelectEvent: (event: SecurityEvent) => void;
  onSelectService: (service: ServiceNode) => void;
  children: ReactNode;
}

export function AppLayout({
  currentNav,
  onNavigate,
  searchQuery,
  onSearchChange,
  unacknowledgedAlerts,
  notifications,
  unreadNotifications,
  onMarkNotificationRead,
  onMarkAllRead,
  onResetDemoState,
  events,
  services,
  onSelectEvent,
  onSelectService,
  children,
}: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#090A0B] text-[#F4F4F5]">
      <Sidebar
        activePage={currentNav.id}
        onNavigate={onNavigate}
        unacknowledgedAlerts={unacknowledgedAlerts}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          currentNav={currentNav}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onNavigate={onNavigate}
          notifications={notifications}
          unreadCount={unreadNotifications}
          onMarkNotificationRead={onMarkNotificationRead}
          onMarkAllRead={onMarkAllRead}
          onResetDemoState={onResetDemoState}
          onOpenMobileMenu={() => setMobileOpen(true)}
          events={events}
          services={services}
          onSelectEvent={onSelectEvent}
          onSelectService={onSelectService}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
