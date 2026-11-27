import { ACCESS_POLICIES } from '../../data/accessPolicies';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

export function PolicyOverview() {
  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Policy Overview"
        subtitle="Deterministic local sandbox policies used during simulated evaluations."
        badge={<StatusBadge tone="warning">Not yet enforced</StatusBadge>}
      />

      <div className="mt-3 space-y-2.5">
        {ACCESS_POLICIES.map((pol) => (
          <div key={pol.id} className="rounded border border-[#27272A] bg-[#090A0B] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-[#F4F4F5]">
                  {pol.id}
                </span>
                <h3 className="text-xs font-semibold text-[#F4F4F5]">{pol.name}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusBadge tone={pol.effect === 'ALLOW' ? 'success' : 'danger'}>
                  {pol.effect}
                </StatusBadge>
                <StatusBadge tone="neutral">{pol.status}</StatusBadge>
              </div>
            </div>

            <p className="mt-1.5 text-[11px] leading-relaxed text-[#A1A1AA]">
              {pol.description}
            </p>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#71717A]">
              <span>Scope: {pol.scope}</span>
              <span className="font-mono">Updated: {pol.lastUpdated}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
