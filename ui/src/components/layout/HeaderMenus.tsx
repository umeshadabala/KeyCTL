import { Bell, ChevronDown, RotateCcw, Settings, Shield, User } from 'lucide-react';
import type { RefObject } from 'react';
import { cn } from '../../lib/cn';
import type { NavPageId, NotificationItem } from '../../types/security';

interface NotificationsMenuProps {
  containerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onToggle: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (page: NavPageId) => void;
  onClose: () => void;
}

export function NotificationsMenu({
  containerRef,
  open,
  onToggle,
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
  onClose,
}: NotificationsMenuProps) {
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle notifications"
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[#27272A] bg-[#141517] text-[#A1A1AA] transition-colors hover:bg-[#19191C] hover:text-[#F4F4F5]"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-semibold text-[#090A0B]"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 max-w-[90vw] rounded-md border border-[#27272A] bg-[#141517] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272A] px-3 py-2.5">
            <div>
              <div className="text-xs font-semibold text-[#F4F4F5]">Notifications</div>
              <div className="text-[10px] text-[#71717A]">Sandbox demo feed</div>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-[11px] font-medium text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 divide-y divide-[#27272A] overflow-y-auto">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onMarkRead(item.id);
                  if (item.targetPage) onNavigate(item.targetPage);
                  onClose();
                }}
                className={cn(
                  'flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-[#19191C]',
                  !item.read && 'bg-[#19191C]/60',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#F4F4F5]">
                    {!item.read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    )}
                    <span className="truncate">{item.title}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[#71717A]">
                    {item.timestamp}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#A1A1AA]">{item.detail}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface OperatorMenuProps {
  containerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onToggle: () => void;
  onNavigateSettings: () => void;
  onResetDemoState: () => void;
}

export function OperatorMenu({
  containerRef,
  open,
  onToggle,
  onNavigateSettings,
  onResetDemoState,
}: OperatorMenuProps) {
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Operator profile menu"
        aria-expanded={open}
        className="flex h-8 items-center gap-2 rounded-md border border-[#27272A] bg-[#141517] px-2 text-xs text-[#A1A1AA] transition-colors hover:bg-[#19191C] hover:text-[#F4F4F5]"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#19191C] text-[#A1A1AA]">
          <User className="h-3 w-3" />
        </span>
        <span className="hidden font-medium text-[#F4F4F5] sm:inline">Security Operator</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#71717A]" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-60 rounded-md border border-[#27272A] bg-[#141517] p-1.5 shadow-xl">
          <div className="border-b border-[#27272A] px-2.5 py-2">
            <div className="text-xs font-semibold text-[#F4F4F5]">Security Operator</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
              <Shield className="h-3 w-3 text-[#71717A]" />
              <span>Organizer Sandbox Role</span>
            </div>
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={onNavigateSettings}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:bg-[#19191C] hover:text-[#F4F4F5]"
            >
              <Settings className="h-3.5 w-3.5 text-[#71717A]" />
              <span>Workspace Settings</span>
            </button>
            <button
              type="button"
              onClick={onResetDemoState}
              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:bg-[#19191C] hover:text-[#F4F4F5]"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#71717A]" />
              <span>Reset Demo State</span>
            </button>
          </div>
          <div className="border-t border-[#27272A] px-2.5 py-1.5 text-[10px] text-[#71717A]">
            Frontend prototype • No live auth
          </div>
        </div>
      )}
    </div>
  );
}
