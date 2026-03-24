import { randomBytes } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STORE = getStore('saved-menus-v1');

function makeId() {
  return randomBytes(5).toString('base64url');
}

function normalizeDayMap(map, allowedKeys) {
  const allowed = new Set(allowedKeys || []);
  const out = {};
  for (const [dayIdx, values] of Object.entries(map || {})) {
    const key = String(parseInt(dayIdx, 10));
    if (key === 'NaN' || !Array.isArray(values)) continue;
    const clean = values.filter((value) => allowed.has(value));
    if (clean.length) out[key] = clean;
  }
  return out;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (req.method === 'GET') {
    if (!id) return json({ error: 'id requis' }, 400);
    try {
      const data = await STORE.get(`menu-${id}`, { type: 'json' });
      if (!data) return json({ error: 'menu introuvable' }, 404);
      if (!data.expiresAt || Date.now() > data.expiresAt) {
        return json({ error: 'menu expiré' }, 410);
      }
      return json(data);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (!body || !Array.isArray(body.menu) || body.menu.length === 0) {
        return json({ error: 'menu invalide' }, 400);
      }

      let newId = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : '';
      if (!newId) {
        newId = makeId();
        for (let i = 0; i < 3; i++) {
          const exists = await STORE.get(`menu-${newId}`, { type: 'json' });
          if (!exists) break;
          newId = makeId();
        }
      }

      const now = Date.now();
      const payload = {
        id: newId,
        createdAt: now,
        expiresAt: now + TTL_MS,
        containsBergamot: !!body.containsBergamot,
        appVersion: 1,
        settings: body.settings || {},
        menu: body.menu,
        dayMoments: normalizeDayMap(body.dayMoments, ['petitdej', 'dejeuner', 'gouter', 'diner']),
        dayStructures: normalizeDayMap(body.dayStructures, ['apero', 'entree', 'plat', 'plat2', 'dessert']),
        daySoireeModes: Object.fromEntries(
          Object.entries(body.daySoireeModes || {}).filter(([dayIdx, mode]) => {
            const key = String(parseInt(dayIdx, 10));
            return key !== 'NaN' && typeof mode === 'string' && mode.trim();
          }).map(([dayIdx, mode]) => [String(parseInt(dayIdx, 10)), mode])
        ),
      };

      await STORE.setJSON(`menu-${newId}`, payload);

      return json({
        ok: true,
        id: newId,
        createdAt: payload.createdAt,
        expiresAt: payload.expiresAt,
      });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: 'méthode non autorisée' }, 405);
};
