export interface HealthResponse {
  status: string;
  python: string;
  pqcrypto: boolean;
}

export interface OverviewResponse {
  initialized: boolean;
  python_version: string;
  pqcrypto_available: boolean;
  owners: Record<string, string>;
  disabled: string[];
  keyring: {
    active_version: string;
    grace_period_seconds: number;
    versions: Record<
      string,
      {
        version: string;
        status: string;
        activated_at: string;
        retired_at: string | null;
        cutoff_at: string | null;
      }
    >;
  } | null;
  audit_chain: Array<{
    seq: number;
    timestamp_utc: string;
    request_id: string;
    actor: string;
    action: string;
    asset: string | null;
    decision: string;
    rule: string;
    entry_hash: string;
  }>;
  audit_verified: boolean | null;
  audit_bad_index: number | null;
  db_identities?: Array<{ id: string; name: string; role: string; department: string; status: string; source_type: string; created_at: string }>;
  db_assets?: Array<{ id: string; name: string; owner_id: string; classification: string; status: string; source_type: string; created_at: string }>;
  db_policies?: Array<{ id: string; actor_id: string; asset_id: string; effect: string; created_at: string }>;
  db_alerts?: Array<{ id: string; rule_id: string; severity: string; actor: string; target: string; explanation: string; status: string; created_at: string }>;
  db_rules?: Array<{ id: string; name: string; rule_type: string; threshold: number; enabled: number; description: string }>;
  db_imports?: Array<{ id: string; source_type: string; filename: string; record_count: number; rejected_count: number; status: string; created_at: string }>;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export const keyctlApi = {
  health: () => requestJson<HealthResponse>('/api/health'),
  overview: () => requestJson<OverviewResponse>('/api/overview'),
  setup: () => requestJson<{ ready: boolean }>('/api/setup', { method: 'POST', body: '{}' }),
  read: (actor: string, asset: string, request_id: string) =>
    requestJson<{ decision: string; body?: string }>('/api/access/read', {
      method: 'POST',
      body: JSON.stringify({ actor, asset, request_id }),
    }),
  revoke: (actor: string) =>
    requestJson<Record<string, never>>('/api/access/revoke', {
      method: 'POST',
      body: JSON.stringify({ actor }),
    }),
  audit: (request_id: string) =>
    requestJson<{ request_id: string; decision: string; rule?: string }>('/api/access/audit', {
      method: 'POST',
      body: JSON.stringify({ request_id }),
    }),
  protectedRead: (actor: string, asset: string, challenge: string) =>
    requestJson<{ decision: string; ciphertext_bytes?: number; proof_hex?: string; verified?: boolean }>(
      '/api/access/protected-read',
      { method: 'POST', body: JSON.stringify({ actor, asset, challenge }) },
    ),
  rotateKey: (actor = 'operator', grace_period_seconds = 300) =>
    requestJson<{ previous_version: string; active_version: string; retired: string[] }>('/api/keys/rotate', {
      method: 'POST',
      body: JSON.stringify({ actor, grace_period_seconds }),
    }),
  verifyAudit: () =>
    requestJson<{ verified: boolean; bad_index: number | null; length: number }>('/api/audit/verify', {
      method: 'POST',
      body: '{}',
    }),
  backupDemo: () =>
    requestJson<{ backup_id: string; state_digest: string; tamper_rejected: boolean }>('/api/backup/demo', {
      method: 'POST',
      body: '{}',
    }),
  simRevocation: (actor = 'maya') =>
    requestJson<Record<string, unknown>>('/api/simulations/revocation', {
      method: 'POST',
      body: JSON.stringify({ actor }),
    }),
  simMessaging: () =>
    requestJson<Record<string, unknown>>('/api/simulations/messaging', {
      method: 'POST',
      body: '{}',
    }),
  runDetection: () =>
    requestJson<{
      total_events: number;
      precision: number;
      recall: number;
      f1: number;
      median_alert_time_ms: number;
      false_alerts_per_1000_benign: number;
      alerts: Array<{
        alert_id: string;
        rule: string;
        severity: string;
        actor: string;
        target_service: string;
        event_ids: string[];
        explanation: string;
      }>;
    }>('/api/detection/run', { method: 'POST', body: '{}' }),
  createIdentity: (payload: { id: string; name: string; role: string; department: string }) =>
    requestJson<Record<string, unknown>>('/api/identities', { method: 'POST', body: JSON.stringify(payload) }),
  revokeIdentityDb: (id: string) =>
    requestJson<Record<string, unknown>>('/api/identities/revoke', { method: 'POST', body: JSON.stringify({ id }) }),
  createAsset: (payload: { id: string; name: string; owner_id: string; classification: string; content: string }) =>
    requestJson<Record<string, unknown>>('/api/assets', { method: 'POST', body: JSON.stringify(payload) }),
  upsertPolicy: (payload: { actor_id: string; asset_id: string; effect: 'allow' | 'deny' }) =>
    requestJson<Record<string, unknown>>('/api/policies', { method: 'POST', body: JSON.stringify(payload) }),
  evaluatePolicyDb: (actor_id: string, asset_id: string) =>
    requestJson<{ decision: string; rule: string }>('/api/policies/evaluate', { method: 'POST', body: JSON.stringify({ actor_id, asset_id }) }),
  ingestCommit: (payload: { source_type: string; filename: string; target: string; records: Record<string, unknown>[]; mapping: Record<string, string> }) =>
    requestJson<{ id: string; record_count: number; rejected_count: number }>('/api/ingest/commit', { method: 'POST', body: JSON.stringify(payload) }),
  listSources: () => requestJson<{ sources: Array<{ id: string; name: string; source_type: string; schema_json: string; record_count: number; last_sync_at: string | null }> }>('/api/platform/sources'),
  createSource: (name: string, source_type: string) =>
    requestJson<{ id: string; name: string }>('/api/platform/sources', { method: 'POST', body: JSON.stringify({ name, source_type }) }),
  ingestPlatform: (source_id: string, records: Record<string, unknown>[], mapping: Record<string, string> = {}) =>
    requestJson<{ source_id: string; ingested: number; alerts_triggered: number }>('/api/platform/ingest', { method: 'POST', body: JSON.stringify({ source_id, records, mapping }) }),
  queryPlatform: (source_id: string, field: string, aggregation: string, group_by = '') =>
    requestJson<{ aggregation: string; value?: number; groups?: Array<{ key: string; count: number }>; records: Record<string, unknown>[] }>('/api/platform/query', { method: 'POST', body: JSON.stringify({ source_id, field, aggregation, group_by }) }),
  listWidgets: () => requestJson<{ widgets: Array<{ id: string; title: string; widget_type: string; source_id: string; field: string; aggregation: string; group_by: string }> }>('/api/platform/widgets'),
  saveWidget: (payload: { title: string; widget_type: string; source_id: string; field: string; aggregation: string; group_by?: string }) =>
    requestJson<Record<string, unknown>>('/api/platform/widgets', { method: 'POST', body: JSON.stringify(payload) }),
  createRule: (payload: { name: string; source_id: string; field: string; condition: string; value: string; severity: string }) =>
    requestJson<Record<string, unknown>>('/api/platform/rules', { method: 'POST', body: JSON.stringify(payload) }),
  listDynamicAlerts: () => requestJson<{ alerts: Array<{ id: string; rule_id: string; source_id: string; record_id: string; severity: string; explanation: string; created_at: string }> }>('/api/platform/alerts'),
};
