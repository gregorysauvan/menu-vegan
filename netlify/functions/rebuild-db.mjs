import { getStore } from '@netlify/blobs';

const SOURCES = {
  'lafeestephanie':     { name: 'La fée Stéphanie',      url: 'https://www.lafeestephanie.com',    type: 'wordpress', specialty: 'vegan',   icon: '🧚' },
  'rosecitron':         { name: 'Rose Citron',            url: 'https://rosecitron.fr',             type: 'wordpress', specialty: 'vegan',   icon: '🍋' },
  'deliacious':         { name: 'Deliacious',             url: 'https://deliacious.com',            type: 'blogger',   specialty: 'vegan',   icon: '🌱' },
  'freethepickle':      { name: 'Free The Pickle',        url: 'https://freethepickle.fr',          type: 'wordpress', specialty: 'vegan',   icon: '🥒' },
  'healthylalou':       { name: 'Healthy Lalou',          url: 'https://healthylalou.fr',           type: 'wordpress', specialty: 'healthy', icon: '💚' },
  'saveursbio':         { name: 'Saveurs Bio',            url: 'https://www.saveurs-bio.fr',        type: 'wordpress', specialty: 'bio',     icon: '🌿' },
  'barbarafrenchvegan': { name: 'Barbara French Vegan',   url: 'https://barbarafrenchvegan.com',    type: 'wordpress', specialty: 'vegan',   icon: '🌸' },
  'iletaituneveggie':   { name: 'Il était une veggie',    url: 'https://iletaituneveggie.com',      type: 'wordpress', specialty: 'vegan',   icon: '🥦' },
  // papillesetpupilles : bloque API WP et sitemaps → désactivé
  // 'papillesetpupilles': { name: 'Papilles et Pupilles', ... },
  'ptitchef': {
    name: 'Ptitchef', url: 'https://www.ptitchef.com', type: 'sitemap', specialty: 'general', icon: '👨‍🍳', maxRecipes: 3000,
    sitemaps: ['https://www.ptitchef.com/upload_data/sitemaps/recipe-fr-1.xml'],
  },
  'cuisinevegetalienne': {
    name: 'Cuisine Végétalienne', url: 'https://cuisinevegetalienne.fr', type: 'wordpress', specialty: 'vegan', icon: '🌾',
  },
};

export default async (req) => {
  const store = getStore('recipes-cache');
  const url   = new URL(req.url);
  const action = url.searchParams.get('action') || 'list';

  // ── GET ?action=list ──────────────────────────────────────────
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
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  }

  // ── GET ?action=get&source=KEY ────────────────────────────────
  if (action === 'get') {
    const sourceKey = url.searchParams.get('source');
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

  // ── POST ?action=save&source=KEY ──────────────────────────────
  // Reçoit { recipes: [...] } depuis admin.html et stocke dans les Blobs
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
      return new Response(JSON.stringify({ ok: true, count: recipes.length }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('action inconnue', { status: 400 });
};

export const config = { path: '/.netlify/functions/rebuild-db' };
