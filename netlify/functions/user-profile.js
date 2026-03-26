import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'menu-user-profiles';

function getTokenKey(req) {
  const token = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!token) return null;
  return createHash('sha256').update(token).digest('hex').slice(0, 24);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizeProfile(input = {}) {
  return {
    activeSources: Array.isArray(input.activeSources) ? input.activeSources : [],
    sites: Array.isArray(input.sites) ? input.sites : [],
    diets: Array.isArray(input.diets) ? input.diets : [],
    season: typeof input.season === 'string' ? input.season : 'all',
    strict: !!input.strict,
    prot: !!input.prot,
    bergPriority: !!input.bergPriority,
    mealTypes: Array.isArray(input.mealTypes) ? input.mealTypes : [],
    courseTypes: Array.isArray(input.courseTypes) ? input.courseTypes : [],
    viewMode: input.viewMode === 'cartes' ? 'cartes' : 'agenda',
    ideas: Array.isArray(input.ideas) ? input.ideas : [],
    stock: Array.isArray(input.stock) ? input.stock : [],
    firstDay: Number.isInteger(input.firstDay) ? input.firstDay : 1,
    mealCount: Number.isInteger(input.mealCount) ? input.mealCount : 6,
    favoriteRecipes: Array.isArray(input.favoriteRecipes) ? input.favoriteRecipes : [],
    bookCategoryOverrides:
      input.bookCategoryOverrides && typeof input.bookCategoryOverrides === 'object'
        ? input.bookCategoryOverrides
        : {},
    updatedAt: Date.now(),
  };
}

export default async (req) => {
  const tokenKey = getTokenKey(req);
  if (!tokenKey) return json({ error: 'Token manquant' }, 401);

  const store = getStore(STORE_NAME);
  const key = `profile-${tokenKey}`;

  if (req.method === 'GET') {
    try {
      const profile = await store.get(key, { type: 'json' });
      return json({ ok: true, profile: profile || null });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = await req.json();
      const profile = sanitizeProfile(payload);
      await store.setJSON(key, profile);
      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  return json({ error: 'Méthode non supportée' }, 405);
};
