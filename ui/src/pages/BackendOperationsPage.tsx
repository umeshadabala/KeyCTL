import { useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { keyctlApi, type OverviewResponse } from '../lib/api';

interface BackendOperationsPageProps {
  pageId: string;
  title: string;
  description: string;
}

export function BackendOperationsPage({ pageId, title, description }: BackendOperationsPageProps) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const toast = useToast();

  const refresh = async () => {
    try {
      setError('');
      const data = await keyctlApi.overview();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backend unavailable');
    }
  };

  useEffect(() => {
    void refresh();
  }, [pageId]);

  const runAction = async (fn: () => Promise<unknown>, successTitle?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fn();
      setOutput(JSON.stringify(res, null, 2));
      if (successTitle) {
        toast.success(successTitle);
      }
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setError(msg);
      toast.error('Operation failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const isSimulated = pageId === 'secure-messaging' || pageId === 'simulation-lab' || pageId === 'trust-graph';

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#27272A] bg-[#141517] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[#F4F4F5]">{title}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isSimulated
                    ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {isSimulated ? 'SIMULATED — IN-PROCESS' : 'LIVE BACKEND'}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#A1A1AA]">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void runAction(() => keyctlApi.setup(), 'Backend state initialized')}
              className="rounded-lg border border-[#27272A] bg-[#1C1D20] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] hover:bg-[#27272A] disabled:opacity-50"
            >
              Initialize / Reset State
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void refresh()}
              className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {pageId === 'key-management' && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction(() => keyctlApi.rotateKey('operator', 300), 'Key rotation completed')}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Rotate Key (300s Grace)
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction(() => keyctlApi.protectedRead('maya', 'brief', 'ui-chal-1'), 'ML-KEM-768 protected read verified')}
                className="rounded-lg border border-[#27272A] bg-[#1C1D20] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] hover:bg-[#27272A] disabled:opacity-50"
              >
                Test ML-KEM-768 Protected Read
              </button>
            </>
          )}

          {pageId === 'audit-center' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void runAction(() => keyctlApi.verifyAudit(), 'Audit hash chain verified')}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Verify Audit Hash Chain
            </button>
          )}

          {pageId === 'threat-detection' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void runAction(() => keyctlApi.runDetection(), 'Threat detection completed')}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Run Detector on practice/events.csv
            </button>
          )}

          {(pageId === 'secure-messaging' || pageId === 'simulation-lab' || pageId === 'trust-graph') && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction(() => keyctlApi.simMessaging(), 'Replay & recipient binding verified')}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                Run [SIMULATED] Replay & Recipient Binding
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction(() => keyctlApi.simRevocation('maya'), 'Simulated cluster revocation completed')}
                className="rounded-lg border border-[#27272A] bg-[#1C1D20] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] hover:bg-[#27272A] disabled:opacity-50"
              >
                Run [SIMULATED] NodeCluster Revocation
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction(() => keyctlApi.backupDemo(), 'Backup tamper check passed')}
                className="rounded-lg border border-[#27272A] bg-[#1C1D20] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] hover:bg-[#27272A] disabled:opacity-50"
              >
                Run Backup Tamper Check
              </button>
            </>
          )}

          {pageId === 'settings' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void runAction(() => keyctlApi.health(), 'Backend health check passed')}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Check Backend Health
            </button>
          )}
        </div>
      </div>

      {overview && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
            <div className="text-xs text-[#A1A1AA]">Backend Runtime</div>
            <div className="mt-1 text-sm font-semibold text-[#F4F4F5]">
              Python {overview.python_version} • {overview.pqcrypto_available ? 'pqcrypto OK' : 'pqcrypto missing'}
            </div>
          </div>
          <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
            <div className="text-xs text-[#A1A1AA]">Active Key Version</div>
            <div className="mt-1 text-sm font-semibold text-[#F4F4F5]">
              {overview.keyring?.active_version ?? 'Not initialized'}
            </div>
          </div>
          <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
            <div className="text-xs text-[#A1A1AA]">Audit Chain Status</div>
            <div className="mt-1 text-sm font-semibold text-[#F4F4F5]">
              {overview.audit_verified === null
                ? 'Not initialized'
                : overview.audit_verified
                  ? `Verified (${overview.audit_chain.length} records)`
                  : `Tampered at #${overview.audit_bad_index}`}
            </div>
          </div>
        </div>
      )}

      {output && (
        <div className="rounded-xl border border-[#27272A] bg-[#090A0B] p-4">
          <div className="mb-2 text-xs font-medium text-[#A1A1AA]">Live Backend Response</div>
          <pre className="overflow-x-auto text-xs text-[#F4F4F5]">{output}</pre>
        </div>
      )}
    </div>
  );
}
