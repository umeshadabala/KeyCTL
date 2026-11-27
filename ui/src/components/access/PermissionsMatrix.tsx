import { ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SANDBOX_SERVICES } from '../../data/accessPolicies';
import { cn } from '../../lib/cn';
import type {
  PermissionEntry,
  PermissionLevel,
  RequestedPermission,
  ServiceName,
} from '../../types/access';
import type { SyntheticIdentity } from '../../types/identity';
import { Search } from '../ui/Search';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface PermissionsMatrixProps {
  identities: SyntheticIdentity[];
  permissions: PermissionEntry[];
  onUpdatePermission: (identityId: string, service: ServiceName, level: PermissionLevel) => void;
  onPrefillEvaluator: (
    identityId: string,
    service: ServiceName,
    permission: RequestedPermission,
  ) => void;
}

const LEVEL_STYLES: Record<PermissionLevel, string> = {
  Admin: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  Write: 'border-[#3F3F46] bg-[#19191C] text-[#F4F4F5]',
  Read: 'border-[#27272A] bg-[#141517] text-[#A1A1AA]',
  Denied: 'border-[#27272A]/60 bg-[#090A0B] text-[#71717A]',
};

const ALL_LEVELS: PermissionLevel[] = ['Read', 'Write', 'Admin', 'Denied'];

export function PermissionsMatrix({
  identities,
  permissions,
  onUpdatePermission,
  onPrefillEvaluator,
}: PermissionsMatrixProps) {
  const [query, setQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<{
    identityId: string;
    service: ServiceName;
  } | null>(null);

  const filteredIdentities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return identities;
    return identities.filter(
      (i) =>
        i.displayName.toLowerCase().includes(q) ||
        i.handle.toLowerCase().includes(q) ||
        i.role.toLowerCase().includes(q),
    );
  }, [identities, query]);

  const getEntry = (identityId: string, service: ServiceName): PermissionEntry | undefined =>
    permissions.find((p) => p.identityId === identityId && p.service === service);

  const activeSelection = useMemo(() => {
    if (!selectedCell) return null;
    const identity = identities.find((i) => i.id === selectedCell.identityId);
    const entry = getEntry(selectedCell.identityId, selectedCell.service);
    if (!identity) return null;
    return { identity, service: selectedCell.service, entry };
  }, [selectedCell, identities, permissions]);

  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Permissions Matrix"
        subtitle="Click any matrix cell to inspect policy rationale or simulate permission adjustments."
        badge={<StatusBadge tone="neutral">Demo Matrix</StatusBadge>}
        actions={
          <div className="w-full sm:w-60">
            <Search
              value={query}
              onChange={setQuery}
              placeholder="Filter matrix identities..."
              shortcutHint=""
              ariaLabel="Filter permissions matrix identities"
            />
          </div>
        }
      />

      <div className="mt-3 overflow-x-auto rounded border border-[#27272A] bg-[#090A0B]">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#27272A] text-[10px] font-medium uppercase tracking-wider text-[#71717A]">
              <th className="sticky left-0 z-10 bg-[#090A0B] px-3 py-2.5">Identity</th>
              {SANDBOX_SERVICES.map((svc) => (
                <th key={svc} className="px-2 py-2.5 text-center">
                  {svc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]/70">
            {filteredIdentities.map((ident) => (
              <tr key={ident.id} className="hover:bg-[#141517]">
                <td className="sticky left-0 z-10 bg-[#090A0B] px-3 py-2">
                  <div className="text-xs font-medium text-[#F4F4F5]">{ident.displayName}</div>
                  <div className="font-mono text-[10px] text-[#71717A]">{ident.id}</div>
                </td>
                {SANDBOX_SERVICES.map((svc) => {
                  const entry = getEntry(ident.id, svc);
                  const level: PermissionLevel = entry?.level ?? 'Denied';
                  const isCellSelected =
                    selectedCell?.identityId === ident.id && selectedCell?.service === svc;
                  return (
                    <td key={svc} className="px-1.5 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedCell({ identityId: ident.id, service: svc })}
                        className={cn(
                          'w-full rounded border px-2 py-1 font-mono text-[10px] font-medium transition-colors',
                          LEVEL_STYLES[level],
                          isCellSelected
                            ? 'ring-1 ring-[#F4F4F5]/70'
                            : 'hover:border-[#52525B]',
                        )}
                      >
                        {level}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeSelection && (
        <div className="mt-3 flex flex-col gap-3 rounded border border-[#27272A] bg-[#090A0B] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[#F4F4F5]">
                {activeSelection.identity.displayName}
              </span>
              <span className="text-[#71717A]">→</span>
              <span className="font-medium text-[#F4F4F5]">{activeSelection.service}</span>
              <span className="font-mono text-[10px] text-[#71717A]">
                ({activeSelection.entry?.policyId ?? 'POL-002'})
              </span>
            </div>
            <p className="text-[11px] text-[#A1A1AA]">
              {activeSelection.entry?.rationale ?? 'Default sandbox matrix rule'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded border border-[#27272A] bg-[#141517] p-0.5">
              {ALL_LEVELS.map((lvl) => {
                const current = (activeSelection.entry?.level ?? 'Denied') === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() =>
                      onUpdatePermission(activeSelection.identity.id, activeSelection.service, lvl)
                    }
                    className={cn(
                      'rounded-sm px-2 py-1 font-mono text-[10px] font-medium transition-colors',
                      current
                        ? 'bg-[#19191C] text-[#F4F4F5] border border-[#27272A]'
                        : 'text-[#71717A] hover:text-[#A1A1AA]',
                    )}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const currentLevel = activeSelection.entry?.level ?? 'Denied';
                const testPerm: RequestedPermission =
                  currentLevel === 'Denied' ? 'Read' : currentLevel;
                onPrefillEvaluator(
                  activeSelection.identity.id,
                  activeSelection.service,
                  testPerm,
                );
              }}
              className="inline-flex items-center gap-1 rounded border border-[#27272A] bg-[#19191C] px-2.5 py-1.5 text-[11px] font-medium text-[#F4F4F5] hover:border-[#3F3F46]"
            >
              <span>Evaluate</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
