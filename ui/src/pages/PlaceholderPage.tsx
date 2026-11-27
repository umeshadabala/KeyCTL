import { ArrowLeft, Construction, Layers } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { NavItem, NavPageId } from '../types/security';

interface PlaceholderPageProps {
  navItem: NavItem;
  onNavigate: (page: NavPageId) => void;
}

export function PlaceholderPage({ navItem, onNavigate }: PlaceholderPageProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-[#27272A] bg-[#141517] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-[#F4F4F5] sm:text-lg">
                {navItem.label}
              </h1>
              <StatusBadge tone="warning" dot>
                Module under development
              </StatusBadge>
              <StatusBadge tone="neutral">{navItem.targetPhase}</StatusBadge>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-[#A1A1AA]">
              {navItem.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className="inline-flex items-center gap-1.5 rounded border border-[#27272A] bg-[#19191C] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] transition-colors hover:border-[#3F3F46]"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#A1A1AA]" />
            <span>Back to Overview</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-md border border-[#27272A] bg-[#141517] p-5 lg:col-span-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
            <Layers className="h-4 w-4 text-[#71717A]" />
            <span>Planned Module Scope</span>
          </div>

          <ul className="mt-4 space-y-2">
            {navItem.plannedCapabilities.map((cap) => (
              <li
                key={cap}
                className="flex items-start gap-2.5 rounded border border-[#27272A] bg-[#090A0B] px-3.5 py-2.5 text-xs text-[#F4F4F5]"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#71717A]"
                />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-between rounded-md border border-[#27272A] bg-[#141517] p-5">
          <div>
            <div className="flex h-8 w-8 items-center justify-center rounded border border-[#27272A] bg-[#19191C] text-amber-400">
              <Construction className="h-4 w-4" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-[#F4F4F5]">
              Architecture Scaffold
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#A1A1AA]">
              This route is intentionally stubbed while modules are delivered incrementally,
              keeping navigation and layout structure consistent across KeyCtl.
            </p>
          </div>

          <div className="mt-5 rounded border border-[#27272A] bg-[#090A0B] p-3 text-[11px] text-[#A1A1AA]">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
              Sandbox Status
            </div>
            <div className="mt-1 text-[#F4F4F5]">
              Not yet enforced • Pending {navItem.targetPhase} implementation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
