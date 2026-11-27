import { useCallback, useEffect, useRef, useState } from 'react';
import { keyctlApi, type OverviewResponse } from '../lib/api';
import { useToast } from './useToast';

export function useLiveKeyctlState(pollIntervalMs = 2500) {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const inFlightRef = useRef<boolean>(false);
  const wasDisconnectedRef = useRef<boolean>(false);
  const seenAuditSeqRef = useRef<number | null>(null);
  const toast = useToast();

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await keyctlApi.overview();
      setOverview(data);
      setError('');

      if (wasDisconnectedRef.current) {
        wasDisconnectedRef.current = false;
        toast.success('Backend connection restored', 'Synchronized with KeyCTL API.');
      }

      const chain = data.audit_chain ?? [];
      if (seenAuditSeqRef.current === null) {
        seenAuditSeqRef.current = chain.length > 0 ? chain[chain.length - 1].seq : -1;
      } else {
        for (const ev of chain) {
          if (ev.seq > seenAuditSeqRef.current) {
            seenAuditSeqRef.current = ev.seq;
            if (ev.decision === 'deny') {
              toast.security(
                'Unauthorized access denied',
                `${ev.actor} denied on ${ev.asset ?? 'resource'} (${ev.rule}).`,
                { dedupeKey: `audit-seq-${ev.seq}` },
              );
            } else if (ev.action === 'revoke') {
              toast.security(
                'Identity revoked',
                `${ev.actor} was revoked (${ev.rule}).`,
                { dedupeKey: `audit-seq-${ev.seq}` },
              );
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Backend unavailable';
      setError(msg);
      if (!wasDisconnectedRef.current) {
        wasDisconnectedRef.current = true;
        toast.error('Backend connection lost', msg, { dedupeKey: 'backend-disconnected' });
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [pollIntervalMs, refresh]);

  return { overview, loading, error, refresh };
}
