import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { SecurityAlert, StatusTone } from '../../types/security';
import { EmptyState } from '../ui/EmptyState';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';

interface AlertListProps {
  alerts: SecurityAlert[];
  onSelectAlert: (alert: SecurityAlert) => void;
  onToggleAcknowledge: (alertId: string) => void;
  loading?: boolean;
}

const ALERT_TONE: Record<SecurityAlert['severity'], StatusTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};

export function AlertList({
  alerts,
  onSelectAlert,
  onToggleAcknowledge,
  loading = false,
}: AlertListProps) {
  const activeCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <section className="rounded-md border border-[#27272A] bg-[#141517] p-4 sm:p-5">
      <SectionHeader
        title="Recent Alerts"
        subtitle="Synthetic anomaly detections requiring review."
        badge={
          <StatusBadge tone={activeCount > 0 ? 'warning' : 'success'}>
            {activeCount} active (Sim)
          </StatusBadge>
        }
      />

      {loading ? (
        <div className="mt-3 space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded border border-[#27272A] bg-[#090A0B]"
            />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No simulated alerts match your search"
          icon={ShieldAlert}
          compact
        />
      ) : (
        <div className="mt-3 space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'rounded border p-3 transition-colors',
                alert.acknowledged
                  ? 'border-[#27272A] bg-[#090A0B] opacity-65'
                  : 'border-[#27272A] bg-[#090A0B] hover:border-[#3F3F46]',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectAlert(alert)}
                  className="min-w-0 flex-1 text-left focus:outline-none"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={ALERT_TONE[alert.severity]}>
                      {alert.severity.toUpperCase()}
                    </StatusBadge>
                    <span className="font-mono text-[10px] text-[#71717A]">{alert.id}</span>
                    <span className="font-mono text-[10px] text-[#71717A]">• {alert.timestamp}</span>
                  </div>
                  <h3 className="mt-1.5 text-xs font-semibold text-[#F4F4F5]">{alert.title}</h3>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleAcknowledge(alert.id)}
                  title={
                    alert.acknowledged
                      ? 'Restore alert to active (local demo)'
                      : 'Acknowledge alert (local demo)'
                  }
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-colors',
                    alert.acknowledged
                      ? 'border-green-500/25 bg-green-500/10 text-green-400'
                      : 'border-[#27272A] bg-[#19191C] text-[#A1A1AA] hover:text-[#F4F4F5]',
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{alert.acknowledged ? 'Acked' : 'Ack'}</span>
                </button>
              </div>

              <div className="mt-1.5 font-mono text-[11px] text-[#A1A1AA]">
                Identity: <span className="text-[#F4F4F5]">{alert.identity}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#71717A]">{alert.reason}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
