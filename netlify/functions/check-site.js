exports.handler = async (event) => {
  const url = event.queryStringParameters?.url;
  if (!url) return { statusCode: 400, body: 'URL manquante' };

  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    const body = await res.text();
    const headers = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-WP-Total': res.headers.get('X-WP-Total') || '',
        'X-WP-TotalPages': res.headers.get('X-WP-TotalPages') || '',
      },
      body,
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};
