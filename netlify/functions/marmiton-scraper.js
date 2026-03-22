// ─────────────────────────────────────────────────────────────────
// marmiton-scraper.js  —  Fonction synchrone (proxy léger)
//   POST → déclenche la background function, retourne 202
//   GET  → retourne le statut depuis les Blobs
// ─────────────────────────────────────────────────────────────────
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore('recipes-cache');

  // GET → statut
  if (req.method === 'GET') {
    try {
      const meta = await store.get('src-meta-marmiton', { type: 'json' });
      return new Response(JSON.stringify(meta || { status: 'idle' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ status: 'idle' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // POST → déclencher la background function
  if (req.method === 'POST') {
    // Appel fire-and-forget vers la background function
    const bgUrl = new URL(req.url);
    bgUrl.pathname = '/.netlify/functions/marmiton-scraper-background';

    // fetch sans await = fire and forget
    fetch(bgUrl.toString(), { method: 'POST' }).catch(() => {});

    return new Response(
      JSON.stringify({ ok: true, message: 'Scraping démarré en arrière-plan' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response('Méthode non supportée', { status: 405 });
};

export const config = { path: '/.netlify/functions/marmiton-scraper' };
