import { getStore } from '@netlify/blobs';

const DEFAULT_SOURCES = {
  'lafeestephanie':     { name: 'La fée Stéphanie',      url: 'https://www.lafeestephanie.com',    type: 'wordpress', specialty: 'vegan',   icon: '🧚' },
  'rosecitron':         { name: 'Rose Citron',            url: 'https://rosecitron.fr',             type: 'wordpress', specialty: 'vegan',   icon: '🍋' },
  'deliacious': {
    name: 'Deliacious', url: 'https://deliacious.com', type: 'sitemap', specialty: 'vegan', icon: '🌱', maxRecipes: 2500,
    sitemaps: ['https://deliacious.com/post-sitemap1.xml'],
  },
  'freethepickle':      { name: 'Free The Pickle',        url: 'https://freethepickle.fr',          type: 'wordpress', specialty: 'vegan',   icon: '🥒' },
  'healthylalou':       { name: 'Healthy Lalou',          url: 'https://healthylalou.fr',           type: 'wordpress', specialty: 'healthy', icon: '💚' },
  'saveursbio':         { name: 'Saveurs Bio',            url: 'https://www.saveurs-bio.fr',        type: 'wordpress', specialty: 'bio',     icon: '🌿' },
  'barbarafrenchvegan': { name: 'Barbara French Vegan',   url: 'https://barbarafrenchvegan.com',    type: 'wordpress', specialty: 'vegan',   icon: '🌸' },
  'iletaituneveggie':   { name: 'Il était une veggie',    url: 'https://iletaituneveggie.com',      type: 'wordpress', specialty: 'vegan',   icon: '🥦' },
  'ptitchef': {
    name: 'Ptitchef', url: 'https://www.ptitchef.com', type: 'sitemap', specialty: 'general', icon: '👨‍🍳', maxRecipes: 3000,
    sitemaps: ['https://www.ptitchef.com/upload_data/sitemaps/recipe-fr-1.xml'],
  },
  'cuisinevegetalienne': {
    name: 'Cuisine Végétalienne', url: 'https://cuisinevegetalienne.fr', type: 'wordpress', specialty: 'vegan', icon: '🌾',
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function normalizeSource(input = {}) {
  return {
    name: String(input.name || '').trim(),
    url: String(input.url || '').trim().replace(/\/$/, ''),
    type: ['wordpress', 'blogger', 'sitemap'].includes(input.type) ? input.type : 'wordpress',
    wpRestBase: String(input.wpRestBase || '').trim() || undefined,
    specialty: String(input.specialty || 'general').trim() || 'general',
    icon: String(input.icon || '🌐').trim() || '🌐',
    maxRecipes: Number.isInteger(input.maxRecipes) ? input.maxRecipes : undefined,
    estimatedCount: Number.isInteger(input.estimatedCount) ? input.estimatedCount : undefined,
    sitemaps: Array.isArray(input.sitemaps) ? input.sitemaps.filter(Boolean) : undefined,
    custom: true,
  };
}

async function getMergedSources(store) {
  const custom = (await store.get('source-catalog', { type: 'json' })) || {};
  return { ...DEFAULT_SOURCES, ...custom };
}

export default async (req) => {
  const store = getStore('recettes-v2');
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'list';
  const SOURCES = await getMergedSources(store);

  if (action === 'list') {
    const result = {};
    for (const [key, src] of Object.entries(SOURCES)) {
      try {
        const meta = await store.get(`src-meta-${key}`, { type: 'json' });
        result[key] = { ...src, cached: !!meta, count: meta?.count || 0, updatedAt: meta?.ts || null };
      } catch {
        result[key] = { ...src, cached: false, count: 0, updatedAt: null };
      }
    }
    return json(result);
  }

  if (action === 'catalog-save' && req.method === 'POST') {
    try {
      const { key, source } = await req.json();
      if (!key || !source) return json({ ok: false, error: 'key et source requis' }, 400);
      const custom = (await store.get('source-catalog', { type: 'json' })) || {};
      custom[key] = normalizeSource(source);
      await store.setJSON('source-catalog', custom);
      return json({ ok: true, key });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  if (action === 'catalog-delete' && req.method === 'POST') {
    try {
      const { key, purge } = await req.json();
      if (!key) return json({ ok: false, error: 'key requis' }, 400);
      const custom = (await store.get('source-catalog', { type: 'json' })) || {};
      delete custom[key];
      await store.setJSON('source-catalog', custom);
      if (purge) {
        await store.delete(`src-${key}`);
        await store.delete(`src-meta-${key}`);
      }
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  if (action === 'get') {
    const sourceKey = url.searchParams.get('source');
    const view = url.searchParams.get('view') || 'full';
    if (!sourceKey) return new Response('source requis', { status: 400 });
    try {
      const data = await store.get(`src-${sourceKey}`, { type: 'json' });
      if (!data) return json([], 404);
      const payload = view === 'compact'
        ? data.map((r) => ({
            id: r.id,
            src: r.src || sourceKey,
            title: r.title,
            photo: r.photo || null,
            time: r.time || 0,
            ings: Array.isArray(r.ings) ? r.ings.slice(0, 12) : [],
            cats: Array.isArray(r.cats) ? r.cats : [],
            menuType: r.menuType || null,
            menuMoment: r.menuMoment || null,
            isMenuCompatible: r.isMenuCompatible !== false,
            classificationReason: r.classificationReason || null,
            classificationVersion: r.classificationVersion || 0,
          }))
        : data;
      return json(payload, 200);
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }

  if (action === 'recipe') {
    const sourceKey = url.searchParams.get('source');
    const recipeId = url.searchParams.get('id');
    if (!sourceKey || !recipeId) return new Response('source et id requis', { status: 400 });
    try {
      const data = await store.get(`src-${sourceKey}`, { type: 'json' });
      if (!Array.isArray(data)) return json(null, 404);
      const wanted = decodeURIComponent(recipeId);
      const recipe = data.find((r) => String(r?.id) === wanted);
      return json(recipe || null, recipe ? 200 : 404);
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  }

  if (action === 'save' && req.method === 'POST') {
    const sourceKey = url.searchParams.get('source');
    if (!sourceKey || !SOURCES[sourceKey]) {
      return new Response('source invalide', { status: 400 });
    }
    try {
      const { recipes } = await req.json();
      if (!Array.isArray(recipes)) return new Response('recipes[] attendu', { status: 400 });
      await store.setJSON(`src-${sourceKey}`, recipes);
      await store.setJSON(`src-meta-${sourceKey}`, {
        ts: Date.now(),
        count: recipes.length,
        name: SOURCES[sourceKey].name,
      });
      return json({ ok: true, count: recipes.length });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  return new Response('action inconnue', { status: 400 });
};
