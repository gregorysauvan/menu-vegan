import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const url = new URL(req.url);
  const prefix = url.searchParams.get('prefix') || ''; // optionnel : filtrer par préfixe

  const store = getStore('pages-cache');
  const { blobs } = await store.list(prefix ? { prefix } : undefined);

  let deleted = 0;
  for (const blob of blobs) {
    await store.delete(blob.key);
    deleted++;
  }

  return new Response(JSON.stringify({ ok: true, deleted, total: blobs.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/.netlify/functions/clear-cache' };
