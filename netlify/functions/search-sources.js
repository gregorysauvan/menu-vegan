function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function cleanupText(text = '') {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeDuckUrl(url = '') {
  try {
    const parsed = new URL(url, 'https://duckduckgo.com');
    const uddg = parsed.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : parsed.href;
  } catch {
    return url;
  }
}

function detectSpecialty(text = '') {
  const raw = String(text || '').toLowerCase();
  if (/\bvegan|v[ée]g[ée]tal|plant based|veggie\b/.test(raw)) return 'vegan';
  if (/\bbio|organic\b/.test(raw)) return 'bio';
  if (/\bhealthy|sain|ig bas|fit\b/.test(raw)) return 'healthy';
  return 'general';
}

function recipeScore(title = '', snippet = '', url = '') {
  const hay = `${title} ${snippet} ${url}`.toLowerCase();
  let score = 0;
  if (/recette|cuisine|cook|food|gourmand|chef|vegan|v[ée]g[ée]tal|dessert|plat/.test(hay)) score += 4;
  if (/wordpress|blogspot/.test(hay)) score += 1;
  if (/pinterest|facebook|instagram|youtube|tiktok|amazon|fnac|wikipedia/.test(hay)) score -= 6;
  if (/\/tag\/|\/category\/|\/categorie\//.test(hay)) score -= 2;
  if (/recette|cuisine|vegan|bio|healthy/.test(url.toLowerCase())) score += 2;
  return score;
}

export default async (req) => {
  const url = new URL(req.url);
  const q = String(url.searchParams.get('q') || '').trim();
  if (!q) return json({ ok: false, error: 'q requis' }, 400);

  try {
    const query = `${q} site de recettes`;
    const ddg = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    if (!ddg.ok) return json({ ok: false, error: `Recherche HTTP ${ddg.status}` }, 502);
    const html = await ddg.text();

    const seenHosts = new Set();
    const results = [];
    const matches = [...html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const match of matches) {
      const href = decodeDuckUrl(match[1]);
      let parsed;
      try {
        parsed = new URL(href);
      } catch {
        continue;
      }
      const host = parsed.hostname.replace(/^www\./, '');
      if (!/^https?:/.test(parsed.protocol)) continue;
      if (seenHosts.has(host)) continue;
      const title = cleanupText(match[2]);
      const snippet = cleanupText(match[3]);
      const score = recipeScore(title, snippet, href);
      if (score < 2) continue;
      seenHosts.add(host);
      results.push({
        title: title || host,
        url: `${parsed.protocol}//${parsed.hostname}`,
        snippet,
        score,
        specialty: detectSpecialty(`${title} ${snippet} ${host}`),
      });
      if (results.length >= 12) break;
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
};
