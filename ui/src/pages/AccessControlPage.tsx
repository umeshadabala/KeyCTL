import { useMemo, useState } from 'react';
import { AccessEvaluator } from '../components/access/AccessEvaluator';
import { PermissionsMatrix } from '../components/access/PermissionsMatrix';
import { PolicyOverview } from '../components/access/PolicyOverview';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ACCESS_POLICIES } from '../data/accessPolicies';
import type { FeedbackNotice } from '../hooks/useSandboxState';
import type {
  AccessEvaluationResult,
  PermissionEntry,
  PermissionLevel,
  RequestedPermission,
  ServiceName,
} from '../types/access';
import type { SyntheticIdentity } from '../types/identity';

interface AccessControlPageProps {
  identities: SyntheticIdentity[];
  permissions: PermissionEntry[];
  evaluationHistory: AccessEvaluationResult[];
  onUpdatePermission: (identityId: string, service: ServiceName, level: PermissionLevel) => void;
  onRunSimulation: (
    identityId: string,
    service: ServiceName,
    requestedPermission: RequestedPermission,
  ) => AccessEvaluationResult | null;
  feedback: FeedbackNotice | null;
  onDismissFeedback: () => void;
}

export function AccessControlPage({
  identities,
  permissions,
  evaluationHistory,
  onUpdatePermission,
  onRunSimulation,
  feedback,
  onDismissFeedback,
}: AccessControlPageProps) {
  const [selectedIdentityId, setSelectedIdentityId] = useState<string>(
    identities[1]?.id ?? identities[0]?.id ?? 'ID-101',
  );
  const [selectedService, setSelectedService] = useState<ServiceName>('Finance');
  const [requestedPermission, setRequestedPermission] =
    useState<RequestedPermission>('Read');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(
    evaluationHistory[0]?.id ?? null,
  );

  // Derive active evaluation result from history so Reset Demo State never leaves stale output.
  const latestResult = useMemo(
    () =>
      (selectedResultId ? evaluationHistory.find((r) => r.id === selectedResultId) : null) ??
      evaluationHistory[0] ??
      null,
    [evaluationHistory, selectedResultId],
  );

  const handleEvaluate = () => {
    const res = onRunSimulation(selectedIdentityId, selectedService, requestedPermission);
    if (res) {
      setSelectedResultId(res.id);
    }
  };

  const handlePrefillEvaluator = (
    identityId: string,
    service: ServiceName,
    permission: RequestedPermission,
  ) => {
    setSelectedIdentityId(identityId);
    setSelectedService(service);
    setRequestedPermission(permission);
    const res = onRunSimulation(identityId, service, permission);
    if (res) {
      setSelectedResultId(res.id);
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-md border border-[#27272A] bg-[#141517] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight text-[#F4F4F5] sm:text-lg">
              Access Control
            </h1>
            <StatusBadge tone="warning" dot>
              Sandbox Policy Engine • Simulated
            </StatusBadge>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Review least-privilege matrix grants, synthetic policies, and deterministic access
            evaluations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded border border-[#27272A] bg-[#090A0B] px-3 py-1.5 font-mono text-[#A1A1AA]">
            Policies: {ACCESS_POLICIES.length}
          </div>
          <div className="rounded border border-[#27272A] bg-[#090A0B] px-3 py-1.5 font-mono text-[#A1A1AA]">
            Simulations: {evaluationHistory.length}
          </div>
        </div>
      </section>

      <FeedbackBanner feedback={feedback} onDismiss={onDismissFeedback} />

      <PermissionsMatrix
        identities={identities}
        permissions={permissions}
        onUpdatePermission={onUpdatePermission}
        onPrefillEvaluator={handlePrefillEvaluator}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <AccessEvaluator
            identities={identities}
            selectedIdentityId={selectedIdentityId}
            onIdentityChange={setSelectedIdentityId}
            selectedService={selectedService}
            onServiceChange={setSelectedService}
            requestedPermission={requestedPermission}
            onPermissionChange={setRequestedPermission}
            latestResult={latestResult}
            history={evaluationHistory}
            onEvaluate={handleEvaluate}
            onSelectHistoryResult={(item) => {
              setSelectedIdentityId(item.identityId);
              setSelectedService(item.service);
              setRequestedPermission(item.requestedPermission);
              setSelectedResultId(item.id);
            }}
          />
        </div>

        <div className="xl:col-span-5">
          <PolicyOverview />
        </div>
      </div>
    </div>
  );
}
