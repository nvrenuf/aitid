// src/pages/api/threats.ts
import type { APIRoute } from 'astro';
import { getAllThreats, getThreatsForModel, getThreatsForVector } from '../../lib/store.js';
import { SEED_THREATS } from '../../lib/seed.js';

export const GET: APIRoute = async ({ url }) => {
  const params  = url.searchParams;
  const model   = params.get('model')   ?? '';
  const vector  = params.get('vector')  ?? '';
  const sev     = params.get('severity') ?? '';
  const type    = params.get('type')    ?? '';
  const status  = params.get('status')  ?? '';
  const q       = params.get('q')?.toLowerCase() ?? '';

  try {
    let threats = model  ? await getThreatsForModel(model)
                : vector ? await getThreatsForVector(vector)
                :          await getAllThreats();

    // Fall back to seed data if store is empty (first deploy before pipeline runs)
    if (threats.length === 0) threats = SEED_THREATS;

    if (sev)    threats = threats.filter(t => t.severity === sev);
    if (type)   threats = threats.filter(t => t.type === type);
    if (status) threats = threats.filter(t => t.status === status);
    if (q)      threats = threats.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.models.some(m => m.includes(q)) ||
      t.vectors.some(v => v.includes(q)) ||
      t.ttps.some(p => p.id.toLowerCase().includes(q))
    );

    return new Response(JSON.stringify({ threats, total: threats.length }), {
      status:  200,
      headers: {
        'Content-Type':                'application/json',
        'Cache-Control':               'public, s-maxage=300, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch threats', detail: String(err) }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
