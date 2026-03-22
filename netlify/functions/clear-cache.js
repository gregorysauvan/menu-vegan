import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  try {
    const store = getStore('pages-cache');
    let deleted = 0;

    try {
      const result = await store.list();
      const blobs = result?.blobs || [];
      for (const blob of blobs) {
        try { await store.delete(blob.key); deleted++; } catch(e) {}
      }
    } catch(e) {
      return new Response(JSON.stringify({ ok: false, error: 'list failed: ' + String(e) }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: true, deleted }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/.netlify/functions/clear-cache' };
