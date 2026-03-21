// Proxy générique côté serveur — contourne le CORS
// Utilisé pour : détecter les sites, charger les listes de posts, charger les pages HTML
exports.handler = async (event) => {
  const url = event.queryStringParameters?.url;
  if (!url) return { statusCode: 400, body: 'URL manquante' };

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

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'text/html',
        'Access-Control-Allow-Origin': '*',
        'X-WP-Total':      res.headers.get('X-WP-Total')      || '',
        'X-WP-TotalPages': res.headers.get('X-WP-TotalPages') || '',
        'X-Real-Status':   String(res.status),
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
