import { useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useToast } from '../hooks/useToast';
import { keyctlApi, type OverviewResponse } from '../lib/api';

interface LivePageProps {
  overview: OverviewResponse | null;
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
}

export function LiveOverviewPage({ overview, loading, error, onRefresh }: LivePageProps) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const handleSetup = async () => {
    setBusy(true);
    try {
      await keyctlApi.setup();
      toast.success('Backend state initialized', 'Synthetic identities and assets are ready.');
      await onRefresh();
    } catch (err) {
      toast.error('Setup failed', err instanceof Error ? err.message : 'Unable to initialize state.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !overview) {
    return <div className="rounded-xl border border-[#27272A] bg-[#141517] p-6 text-sm text-[#A1A1AA]">Connecting to KeyCTL backend...</div>;
  }

  if (error && !overview) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
        Backend unavailable: {error}
      </div>
    );
  }

  const owners = overview?.owners ?? {};
  const disabled = overview?.disabled ?? [];
  const uniqueIdentities = Array.from(new Set([...Object.values(owners), ...disabled]));
  const activeCount = uniqueIdentities.filter((id) => !disabled.includes(id)).length;
  const auditChain = overview?.audit_chain ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#27272A] bg-[#141517] p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[#F4F4F5]">Security Operations Overview</h2>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              LIVE BACKEND
            </span>
          </div>
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Polling every 2.5s from 127.0.0.1 • Python {overview?.python_version ?? 'N/A'} •{' '}
            {overview?.pqcrypto_available ? 'ML-KEM-768 Ready' : 'pqcrypto Unavailable'}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSetup()}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {overview?.initialized ? 'Reset Demo State' : 'Initialize Backend State'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
          <div className="text-xs text-[#A1A1AA]">Active Identities</div>
          <div className="mt-1 text-2xl font-semibold text-[#F4F4F5]">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
          <div className="text-xs text-[#A1A1AA]">Revoked Identities</div>
          <div className="mt-1 text-2xl font-semibold text-[#F4F4F5]">{disabled.length}</div>
        </div>
        <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
          <div className="text-xs text-[#A1A1AA]">Configured Assets</div>
          <div className="mt-1 text-2xl font-semibold text-[#F4F4F5]">{Object.keys(owners).length}</div>
        </div>
        <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
          <div className="text-xs text-[#A1A1AA]">Active Key Version</div>
          <div className="mt-1 text-2xl font-semibold text-[#F4F4F5]">
            {overview?.keyring?.active_version ?? 'N/A'}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#27272A] bg-[#141517] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F4F4F5]">Recent Audit Events (Persisted)</h3>
          <span className="text-xs text-[#A1A1AA]">
            {overview?.audit_verified === null
              ? 'Not initialized'
              : overview?.audit_verified
                ? `Chain Verified (${auditChain.length})`
                : 'Chain Verification Failed'}
          </span>
        </div>
        {auditChain.length === 0 ? (
          <div className="text-xs text-[#A1A1AA]">No persisted audit events yet.</div>
        ) : (
          <div className="space-y-2">
            {[...auditChain].reverse().slice(0, 8).map((ev) => (
              <div
                key={ev.seq}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-2 text-xs"
              >
                <span className="font-mono text-[#F4F4F5]">
                  #{ev.seq} {ev.action} • {ev.actor} {ev.asset ? `-> ${ev.asset}` : ''}
                </span>
                <span className={ev.decision === 'allow' ? 'text-emerald-400' : 'text-red-400'}>
                  {ev.decision} ({ev.rule})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveIdentitiesPage({ overview, onRefresh }: LivePageProps) {
  const [busyActor, setBusyActor] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<string | null>(null);
  const toast = useToast();
  const owners = overview?.owners ?? {};
  const disabled = overview?.disabled ?? [];
  const identities = Array.from(new Set([...Object.values(owners), ...disabled]));

  const handleRevoke = async (actor: string) => {
    setPendingRevoke(null);
    setBusyActor(actor);
    try {
      await keyctlApi.revoke(actor);
      toast.success('Identity revoked', `${actor} was revoked in backend state.`);
      await onRefresh();
    } catch (err) {
      toast.error('Revocation failed', err instanceof Error ? err.message : 'Backend rejected revocation.');
    } finally {
      setBusyActor(null);
    }
  };

  return (
    <div className="rounded-xl border border-[#27272A] bg-[#141517] p-6">
      <h2 className="text-lg font-semibold text-[#F4F4F5]">Identities & Ownership (Live Backend)</h2>
      <p className="mt-1 text-xs text-[#A1A1AA]">
        Device-level hardware attestation is not implemented in the Track 4 adapter; showing persisted identities and asset ownership.
      </p>
      {identities.length === 0 ? (
        <div className="mt-4 text-xs text-[#A1A1AA]">No identities configured. Initialize state from Overview.</div>
      ) : (
        <div className="mt-4 space-y-2">
          {identities.map((actor) => {
            const isRevoked = disabled.includes(actor);
            const ownedAssets = Object.entries(owners)
              .filter(([, owner]) => owner === actor)
              .map(([asset]) => asset);
            return (
              <div
                key={actor}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#27272A] bg-[#090A0B] p-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-[#F4F4F5]">{actor}</div>
                  <div className="text-[#A1A1AA]">Assets: {ownedAssets.join(', ') || 'None'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={isRevoked ? 'text-red-400' : 'text-emerald-400'}>
                    {isRevoked ? 'REVOKED' : 'ACTIVE'}
                  </span>
                  {!isRevoked && (
                    <button
                      type="button"
                      disabled={busyActor === actor}
                      onClick={() => setPendingRevoke(actor)}
                      className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ConfirmModal
        open={Boolean(pendingRevoke)}
        title={`Revoke ${pendingRevoke ?? ''}?`}
        description="This is persisted in backend state and cannot be undone without re-setup."
        confirmLabel="Confirm Revoke"
        tone="danger"
        onCancel={() => setPendingRevoke(null)}
        onConfirm={() => {
          if (pendingRevoke) void handleRevoke(pendingRevoke);
        }}
      />
    </div>
  );
}

export function LiveAccessControlPage({ overview, onRefresh }: LivePageProps) {
  const owners = overview?.owners ?? {};
  const disabled = overview?.disabled ?? [];
  const actors = Array.from(new Set([...Object.values(owners), ...disabled]));
  const assets = Object.keys(owners);

  const [actor, setActor] = useState(actors[0] || 'maya');
  const [asset, setAsset] = useState(assets[0] || 'brief');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const toast = useToast();

  const runRead = async (protectedMode: boolean) => {
    setError('');
    try {
      const reqId = `ui-${Date.now()}`;
      const res = protectedMode
        ? await keyctlApi.protectedRead(actor, asset, `chal-${Date.now()}`)
        : await keyctlApi.read(actor, asset, reqId);
      setResult(JSON.stringify(res, null, 2));
      if (res.decision === 'allow') {
        toast.success(
          protectedMode ? 'Protected read verified' : 'Access allowed',
          `${actor} read ${asset}.`,
        );
      } else {
        toast.security('Access denied', `${actor} was denied access to ${asset}.`);
      }
      await onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setError(msg);
      toast.error('Access request failed', msg);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#27272A] bg-[#141517] p-6">
      <h2 className="text-lg font-semibold text-[#F4F4F5]">Access Control Evaluator (Live Adapter)</h2>
      <div className="flex flex-wrap gap-3">
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]"
        >
          {(actors.length ? actors : ['maya', 'liam']).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]"
        >
          {(assets.length ? assets : ['brief', 'notes']).map((as) => (
            <option key={as} value={as}>
              {as}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void runRead(false)}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
        >
          Execute read
        </button>
        <button
          type="button"
          onClick={() => void runRead(true)}
          className="rounded-lg border border-[#27272A] bg-[#1C1D20] px-3 py-1.5 text-xs font-medium text-[#F4F4F5] hover:bg-[#27272A]"
        >
          Execute protected_read (ML-KEM-768)
        </button>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
      {result && (
        <pre className="overflow-x-auto rounded-lg border border-[#27272A] bg-[#090A0B] p-3 text-xs text-[#F4F4F5]">
          {result}
        </pre>
      )}
    </div>
  );
}
