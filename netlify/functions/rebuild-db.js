import { getStore } from '@netlify/blobs';

const SOURCES = {
  'lafeestephanie': { name: 'La fée Stéphanie', url: 'https://www.lafeestephanie.com', type: 'wordpress', specialty: 'vegan', icon: '🧚' },
  'rosecitron':     { name: 'Rose Citron',       url: 'https://rosecitron.fr',           type: 'wordpress', specialty: 'vegan', icon: '🍋' },
  'deliacious':     { name: 'Deliacious',         url: 'https://deliacious.com',          type: 'blogger',   specialty: 'vegan', icon: '🌱' },
  'freethepickle':  { name: 'Free The Pickle',    url: 'https://freethepickle.fr',        type: 'wordpress', specialty: 'vegan', icon: '🥒' },
  'healthylalou':   { name: 'Healthy Lalou',      url: 'https://healthylalou.fr',         type: 'wordpress', specialty: 'healthy', icon: '💚' },
  'saveursbio':     { name: 'Saveurs Bio',         url: 'https://www.saveurs-bio.fr',      type: 'wordpress', specialty: 'bio',   icon: '🌿' },
  'barbarafrenchvegan': { name: 'Barbara French Vegan', url: 'https://barbarafrenchvegan.com', type: 'wordpress', specialty: 'vegan', icon: '🌸' },
  'iletaituneveggie':   { name: 'Il était une veggie',  url: 'https://iletaituneveggie.com',   type: 'wordpress', specialty: 'vegan', icon: '🥦' },
  'papillesetpupilles': {
    name: 'Papilles et Pupilles', url: 'https://www.papillesetpupilles.fr', type: 'sitemap', specialty: 'general', icon: '👅',
    sitemaps: ['https://www.papillesetpupilles.fr/post-sitemap.xml','https://www.papillesetpupilles.fr/post-sitemap2.xml','https://www.papillesetpupilles.fr/post-sitemap3.xml'],
  },
  'ptitchef': {
    name: 'Ptitchef', url: 'https://www.ptitchef.com', type: 'sitemap', specialty: 'general', icon: '👨‍🍳', maxRecipes: 3000,
    sitemaps: ['https://www.ptitchef.com/upload_data/sitemaps/recipe-fr-1.xml'],
  },
};

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120',
  'Accept': 'text/html,application/xml,application/json,*/*',
  'Accept-Language': 'fr-FR,fr;q=0.9',
};

async function pFetch(url, timeout = 15000) {
  return fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(timeout) });
}

function extractRecipe(html, url, srcKey) {
  const blocks = [...html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  for (const block of blocks) {
    try {
      const d = JSON.parse(block.trim());
      const items = Array.isArray(d) ? d : (d['@graph'] ? d['@graph'] : [d]);
      for (const item of items) {
        if (!item || !/Recipe/.test(JSON.stringify(item['@type'] || ''))) continue;
        const ings = item.recipeIngredient || [];
        if (ings.length < 2) continue;
        const rawSteps = item.recipeInstructions || [];
        const steps = (Array.isArray(rawSteps) ? rawSteps : [rawSteps])
          .map(s => typeof s === 'object' ? (s.text || '') : String(s))
          .filter(s => s.trim().length > 5);
        const img = item.image;
        const photo = Array.isArray(img) ? img[0] : (img && typeof img === 'object' ? img.url : img) || null;
        const title = (item.name || '').replace(/<[^>]+>/g, '').trim().slice(0, 65);
        if (!title) continue;
        const timeStr = item.totalTime || item.cookTime || '';
        const tm = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        const time = tm ? (+(tm[1] || 0)) * 60 + (+(tm[2] || 0)) : 0;
        return { id: url, src: srcKey, title, photo: photo ? String(photo).slice(0, 300) : null, time, ings: ings.slice(0, 12), steps: steps.slice(0, 6), cats: [] };
      }
    } catch (e) {}
  }
  return null;
}

async function loadWordpress(sourceKey, source, onProgress) {
  const base = source.url;
  const results = [], allLinks = [];
  let page = 1, totalPages = 1;
  while (page <= Math.min(totalPages, 20)) {
    try {
      const r = await pFetch(`${base}/wp-json/wp/v2/posts?per_page=50&page=${page}&_fields=link`);
      if (!r.ok) break;
      if (page === 1) totalPages = parseInt(r.headers.get('X-WP-TotalPages') || '1');
      const posts = await r.json();
      if (!Array.isArray(posts) || !posts.length) break;
      posts.forEach(p => { if (p.link) allLinks.push(p.link); });
      page++;
    } catch (e) { break; }
  }
  onProgress(`${source.name}: ${allLinks.length} articles…`);
  for (let i = 0; i < allLinks.length; i += 8) {
    await Promise.all(allLinks.slice(i, i + 8).map(async link => {
      try {
        const r = await pFetch(link, 12000);
        if (!r.ok) return;
        const recipe = extractRecipe(await r.text(), link, sourceKey);
        if (recipe) results.push(recipe);
      } catch (e) {}
    }));
    if (i % 40 === 0) onProgress(`${source.name}: ${results.length} recettes…`);
  }
  return results;
}

async function loadBlogger(sourceKey, source, onProgress) {
  const base = source.url;
  const results = [], allLinks = [];
  for (let start = 1; start <= 500; start += 25) {
    try {
      const r = await pFetch(`${base}/feeds/posts/default?alt=rss&max-results=25&start-index=${start}`);
      if (!r.ok) break;
      const text = await r.text();
      const links = [...text.matchAll(/<link>(https?:\/\/[^<]+)<\/link>/g)].map(m => m[1]).filter(l => l !== base && l !== base + '/');
      if (!links.length) break;
      allLinks.push(...links);
      if (allLinks.length >= 500) break;
    } catch (e) { break; }
  }
  onProgress(`${source.name}: ${allLinks.length} articles…`);
  for (let i = 0; i < allLinks.length; i += 8) {
    await Promise.all(allLinks.slice(i, i + 8).map(async link => {
      try {
        const r = await pFetch(link, 12000);
        if (!r.ok) return;
        const recipe = extractRecipe(await r.text(), link, sourceKey);
        if (recipe) results.push(recipe);
      } catch (e) {}
    }));
  }
  return results;
}

async function loadSitemap(sourceKey, source, onProgress) {
  const results = [], allLinks = [];
  const max = source.maxRecipes || 99999;
  for (const smUrl of source.sitemaps) {
    try {
      const r = await pFetch(smUrl, 20000);
      if (!r.ok) continue;
      const text = await r.text();
      const urls = [...text.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(m => m[1]);
      allLinks.push(...urls);
      if (allLinks.length >= max) break;
    } catch (e) { continue; }
  }
  const limited = allLinks.slice(0, max);
  onProgress(`${source.name}: ${limited.length} URLs…`);
  for (let i = 0; i < limited.length; i += 10) {
    await Promise.all(limited.slice(i, i + 10).map(async link => {
      try {
        const r = await pFetch(link, 12000);
        if (!r.ok) return;
        const recipe = extractRecipe(await r.text(), link, sourceKey);
        if (recipe) results.push(recipe);
      } catch (e) {}
    }));
    if (i % 100 === 0 && i > 0) onProgress(`${source.name}: ${results.length} recettes…`);
  }
  return results;
}

export default async (req, context) => {
  const store = getStore('recipes-cache');
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'rebuild';
  const sourceKey = url.searchParams.get('source') || null;

  // GET ?action=list
  if (action === 'list') {
    const result = {};
    for (const [key, src] of Object.entries(SOURCES)) {
      try {
        const meta = await store.get(`src-meta-${key}`, { type: 'json' });
        result[key] = { ...src, cached: !!meta, count: meta?.count || 0, updatedAt: meta?.ts || null };
      } catch (e) {
        result[key] = { ...src, cached: false, count: 0, updatedAt: null };
      }
    }
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  }

  // GET ?action=get&source=key
  if (action === 'get') {
    if (!sourceKey) return new Response('source requis', { status: 400 });
    try {
      const data = await store.get(`src-${sourceKey}`, { type: 'json' });
      return new Response(data ? JSON.stringify(data) : '[]', {
        status: data ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }

  // POST ?action=rebuild
  const sourcesToBuild = sourceKey
    ? (SOURCES[sourceKey] ? { [sourceKey]: SOURCES[sourceKey] } : {})
    : SOURCES;

  const log = [];
  const onProgress = msg => { log.push(msg); console.log(msg); };

  for (const [key, source] of Object.entries(sourcesToBuild)) {
    onProgress(`⏳ Démarrage ${source.name}…`);
    try {
      let recipes = [];
      if (source.type === 'wordpress')   recipes = await loadWordpress(key, source, onProgress);
      else if (source.type === 'blogger') recipes = await loadBlogger(key, source, onProgress);
      else if (source.type === 'sitemap') recipes = await loadSitemap(key, source, onProgress);
      await store.setJSON(`src-${key}`, recipes);
      await store.setJSON(`src-meta-${key}`, { ts: Date.now(), count: recipes.length, name: source.name });
      onProgress(`✅ ${source.name}: ${recipes.length} recettes sauvegardées`);
    } catch (e) {
      onProgress(`❌ ${source.name}: ${e.message}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, log }), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { path: '/.netlify/functions/rebuild-db' };
