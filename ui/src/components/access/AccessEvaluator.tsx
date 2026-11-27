import { CheckCircle2, Play, ShieldX } from 'lucide-react';
import { SANDBOX_SERVICES } from '../../data/accessPolicies';
import { cn } from '../../lib/cn';
import type {
  AccessEvaluationResult,
  RequestedPermission,
  ServiceName,
} from '../../types/access';
import type { SyntheticIdentity } from '../../types/identity';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface AccessEvaluatorProps {
  identities: SyntheticIdentity[];
  selectedIdentityId: string;
  onIdentityChange: (id: string) => void;
  selectedService: ServiceName;
  onServiceChange: (svc: ServiceName) => void;
  requestedPermission: RequestedPermission;
  onPermissionChange: (perm: RequestedPermission) => void;
  latestResult: AccessEvaluationResult | null;
  history: AccessEvaluationResult[];
  onEvaluate: () => void;
  onSelectHistoryResult: (result: AccessEvaluationResult) => void;
}

const REQUEST_PERMISSIONS: RequestedPermission[] = ['Read', 'Write', 'Admin'];

export function AccessEvaluator({
  identities,
  selectedIdentityId,
  onIdentityChange,
  selectedService,
  onServiceChange,
  requestedPermission,
  onPermissionChange,
  latestResult,
  history,
  onEvaluate,
  onSelectHistoryResult,
}: AccessEvaluatorProps) {
  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Access Evaluation & Simulation"
        subtitle="Test hypothetical requests deterministically against local sandbox policies and device posture."
        badge={<StatusBadge tone="neutral">Local Simulation</StatusBadge>}
      />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="eval-identity"
            className="block text-[11px] font-medium text-[#A1A1AA]"
          >
            Identity
          </label>
          <select
            id="eval-identity"
            value={selectedIdentityId}
            onChange={(e) => onIdentityChange(e.target.value)}
            className="mt-1 h-9 w-full rounded border border-[#27272A] bg-[#090A0B] px-2.5 text-xs text-[#F4F4F5] focus:border-[#52525B] focus:outline-none"
          >
            {identities.map((ident) => (
              <option key={ident.id} value={ident.id}>
                {ident.displayName} ({ident.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="eval-service"
            className="block text-[11px] font-medium text-[#A1A1AA]"
          >
            Target Service
          </label>
          <select
            id="eval-service"
            value={selectedService}
            onChange={(e) => onServiceChange(e.target.value as ServiceName)}
            className="mt-1 h-9 w-full rounded border border-[#27272A] bg-[#090A0B] px-2.5 text-xs text-[#F4F4F5] focus:border-[#52525B] focus:outline-none"
          >
            {SANDBOX_SERVICES.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="eval-perm"
            className="block text-[11px] font-medium text-[#A1A1AA]"
          >
            Requested Permission
          </label>
          <select
            id="eval-perm"
            value={requestedPermission}
            onChange={(e) => onPermissionChange(e.target.value as RequestedPermission)}
            className="mt-1 h-9 w-full rounded border border-[#27272A] bg-[#090A0B] px-2.5 text-xs text-[#F4F4F5] focus:border-[#52525B] focus:outline-none"
          >
            {REQUEST_PERMISSIONS.map((perm) => (
              <option key={perm} value={perm}>
                {perm}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-[#71717A]">
          Evaluates identity status, trusted device count, risk guardrails, and matrix scope.
        </span>
        <button
          type="button"
          onClick={onEvaluate}
          className="inline-flex items-center gap-1.5 rounded border border-[#3F3F46] bg-[#19191C] px-3.5 py-2 text-xs font-medium text-[#F4F4F5] transition-colors hover:border-[#52525B] hover:bg-[#222226]"
        >
          <Play className="h-3.5 w-3.5 text-[#A1A1AA]" />
          <span>Evaluate Access (Simulated)</span>
        </button>
      </div>

      {latestResult && (
        <div
          className={cn(
            'mt-4 rounded border p-4',
            latestResult.decision === 'ALLOW'
              ? 'border-green-500/25 bg-green-500/[0.06]'
              : 'border-red-500/25 bg-red-500/[0.06]',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {latestResult.decision === 'ALLOW' ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <ShieldX className="h-4 w-4 text-red-400" />
              )}
              <span
                className={cn(
                  'font-mono text-sm font-semibold tracking-wider',
                  latestResult.decision === 'ALLOW' ? 'text-green-400' : 'text-red-400',
                )}
              >
                {latestResult.decision}
              </span>
              <StatusBadge tone="neutral">{latestResult.id}</StatusBadge>
            </div>
            <span className="font-mono text-[10px] text-[#A1A1AA]">
              {latestResult.timestamp} • Demo Evaluation Only
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-[#27272A] pt-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[#71717A]">Identity</dt>
              <dd className="mt-0.5 font-mono text-[#F4F4F5]">
                {latestResult.identityName} ({latestResult.identityHandle})
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[#71717A]">
                Requested Service & Level
              </dt>
              <dd className="mt-0.5 text-[#F4F4F5]">
                {latestResult.service} —{' '}
                <span className="font-mono">{latestResult.requestedPermission}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[#71717A]">
                Relevant Policy
              </dt>
              <dd className="mt-0.5 text-[#F4F4F5]">
                <span className="font-mono font-semibold">{latestResult.relevantPolicyId}</span> —{' '}
                {latestResult.relevantPolicyName}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[#71717A]">
                Matrix Allowance
              </dt>
              <dd className="mt-0.5 font-mono text-[#F4F4F5]">{latestResult.grantedLevel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-[#71717A]">
                Decision Reason
              </dt>
              <dd className="mt-0.5 leading-relaxed text-[#F4F4F5]">{latestResult.reason}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-[#71717A]">
          <span>Simulation History ({history.length})</span>
          <span className="font-normal normal-case">Recorded locally</span>
        </div>
        <div className="max-h-48 divide-y divide-[#27272A] overflow-y-auto rounded border border-[#27272A] bg-[#090A0B]">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectHistoryResult(item)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-[#19191C]"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-[#F4F4F5]">
                  {item.identityHandle} → {item.service} ({item.requestedPermission})
                </div>
                <div className="truncate text-[10px] text-[#71717A]">
                  {item.relevantPolicyId}: {item.reason}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[10px] text-[#71717A]">{item.timestamp}</span>
                <StatusBadge tone={item.decision === 'ALLOW' ? 'success' : 'danger'}>
                  {item.decision}
                </StatusBadge>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
