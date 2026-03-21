exports.handler = async (event, context) => {
  // Timeout Netlify Free = 10s — on streame pour rester dans les clous
  const token = event.headers.authorization || event.headers.Authorization;
  if (!token) return { statusCode: 401, body: 'Token manquant' };

  const BERG_API = 'https://api.bergamot.app';

  try {
    const res = await fetch(`${BERG_API}/recipes/`, {
      headers: { 'Authorization': token },
    });
    if (!res.ok) return { statusCode: res.status, body: `Bergamot error ${res.status}` };

    const all = await res.json();
    const out = [];

    for (const r of all) {
      const cats  = r.categories || [];
      if (!cats.includes(8603)) continue;
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
      });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, max-age=1800',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(out),
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};
