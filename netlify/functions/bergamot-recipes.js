const { getStore } = require('@netlify/blobs');

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

exports.handler = async (event) => {
  const token = event.headers.authorization || event.headers.Authorization;
  if (!token) return { statusCode: 401, body: 'Token manquant' };

  const store = getStore('recipes-cache');
  const force = event.queryStringParameters?.force === '1';

  // ── Lire le cache Blobs ──
  if (!force) {
    try {
      const meta = await store.get('bergamot-meta', { type: 'json' });
      if (meta && Date.now() - meta.ts < TTL_MS) {
        const cached = await store.get('bergamot-recipes', { type: 'json' });
        if (cached && cached.length > 0) {
          console.log(`[Blobs] Cache hit: ${cached.length} recettes`);
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'private, max-age=3600',
              'Access-Control-Allow-Origin': '*',
              'X-Cache': 'HIT',
              'X-Cache-Age': String(Math.round((Date.now() - meta.ts) / 3600000)) + 'h',
            },
            body: JSON.stringify(cached),
          };
        }
      }
    } catch (e) {
      console.warn('[Blobs] Lecture cache:', e.message);
    }
  }

  // ── Cache manquant ou expiré → charger Bergamot ──
  console.log('[Blobs] Cache miss — chargement Bergamot…');
  try {
    const res = await fetch('https://api.bergamot.app/recipes/', {
      headers: { 'Authorization': token },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return { statusCode: res.status, body: `Bergamot error ${res.status}` };

    const all = await res.json();
    const out = [];

    for (const r of all) {
      const cats  = r.categories || [];
      const ings  = (r.ingredients  || [])[0]?.data || [];
      const steps = (r.instructions || [])[0]?.data || [];
      if (ings.length < 2 || steps.length < 1) continue;
      const photos = r.photos || [];
      out.push({
        id: r.id,
        t:  (r.title || '').trim().slice(0, 65),
        p:  photos[0]?.photoThumbUrl || null,
        tm: r.time?.totalTime || 0,
        in: ings.slice(0, 10),
        st: steps.slice(0, 5),
        c:  cats,
      });
    }

    // ── Sauvegarder dans Blobs ──
    try {
      await store.setJSON('bergamot-recipes', out);
      await store.setJSON('bergamot-meta', { ts: Date.now(), count: out.length });
      console.log(`[Blobs] Sauvegardé: ${out.length} recettes`);
    } catch (e) {
      console.warn('[Blobs] Écriture:', e.message);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS',
      },
      body: JSON.stringify(out),
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};
