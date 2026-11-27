import { useState, type ChangeEvent } from 'react';
import { useToast } from '../hooks/useToast';
import { keyctlApi, type OverviewResponse } from '../lib/api';

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}

export function DataIngestionPage({ overview, onRefresh }: { overview: OverviewResponse | null; onRefresh: () => Promise<void> }) {
  const toast = useToast();
  const [sourceType, setSourceType] = useState<'csv' | 'json'>('csv');
  const [filename, setFilename] = useState('upload.csv');
  const [target, setTarget] = useState<'identities' | 'assets'>('identities');
  const [rawInput, setRawInput] = useState('employee_id,full_name,role,department\nemp-01,Alice Vance,analyst,Security\nemp-02,Bob Chen,viewer,Engineering');
  const [idField, setIdField] = useState('employee_id');
  const [nameField, setNameField] = useState('full_name');
  const [deptField, setDeptField] = useState('department');
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [busy, setBusy] = useState(false);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setSourceType(file.name.endsWith('.json') ? 'json' : 'csv');
    setRawInput(await file.text());
  };

  const handlePreview = () => {
    try {
      const parsed = sourceType === 'json' ? JSON.parse(rawInput) : parseCsv(rawInput);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      setPreview(rows);
      toast.info('Preview ready', `Parsed ${rows.length} record(s).`);
    } catch (err) {
      toast.error('Parse failed', err instanceof Error ? err.message : 'Invalid CSV or JSON.');
    }
  };

  const handleCommit = async () => {
    setBusy(true);
    try {
      const parsed = sourceType === 'json' ? JSON.parse(rawInput) : parseCsv(rawInput);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const res = await keyctlApi.ingestCommit({
        source_type: sourceType,
        filename,
        target,
        records: rows,
        mapping: { id: idField, name: nameField, department: deptField, owner_id: deptField },
      });
      toast.success('Import committed', `Imported ${res.record_count} record(s) (${res.rejected_count} rejected).`);
      await onRefresh();
    } catch (err) {
      toast.error('Import failed', err instanceof Error ? err.message : 'Failed to commit import.');
    } finally {
      setBusy(false);
    }
  };

  const imports = overview?.db_imports ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#27272A] bg-[#141517] p-6">
        <h2 className="text-lg font-semibold text-[#F4F4F5]">Data Ingestion & Field Mapping</h2>
        <p className="mt-1 text-xs text-[#A1A1AA]">
          Upload CSV or JSON records, map source fields to KeyCTL canonical fields, preview, and persist to SQLite.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <select value={target} onChange={(e) => setTarget(e.target.value as 'identities' | 'assets')} className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]">
            <option value="identities">Target: Identities</option>
            <option value="assets">Target: Assets</option>
          </select>
          <input value={idField} onChange={(e) => setIdField(e.target.value)} placeholder="Source ID field" className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]" />
          <input value={nameField} onChange={(e) => setNameField(e.target.value)} placeholder="Source Name field" className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]" />
          <input value={deptField} onChange={(e) => setDeptField(e.target.value)} placeholder={target === 'identities' ? 'Department field' : 'Owner ID field'} className="rounded-lg border border-[#27272A] bg-[#090A0B] px-3 py-1.5 text-xs text-[#F4F4F5]" />
        </div>

        <div className="mt-3">
          <input type="file" accept=".csv,.json" onChange={(e) => void handleFileUpload(e)} className="text-xs text-[#A1A1AA]" />
        </div>

        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          rows={5}
          className="mt-3 w-full rounded-lg border border-[#27272A] bg-[#090A0B] p-3 font-mono text-xs text-[#F4F4F5]"
        />

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={handlePreview} className="rounded-lg border border-[#27272A] bg-[#1C1D20] px-3 py-1.5 text-xs font-medium text-[#F4F4F5]">
            Preview Records
          </button>
          <button type="button" disabled={busy} onClick={() => void handleCommit()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
            Commit Import to SQLite
          </button>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
          <div className="mb-2 text-xs font-semibold text-[#F4F4F5]">Import Preview ({preview.length} rows)</div>
          <pre className="overflow-x-auto text-xs text-[#A1A1AA]">{JSON.stringify(preview.slice(0, 5), null, 2)}</pre>
        </div>
      )}

      <div className="rounded-xl border border-[#27272A] bg-[#141517] p-4">
        <div className="mb-2 text-xs font-semibold text-[#F4F4F5]">Import History</div>
        {imports.length === 0 ? (
          <div className="text-xs text-[#A1A1AA]">No imports recorded yet.</div>
        ) : (
          <div className="space-y-1.5">
            {imports.map((imp) => (
              <div key={imp.id} className="flex justify-between rounded border border-[#27272A] bg-[#090A0B] px-3 py-2 text-xs text-[#F4F4F5]">
                <span>{imp.filename} ({imp.source_type})</span>
                <span className="text-emerald-400">{imp.record_count} imported / {imp.rejected_count} rejected</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
