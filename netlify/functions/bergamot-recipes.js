const { getStore } = require('@netlify/blobs');

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

exports.handler = async (event) => {
  const token = event.headers.authorization || event.headers.Authorization;
  if (!token) return { statusCode: 401, body: 'Token manquant' };

  const store = getStore('recipes-cache');
  const force = event.queryStringParameters?.force === '1';

  if (!force) {
    try {
      const meta = await store.get('bergamot-meta', { type: 'json' });
      if (meta && Date.now() - meta.ts < TTL_MS) {
        const cached = await store.get('bergamot-recipes', { type: 'json' });
        if (cached && cached.length > 0) {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'HIT' },
            body: JSON.stringify(cached),
          };
        }
      }
    } catch(e) { console.warn('Blobs read:', e.message); }
  }

  try {
    const res = await fetch('https://api.bergamot.app/recipes/', {
      headers: { Authorization: token },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return { statusCode: res.status, body: `Bergamot error ${res.status}` };

    const all = await res.json();
    const out = [];
    for (const r of all) {
      const ings  = (r.ingredients  || [])[0]?.data || [];
      const steps = (r.instructions || [])[0]?.data || [];
      if (ings.length < 2 || steps.length < 1) continue;
      const photos = r.photos || [];
      out.push({
        id: r.id, t: (r.title||'').trim().slice(0,65),
        p: photos[0]?.photoThumbUrl || null,
        tm: r.time?.totalTime || 0,
        in: ings.slice(0,10), st: steps.slice(0,5), c: r.categories || [],
      });
    }

    try {
      await store.setJSON('bergamot-recipes', out);
      await store.setJSON('bergamot-meta', { ts: Date.now(), count: out.length });
    } catch(e) { console.warn('Blobs write:', e.message); }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'MISS' },
      body: JSON.stringify(out),
    };
  } catch(e) { return { statusCode: 500, body: String(e) }; }
};
