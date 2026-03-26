// src/lib/store.ts
// Persistence layer — Vercel KV (Upstash Redis) in production,
// in-memory Map for local dev when KV env vars are absent.

import type { Threat, PipelineRun, DashboardStats } from './types.js';

const KV_URL  = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const USE_KV = !!(KV_URL && KV_TOKEN);

// ── In-memory fallback ─────────────────────────────────────────────────────
const memStore = new Map<string, string>();

async function kvGet(key: string): Promise<string | null> {
  if (!USE_KV) return memStore.get(key) ?? null;
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) return null;
  const json = await res.json() as { result: string | null };
  return json.result;
}

async function kvSet(key: string, value: string): Promise<void> {
  if (!USE_KV) { memStore.set(key, value); return; }
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
}

async function kvKeys(pattern: string): Promise<string[]> {
  if (!USE_KV) {
    const prefix = pattern.replace('*', '');
    return [...memStore.keys()].filter(k => k.startsWith(prefix));
  }
  const res = await fetch(`${KV_URL}/keys/${encodeURIComponent(pattern)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) return [];
  const json = await res.json() as { result: string[] };
  return json.result ?? [];
}

// ── Threat CRUD ────────────────────────────────────────────────────────────
const THREAT_PREFIX = 'threat:';
const STATS_KEY     = 'dashboard:stats';
const RUNS_KEY      = 'pipeline:runs';

export async function saveThreat(threat: Threat): Promise<void> {
  await kvSet(`${THREAT_PREFIX}${threat.id}`, JSON.stringify(threat));
}

export async function getThreat(id: string): Promise<Threat | null> {
  const raw = await kvGet(`${THREAT_PREFIX}${id}`);
  return raw ? JSON.parse(raw) as Threat : null;
}

export async function getAllThreats(): Promise<Threat[]> {
  const keys = await kvKeys(`${THREAT_PREFIX}*`);
  const threats = await Promise.all(
    keys.map(async (k) => {
      const raw = await kvGet(k);
      return raw ? JSON.parse(raw) as Threat : null;
    })
  );
  return threats
    .filter((t): t is Threat => t !== null)
    .sort((a, b) => {
      const sevOrder = { critical:0, high:1, medium:2, low:3, info:4 };
      const diff = sevOrder[a.severity] - sevOrder[b.severity];
      return diff !== 0 ? diff : b.score.blended - a.score.blended;
    });
}

export async function getThreatsForModel(modelTag: string): Promise<Threat[]> {
  const all = await getAllThreats();
  return all.filter(t => t.models.includes(modelTag as any) || t.models.includes('multi-model'));
}

export async function getThreatsForVector(vector: string): Promise<Threat[]> {
  const all = await getAllThreats();
  return all.filter(t => t.vectors.includes(vector as any));
}

// ── Stats ──────────────────────────────────────────────────────────────────
export async function saveStats(stats: DashboardStats): Promise<void> {
  await kvSet(STATS_KEY, JSON.stringify(stats));
}

export async function getStats(): Promise<DashboardStats | null> {
  const raw = await kvGet(STATS_KEY);
  return raw ? JSON.parse(raw) as DashboardStats : null;
}

export async function computeAndSaveStats(): Promise<DashboardStats> {
  const { SEED_THREATS } = await import('./seed.js');
  let threats = await getAllThreats();
  // Fall back to seed data so the dashboard is never blank on first deploy
  if (threats.length === 0) threats = SEED_THREATS as any[];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const modelSet = new Set(threats.flatMap(t => t.models).filter((m: string) => m !== 'multi-model'));

  const stats: DashboardStats = {
    totalThreats:    threats.length,
    activeCritical:  threats.filter(t => t.severity === 'critical' && t.status === 'active').length,
    activeHigh:      threats.filter(t => t.severity === 'high'     && t.status === 'active').length,
    newThisWeek:     threats.filter(t => t.publishedAt >= oneWeekAgo).length,
    modelsAffected:  modelSet.size,
    lastUpdated:     new Date().toISOString(),
    pipelineStatus:  'healthy',
  };

  await saveStats(stats);
  return stats;
}

// ── Pipeline run log ───────────────────────────────────────────────────────
export async function logPipelineRun(run: PipelineRun): Promise<void> {
  const raw = await kvGet(RUNS_KEY);
  const runs: PipelineRun[] = raw ? JSON.parse(raw) : [];
  runs.unshift(run);
  await kvSet(RUNS_KEY, JSON.stringify(runs.slice(0, 50))); // keep last 50
}

export async function getPipelineRuns(): Promise<PipelineRun[]> {
  const raw = await kvGet(RUNS_KEY);
  return raw ? JSON.parse(raw) as PipelineRun[] : [];
}
