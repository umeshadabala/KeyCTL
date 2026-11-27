import { ChevronRight, Menu } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NAV_ITEMS } from '../../data/navigation';
import { cn } from '../../lib/cn';
import { searchQuickJumpResults } from '../../lib/telemetryFilters';
import type {
  NavItem,
  NavPageId,
  NotificationItem,
  SecurityEvent,
  ServiceNode,
} from '../../types/security';
import { Search } from '../ui/Search';
import { StatusBadge } from '../ui/StatusBadge';
import { NotificationsMenu, OperatorMenu } from './HeaderMenus';

interface HeaderProps {
  currentNav: NavItem;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (page: NavPageId) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllRead: () => void;
  onResetDemoState: () => void;
  onOpenMobileMenu: () => void;
  events: SecurityEvent[];
  services: ServiceNode[];
  onSelectEvent: (event: SecurityEvent) => void;
  onSelectService: (service: ServiceNode) => void;
}

export function Header({
  currentNav,
  searchQuery,
  onSearchChange,
  onNavigate,
  notifications,
  unreadCount,
  onMarkNotificationRead,
  onMarkAllRead,
  onResetDemoState,
  onOpenMobileMenu,
  events,
  services,
  onSelectEvent,
  onSelectService,
}: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSearchFocused(false);
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(
    () =>
      searchQuickJumpResults({
        query: searchQuery,
        navItems: NAV_ITEMS,
        events,
        services,
      }),
    [searchQuery, events, services],
  );

  const breadcrumbParts = currentNav.breadcrumb.split(' / ');

  return (
    <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center justify-between gap-3 border-b border-[#27272A] bg-[#090A0B] px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded border border-[#27272A] bg-[#141517] p-1.5 text-[#A1A1AA] hover:text-[#F4F4F5] lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
            <span className="hidden text-xs font-medium text-[#71717A] sm:inline">KeyCtl</span>
            {breadcrumbParts.map((part, idx) => (
              <span key={part} className="flex items-center gap-1.5 truncate">
                <ChevronRight
                  className={cn('h-3 w-3 text-[#52525B]', idx === 0 && 'hidden sm:inline')}
                />
                <span
                  className={cn(
                    'truncate',
                    idx === breadcrumbParts.length - 1
                      ? 'text-[13px] font-semibold text-[#F4F4F5]'
                      : 'hidden text-xs text-[#A1A1AA] sm:inline',
                  )}
                >
                  {part}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="hidden md:flex">
          <StatusBadge tone="neutral">Organizer Sandbox</StatusBadge>
        </div>

        <div ref={searchBoxRef} className="relative w-40 sm:w-60 lg:w-68">
          <Search
            ref={searchInputRef}
            value={searchQuery}
            onChange={(val) => {
              onSearchChange(val);
              setSearchFocused(true);
            }}
            placeholder="Filter or jump..."
          />
          {searchFocused && searchResults && (
            <div className="absolute right-0 top-10 z-50 w-80 max-w-[90vw] rounded-md border border-[#27272A] bg-[#141517] p-2 shadow-xl">
              <div className="mb-1.5 flex items-center justify-between px-2 text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
                <span>Quick Results (Simulated)</span>
                <span className="font-mono">ESC</span>
              </div>

              {searchResults.matchedPages.length === 0 &&
              searchResults.matchedEvents.length === 0 &&
              searchResults.matchedServices.length === 0 ? (
                <div className="px-2 py-4 text-center text-xs text-[#71717A]">
                  No matching modules, events, or nodes.
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {searchResults.matchedPages.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-medium text-[#71717A]">
                        Modules
                      </div>
                      {searchResults.matchedPages.map((page) => (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => {
                            onNavigate(page.id);
                            setSearchFocused(false);
                          }}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-[#F4F4F5] hover:bg-[#19191C]"
                        >
                          <span>{page.label}</span>
                          <span className="text-[10px] text-[#71717A]">{page.targetPhase}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.matchedEvents.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-medium text-[#71717A]">
                        Recent Events
                      </div>
                      {searchResults.matchedEvents.map((evt) => (
                        <button
                          key={evt.id}
                          type="button"
                          onClick={() => {
                            onNavigate('overview');
                            onSelectEvent(evt);
                            setSearchFocused(false);
                          }}
                          className="flex w-full flex-col rounded px-2 py-1.5 text-left hover:bg-[#19191C]"
                        >
                          <span className="truncate text-xs text-[#F4F4F5]">
                            {evt.description}
                          </span>
                          <span className="truncate font-mono text-[10px] text-[#71717A]">
                            {evt.identity} • {evt.service}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.matchedServices.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-[10px] font-medium text-[#71717A]">
                        Service Nodes
                      </div>
                      {searchResults.matchedServices.map((svc) => (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => {
                            onNavigate('overview');
                            onSelectService(svc);
                            setSearchFocused(false);
                          }}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-[#F4F4F5] hover:bg-[#19191C]"
                        >
                          <span>{svc.name}</span>
                          <span
                            className={cn(
                              'text-[10px]',
                              svc.health === 'Healthy' ? 'text-green-400' : 'text-amber-400',
                            )}
                          >
                            {svc.health}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <NotificationsMenu
          containerRef={notifRef}
          open={notifOpen}
          onToggle={() => {
            setNotifOpen((o) => !o);
            setProfileOpen(false);
          }}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={onMarkNotificationRead}
          onMarkAllRead={onMarkAllRead}
          onNavigate={onNavigate}
          onClose={() => setNotifOpen(false)}
        />

        <OperatorMenu
          containerRef={profileRef}
          open={profileOpen}
          onToggle={() => {
            setProfileOpen((o) => !o);
            setNotifOpen(false);
          }}
          onNavigateSettings={() => {
            onNavigate('settings');
            setProfileOpen(false);
          }}
          onResetDemoState={() => {
            onResetDemoState();
            setProfileOpen(false);
          }}
        />
      </div>
    </header>
  );
}
