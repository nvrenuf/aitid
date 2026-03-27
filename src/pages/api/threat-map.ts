import type { APIRoute } from 'astro';
import { getThreatMapDataset } from '../../lib/threat-map.js';

export const GET: APIRoute = async () => {
  try {
    const dataset = await getThreatMapDataset();

    return new Response(JSON.stringify(dataset), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to build threat map dataset', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
