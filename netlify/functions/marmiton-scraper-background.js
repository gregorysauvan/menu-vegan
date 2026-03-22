// ─────────────────────────────────────────────────────────────────
// marmiton-scraper-background.js
// Suffixe -background = timeout 15 min, retourne 202 immédiatement
// Scrape Marmiton type × lettre, sauvegarde dans Netlify Blobs
// ─────────────────────────────────────────────────────────────────
import { getStore } from '@netlify/blobs';
import { searchRecipes, MarmitonQueryBuilder, RECIPE_TYPE } from 'marmiton-api';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

const DEFAULT_TYPES = [
  RECIPE_TYPE.STARTER,      // entree      → cats [8602]
  RECIPE_TYPE.MAIN_COURSE,  // platprincipal → cats [8603]
  RECIPE_TYPE.SIDE_DISH,    // accompagnement → cats [8603]
  RECIPE_TYPE.DESSERT,      // dessert     → cats [8604]
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
  // Utiliser strong consistency pour que les mises à jour de statut
  // soient immédiatement visibles par les lectures côté client
  const store = getStore({ name: 'recipes-cache', consistency: 'strong' });

  // Marquer comme "en cours" dès le départ
  await store.setJSON('src-meta-marmiton', {
    status: 'running',
    startedAt: Date.now(),
    name: 'Marmiton',
    progress: 0,
    count: 0,
    ts: null,
  });

  const seen    = new Set();
  const results = [];
  const total   = DEFAULT_TYPES.length * ALPHABET.length; // 104
  let   done    = 0;

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

      // Mise à jour du statut toutes les 13 itérations (~toutes les ~26s)
      if (done % 13 === 0) {
        try {
          await store.setJSON('src-meta-marmiton', {
            status: 'running',
            startedAt: Date.now(),
            name: 'Marmiton',
            progress: Math.round((done / total) * 100),
            count: results.length,
            ts: null,
          });
        } catch(e) {
          console.warn('[marmiton] Erreur mise à jour statut:', e.message);
        }
      }

      // Pause entre requêtes pour ne pas se faire bloquer
      await new Promise(r => setTimeout(r, 250));
    }

    console.log(`[marmiton] Type "${type}" terminé — ${results.length} recettes uniques`);
  }

  // Sauvegarde finale
  await store.setJSON('src-marmiton', results);
  await store.setJSON('src-meta-marmiton', {
    status: 'done',
    ts: Date.now(),
    count: results.length,
    name: 'Marmiton',
    progress: 100,
  });

  console.log(`[marmiton] Terminé — ${results.length} recettes uniques`);
};
