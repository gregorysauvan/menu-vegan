// ─────────────────────────────────────────────────────────────────
// marmiton-scraper.js  —  Netlify Function
// Stratégie : type de plat × lettre de l'alphabet → couverture max
// POST {} → utilise les combos par défaut (~4000-5000 recettes)
// POST { types, letters, limit } → paramétrable
// ─────────────────────────────────────────────────────────────────
import { searchRecipes, MarmitonQueryBuilder, RECIPE_TYPE } from 'marmiton-api';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Types de plats utiles pour un menu de la semaine
const DEFAULT_TYPES = [
  RECIPE_TYPE.STARTER,     // entree
  RECIPE_TYPE.MAIN_COURSE, // platprincipal
  RECIPE_TYPE.SIDE_DISH,   // accompagnement
  RECIPE_TYPE.DESSERT,     // dessert
];

function toInternalRecipe(r, srcKey) {
  const title = (r.name || '').trim().slice(0, 65);
  const ings  = (r.ingredients || []).slice(0, 12);
  const steps = (r.steps || []).slice(0, 6);
  const time  = r.totalTime || r.prepTime || 0;

  // Mapper le type Marmiton vers les cat IDs internes de l'app
  const catMap = {
    'entree':         [8602],
    'platprincipal':  [8603],
    'accompagnement': [8603],
    'dessert':        [8604],
  };
  const cats = catMap[r.type] || [];

  return {
    id:    r.url || `marmiton-${encodeURIComponent(title)}`,
    src:   'marmiton',
    title,
    photo: r.picture || null,
    time,
    ings,
    steps,
    cats,
    url:   r.url || 'https://www.marmiton.org',
  };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('POST requis', { status: 405 });
  }

  let types   = DEFAULT_TYPES;
  let letters = ALPHABET;
  let limit   = 48; // par appel API

  try {
    const body = await req.json();
    if (Array.isArray(body.types)   && body.types.length)   types   = body.types;
    if (Array.isArray(body.letters) && body.letters.length) letters = body.letters;
    if (body.limit) limit = Math.min(body.limit, 100);
  } catch {}

  const seen    = new Set();
  const results = [];
  const errors  = [];

  // Boucle types × lettres
  for (const type of types) {
    for (const letter of letters) {
      try {
        const qb = new MarmitonQueryBuilder();
        const q  = qb
          .withType(type)
          .withTitleContaining(letter)
          .withPhoto()        // uniquement les recettes avec photo
          .build();

        const recipes = await searchRecipes(q, { limit });

        for (const r of recipes) {
          const id = r.url || r.name;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          results.push(toInternalRecipe(r, 'marmiton'));
        }
      } catch (e) {
        // On log mais on continue — une lettre ratée n'est pas critique
        errors.push(`${type}/${letter}: ${e.message}`);
        console.warn(`[marmiton] ${type}/${letter}:`, e.message);
      }

      // Pause 200ms entre chaque appel pour respecter Marmiton
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[marmiton] Type "${type}" terminé — ${results.length} recettes uniques jusqu'ici`);
  }

  console.log(`[marmiton] Terminé — ${results.length} recettes, ${errors.length} erreurs`);

  return new Response(
    JSON.stringify({ ok: true, count: results.length, recipes: results, errors }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

export const config = { path: '/.netlify/functions/marmiton-scraper' };
