import {
  FileCheck2,
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  Lock,
  MessageSquareLock,
  Network,
  Settings,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { NAV_GROUPS, NAV_ITEMS } from '../../data/navigation';
import { cn } from '../../lib/cn';
import type { NavPageId } from '../../types/security';

interface SidebarProps {
  activePage: NavPageId;
  onNavigate: (page: NavPageId) => void;
  unacknowledgedAlerts: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const PAGE_ICONS: Record<NavPageId, ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  identities: Users,
  'access-control': Lock,
  'key-management': KeyRound,
  'threat-detection': ShieldAlert,
  'trust-graph': Network,
  'secure-messaging': MessageSquareLock,
  'audit-center': FileCheck2,
  'simulation-lab': FlaskConical,
  settings: Settings,
};

export function Sidebar({
  activePage,
  onNavigate,
  unacknowledgedAlerts,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleSelect = (page: NavPageId) => {
    onNavigate(page);
    onCloseMobile();
  };

  const sidebarBody = (
    <div className="flex h-full flex-col border-r border-[#27272A] bg-[#0D0E10] text-[#A1A1AA]">
      {/* Compact monochrome brand header */}
      <div className="flex h-13 items-center justify-between border-b border-[#27272A] px-4">
        <button
          type="button"
          onClick={() => handleSelect('overview')}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded border border-[#27272A] bg-[#19191C] text-[#F4F4F5]">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div className="leading-tight">
            <div className="text-xs font-semibold tracking-tight text-[#F4F4F5]">KeyCtl</div>
            <div className="text-[10px] text-[#71717A]">Zero Blind Trust</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="rounded p-1 text-[#71717A] hover:bg-[#19191C] hover:text-[#F4F4F5] lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation groups */}
      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-5">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group.id);
          return (
            <div key={group.id}>
              <div className="mb-1 px-2 text-[10px] font-medium tracking-[0.08em] text-[#71717A]">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = PAGE_ICONS[item.id];
                  const isActive = activePage === item.id;
                  const showAlertCount =
                    item.id === 'threat-detection' && unacknowledgedAlerts > 0;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group relative flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-medium transition-colors',
                          isActive
                            ? 'bg-[#19191C] text-[#F4F4F5]'
                            : 'text-[#A1A1AA] hover:bg-[#141517] hover:text-[#F4F4F5]',
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#F4F4F5]"
                          />
                        )}
                        <span className="flex items-center gap-2 truncate">
                          <Icon
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 transition-colors',
                              isActive
                                ? 'text-[#F4F4F5]'
                                : 'text-[#71717A] group-hover:text-[#A1A1AA]',
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </span>
                        {showAlertCount && (
                          <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-400">
                            {String(unacknowledgedAlerts).padStart(2, '0')}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[#27272A] p-2.5 space-y-1.5">
        <div className="flex items-center justify-between rounded px-2 py-1.5 text-[11px]">
          <span className="text-[#71717A]">Environment</span>
          <span className="rounded border border-[#27272A] bg-[#141517] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#A1A1AA]">
            SANDBOX
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleSelect('settings')}
          aria-current={activePage === 'settings' ? 'page' : undefined}
          className={cn(
            'relative flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-medium transition-colors',
            activePage === 'settings'
              ? 'bg-[#19191C] text-[#F4F4F5]'
              : 'text-[#A1A1AA] hover:bg-[#141517] hover:text-[#F4F4F5]',
          )}
        >
          {activePage === 'settings' && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[#F4F4F5]"
            />
          )}
          <Settings
            className={cn(
              'h-3.5 w-3.5',
              activePage === 'settings' ? 'text-[#F4F4F5]' : 'text-[#71717A]',
            )}
          />
          <span>Settings</span>
        </button>

        <div className="flex items-center gap-2.5 rounded border border-[#27272A] bg-[#141517] px-2.5 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#27272A] bg-[#19191C] text-[#A1A1AA]">
            <User className="h-3 w-3" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-[#F4F4F5]">Security Operator</div>
            <div className="truncate text-[10px] text-[#71717A]">Sandbox Session • Local</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-56 shrink-0 lg:block">{sidebarBody}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-60 max-w-[85vw]">{sidebarBody}</aside>
        </div>
      )}
    </>
  );
}
