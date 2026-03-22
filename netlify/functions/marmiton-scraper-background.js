// ─────────────────────────────────────────────────────────────────
// marmiton-scraper-background.js  (suffix -background = 15min max)
// Scrape Marmiton par type × lettre, sauvegarde dans Blobs
// ─────────────────────────────────────────────────────────────────
import { getStore } from '@netlify/blobs';
import { searchRecipes, MarmitonQueryBuilder, RECIPE_TYPE } from 'marmiton-api';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

const DEFAULT_TYPES = [
  RECIPE_TYPE.STARTER,      // entree
  RECIPE_TYPE.MAIN_COURSE,  // platprincipal
  RECIPE_TYPE.SIDE_DISH,    // accompagnement
  RECIPE_TYPE.DESSERT,      // dessert
];

const CAT_MAP = {
  'entree':         [8602],
  'platprincipal':  [8603],
  'accompagnement': [8603],
  'dessert':        [8604],
};

function toInternalRecipe(r) {
  const title = (r.name || '').trim().slice(0, 65);
  return {
    id:    r.url || `marmiton-${encodeURIComponent(title)}`,
    src:   'marmiton',
    title,
    photo: r.picture || null,
    time:  r.totalTime || r.prepTime || 0,
    ings:  (r.ingredients || []).slice(0, 12),
    steps: (r.steps || []).slice(0, 6),
    cats:  CAT_MAP[r.type] || [],
    url:   r.url || 'https://www.marmiton.org',
  };
}

export default async (req) => {
  const store = getStore('recipes-cache');

  // Marquer comme "en cours"
  await store.setJSON('src-meta-marmiton', {
    status: 'running', startedAt: Date.now(),
    name: 'Marmiton', ts: null, count: 0,
  });

  const seen    = new Set();
  const results = [];
  let   done    = 0;
  const total   = DEFAULT_TYPES.length * ALPHABET.length;

  for (const type of DEFAULT_TYPES) {
    for (const letter of ALPHABET) {
      try {
        const q = new MarmitonQueryBuilder()
          .withType(type)
          .withTitleContaining(letter)
          .withPhoto()
          .build();

        const recipes = await searchRecipes(q, { limit: 48 });
        for (const r of recipes) {
          const id = r.url || r.name;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          results.push(toInternalRecipe(r));
        }
      } catch (e) {
        console.warn(`[marmiton] ${type}/${letter}: ${e.message}`);
      }

      done++;
      // Mise à jour du statut toutes les 10 itérations
      if (done % 10 === 0) {
        await store.setJSON('src-meta-marmiton', {
          status: 'running',
          startedAt: Date.now(),
          name: 'Marmiton',
          progress: Math.round(done / total * 100),
          count: results.length,
          ts: null,
        });
      }

      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Sauvegarder les recettes
  await store.setJSON('src-marmiton', results);
  await store.setJSON('src-meta-marmiton', {
    status: 'done',
    ts: Date.now(),
    count: results.length,
    name: 'Marmiton',
  });

  console.log(`[marmiton] Terminé — ${results.length} recettes uniques`);
};
