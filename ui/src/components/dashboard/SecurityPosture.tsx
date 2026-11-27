import { Info } from 'lucide-react';
import { SECURITY_POSTURE_ITEMS } from '../../data/mockDashboardData';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';
import { Tooltip } from '../ui/Tooltip';

export function SecurityPosture() {
  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Security Posture Summary"
        subtitle="Current prototype control plane status."
        badge={<StatusBadge tone="warning">Not yet enforced</StatusBadge>}
      />

      <div className="mt-3 divide-y divide-[#27272A] rounded border border-[#27272A] bg-[#090A0B]">
        {SECURITY_POSTURE_ITEMS.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs font-medium text-[#F4F4F5]">{item.label}</span>
              <Tooltip content={item.detail}>
                <button
                  type="button"
                  aria-label={`Details for ${item.label}`}
                  className="text-[#71717A] hover:text-[#F4F4F5] focus:outline-none"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
            <StatusBadge tone={item.tone}>{item.stateLabel}</StatusBadge>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[#71717A]">
        Frontend prototype only. Cryptographic enforcement, live revocation, and audit hashing
        will be connected in subsequent phases.
      </p>
    </section>
  );
}
