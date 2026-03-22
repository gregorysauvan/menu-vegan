import { getStore } from '@netlify/blobs';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export default async (req, context) => {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  const force = url.searchParams.get('force') === '1';
  if (!targetUrl) return new Response('URL manquante', { status: 400 });

  const store = getStore('pages-cache');
  const cacheKey = 'p-' + Buffer.from(targetUrl).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 60);

  if (!force) {
    try {
      const cached = await store.get(cacheKey, { type: 'json' });
      // Invalider le cache si le body est vide ou trop court (page mal cachée)
      if (cached && cached.body && cached.body.length > 500 && Date.now() - (cached.ts || 0) < TTL_MS) {
        return new Response(cached.body, {
          status: cached.status || 200,
          headers: {
            'Content-Type': cached.ct || 'text/html',
            'X-WP-Total': cached.wpTotal || '',
            'X-WP-TotalPages': cached.wpPages || '',
            'X-Cache': 'HIT',
          },
        });
      }
    } catch (e) {}
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    const body = await res.text();
    const ct      = res.headers.get('content-type') || 'text/html';
    const wpTotal = res.headers.get('X-WP-Total') || '';
    const wpPages = res.headers.get('X-WP-TotalPages') || '';

    // Ne cacher que si le body a du contenu réel
    if (body.length > 500) {
      try {
        await store.setJSON(cacheKey, { ts: Date.now(), body, ct, status: res.status, wpTotal, wpPages });
      } catch (e) {}
    }

    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': ct, 'X-WP-Total': wpTotal, 'X-WP-TotalPages': wpPages, 'X-Cache': 'MISS' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
  }
};

export const config = { path: '/.netlify/functions/check-site' };
