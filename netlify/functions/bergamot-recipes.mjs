import { getStore } from '@netlify/blobs';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default async (req, context) => {
  const token = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!token) return new Response('Token manquant', { status: 401 });

  // Nouveau store — évite les conflits avec l'ancien recipes-cache supprimé
  const store = getStore('bergamot-cache');
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';

  if (!force) {
    try {
      const meta = await store.get('meta', { type: 'json' });
      if (meta && Date.now() - meta.ts < TTL_MS) {
        const cached = await store.get('recipes', { type: 'json' });
        if (cached && cached.length > 0) {
          return new Response(JSON.stringify(cached), {
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
          });
        }
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('https://api.bergamot.app/recipes/', {
      headers: { Authorization: token },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return new Response(`Bergamot error ${res.status}`, { status: res.status });

    const all = await res.json();
    const out = [];
    for (const r of all) {
      const ings  = (r.ingredients  || [])[0]?.data || [];
      const steps = (r.instructions || [])[0]?.data || [];
      if (ings.length < 2 || steps.length < 1) continue;
      const photos = r.photos || [];
      out.push({
        id: r.id, t: (r.title || '').trim().slice(0, 65),
        p: photos[0]?.photoThumbUrl || null,
        tm: r.time?.totalTime || 0,
        in: ings.slice(0, 10), st: steps.slice(0, 5), c: r.categories || [],
      });
    }

    try {
      await store.setJSON('recipes', out);
      await store.setJSON('meta', { ts: Date.now(), count: out.length });
    } catch (e) {}

    return new Response(JSON.stringify(out), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
};

export const config = { path: '/.netlify/functions/bergamot-recipes' };
