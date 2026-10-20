export type TelemetryMetric = { name: 'scrapeTargets' | 'healthyTargets' | 'activeSeries'; value: number | null; label: string };
export type TelemetryOverview = { mode: 'setup' | 'connected' | 'degraded'; updatedAt: string; metrics: TelemetryMetric[]; notice: string };
type UnknownRecord = Record<string, unknown>;
const queries = [
  { name: 'scrapeTargets', label: 'Monitored targets', query: 'count(up)' },
  { name: 'healthyTargets', label: 'Reachable targets', query: 'sum(up)' },
  { name: 'activeSeries', label: 'Active metric series', query: 'prometheus_tsdb_head_series' }
] as const;
function record(value: unknown): UnknownRecord | null { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null; }
export function trustedMetricsOrigin(raw: string): string | null {
 try {
  if (/[\\\s]/.test(raw)) return null;
  const url = new URL(raw);
  const secure = url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname));
  if (!secure || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
  return url.origin;
 } catch { return null; }
}
export function readScalarVector(payload: unknown): number | null {
 const root = record(payload), data = record(root?.data);
 if (root?.status !== 'success' || data?.resultType !== 'vector' || !Array.isArray(data.result) || data.result.length !== 1) return null;
 const item = record(data.result[0]);
 if (!item || !Array.isArray(item.value) || item.value.length !== 2 || typeof item.value[1] !== 'string') return null;
 const n = Number(item.value[1]);
 return Number.isFinite(n) && n >= 0 ? n : null;
}
export async function readSelfHostedTelemetry(env: Record<string, string | undefined>, fetcher: typeof fetch = fetch): Promise<TelemetryOverview> {
 const now = new Date().toISOString();
 const empty = () => queries.map(q => ({ name: q.name, label: q.label, value: null })) as TelemetryMetric[];
 const supplied = env.CLOUD_PROMETHEUS_URL?.trim();
 if (!supplied) return { mode: 'setup', updatedAt: now, metrics: empty(), notice: 'Self-hosted Prometheus endpoint is not configured.' };
 const origin = trustedMetricsOrigin(supplied);
 if (!origin) return { mode: 'degraded', updatedAt: now, metrics: empty(), notice: 'Prometheus endpoint configuration is invalid.' };
 const token = env.CLOUD_PROMETHEUS_TOKEN?.trim();
 const results = await Promise.allSettled(queries.map(async q => {
  const target = new URL('/api/v1/query', origin);
  target.searchParams.set('query', q.query);
  const response = await fetcher(target, {
   method: 'GET', headers: { Accept: 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
   cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) throw Error('upstream HTTP failure');
  const value = readScalarVector(await response.json());
  if (value === null) throw Error('metric unavailable');
  return value;
 }));
 const success = results.filter(r => r.status === 'fulfilled').length;
 const metrics = queries.map((q, i): TelemetryMetric => {
  const result=results[i];
  return { name: q.name, label: q.label, value: result.status === 'fulfilled' ? result.value : null };
 });
 return { mode: success === queries.length ? 'connected' : 'degraded', updatedAt: now, metrics,
  notice: success === 0 ? 'Prometheus is unreachable or does not expose the expected metrics.' :
   success === queries.length ? 'Real Prometheus metrics retrieved; target counts are not application uptime guarantees.' :
   'Some Prometheus metrics are not available; missing values are not treated as zero.' };
}
