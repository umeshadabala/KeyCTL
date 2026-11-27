import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { keyctlApi } from '../lib/api';

export function CustomDashboardPage() {
  const toast = useToast();
  const [sources, setSources] = useState<Array<{ id: string; name: string; source_type: string; record_count: number }>>([]);
  const [widgets, setWidgets] = useState<Array<{ id: string; title: string; widget_type: string; source_id: string; field: string; aggregation: string; group_by: string }>>([]);
  const [widgetValues, setWidgetValues] = useState<Record<string, string>>({});
  const [alerts, setAlerts] = useState<Array<{ id: string; severity: string; explanation: string; record_id: string; created_at: string }>>([]);

  const [title, setTitle] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [field, setField] = useState('');
  const [aggregation, setAggregation] = useState('count');

  const refresh = useCallback(async () => {
    try {
      const [sRes, wRes, aRes] = await Promise.all([
        keyctlApi.listSources(),
        keyctlApi.listWidgets(),
        keyctlApi.listDynamicAlerts(),
      ]);
      setSources(sRes.sources);
      setWidgets(wRes.widgets);
      setAlerts(aRes.alerts);
      if (!sourceId && sRes.sources.length > 0) {
        setSourceId(sRes.sources[0].id);
      }

      const vals: Record<string, string> = {};
      await Promise.all(
        wRes.widgets.map(async (w) => {
          try {
            const q = await keyctlApi.queryPlatform(w.source_id, w.field, w.aggregation, w.group_by);
            vals[w.id] = q.value !== undefined ? String(q.value) : `${q.groups?.length ?? 0} groups`;
          } catch {
            vals[w.id] = 'Unavailable';
          }
        }),
      );
      setWidgetValues(vals);
    } catch {
      // Handled by global polling
    }
  }, [sourceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAddWidget = async () => {
    if (!title || !sourceId) {
      toast.warning('Missing fields', 'Provide a widget title and select a source.');
      return;
    }
    try {
      await keyctlApi.saveWidget({ title, widget_type: 'metric', source_id: sourceId, field, aggregation });
      toast.success('Widget saved', `Added "${title}" to your dashboard.`);
      setTitle('');
      await refresh();
    } catch (err) {
      toast.error('Failed to save widget', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#27272A] bg-[#141517] p-5">
        <h2 className="text-base font-semibold text-[#F4F4F5]">Custom Dashboard Builder</h2>
        <p className="mt-1 text-xs text-[#A1A1AA]">
          Create widgets from any connected data source. Every value is queried live from SQLite.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Widget title" className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]" />
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]">
            <option value="">Select source...</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.record_count})</option>
            ))}
          </select>
          <input value={field} onChange={(e) => setField(e.target.value)} placeholder="Field name (optional for count)" className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]" />
          <select value={aggregation} onChange={(e) => setAggregation(e.target.value)} className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]">
            <option value="count">count</option>
            <option value="sum">sum</option>
            <option value="avg">avg</option>
            <option value="min">min</option>
            <option value="max">max</option>
            <option value="distinct_count">distinct_count</option>
          </select>
          <button type="button" onClick={() => void handleAddWidget()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500">
            Add Widget
          </button>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="rounded-xl border border-[#27272A] bg-[#141517] p-6 text-xs text-[#A1A1AA]">
          No custom widgets yet. Connect a data source and add a widget above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {widgets.map((w) => (
            <div key={w.id} className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
              <div className="text-xs text-[#A1A1AA]">{w.title}</div>
              <div className="mt-1 text-2xl font-semibold text-[#F4F4F5]">{widgetValues[w.id] ?? '...'}</div>
              <div className="mt-1 text-[11px] text-[#71717A]">{w.aggregation}({w.field || '*'})</div>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
          <div className="mb-2 text-xs font-semibold text-[#F4F4F5]">Triggered Monitoring Alerts ({alerts.length})</div>
          <div className="space-y-1.5">
            {alerts.slice(0, 10).map((a) => (
              <div key={a.id} className="flex justify-between rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <span>[{a.severity}] {a.explanation}</span>
                <span className="font-mono text-[11px]">{a.record_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
