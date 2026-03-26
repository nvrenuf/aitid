// src/pages/api/stats.ts
import type { APIRoute } from 'astro';
import { getStats, computeAndSaveStats } from '../../lib/store.js';

export const GET: APIRoute = async () => {
  try {
    let stats = await getStats();
    if (!stats) stats = await computeAndSaveStats();

    return new Response(JSON.stringify(stats), {
      status:  200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
