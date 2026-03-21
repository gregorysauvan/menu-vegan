const { getStore } = require('@netlify/blobs');

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

exports.handler = async (event) => {
  const url = event.queryStringParameters?.url;
  const force = event.queryStringParameters?.force === '1';
  if (!url) return { statusCode: 400, body: 'URL manquante' };

  const store = getStore('recipes-cache');
  const cacheKey = 'ext-' + Buffer.from(url).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 60);

  // ── Cache Blobs pour les pages externes ──
  if (!force) {
    try {
      const meta = await store.get(cacheKey + '-meta', { type: 'json' });
      if (meta && Date.now() - meta.ts < TTL_MS) {
        const cached = await store.get(cacheKey, { type: 'text' });
        if (cached) {
          return {
            statusCode: meta.status || 200,
            headers: {
              'Content-Type': meta.ct || 'text/html',
              'Access-Control-Allow-Origin': '*',
              'X-WP-Total':      meta.wpTotal || '',
              'X-WP-TotalPages': meta.wpPages || '',
              'X-Cache': 'HIT',
            },
            body: cached,
          };
        }
      }
    } catch (e) {}
  }

  // ── Fetch réel ──
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120',
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    const body = await res.text();
    const ct       = res.headers.get('content-type') || 'text/html';
    const wpTotal  = res.headers.get('X-WP-Total')      || '';
    const wpPages  = res.headers.get('X-WP-TotalPages') || '';

    // Sauvegarder dans Blobs (seulement si pas trop gros)
    if (body.length < 2 * 1024 * 1024) { // < 2 Mo
      try {
        await store.set(cacheKey, body);
        await store.setJSON(cacheKey + '-meta', {
          ts: Date.now(), ct, status: res.status,
          wpTotal, wpPages,
        });
      } catch (e) {}
    }

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'X-WP-Total':      wpTotal,
        'X-WP-TotalPages': wpPages,
        'X-Cache': 'MISS',
      },
      body,
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
