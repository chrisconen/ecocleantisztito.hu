import { analyze, parseInput, strictJSON, encodeBase64, InputError, ProviderError } from './analysis.mjs';

const HOSTS = new Set(['ecocleantisztito.hu', 'www.ecocleantisztito.hu']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const encoder = new TextEncoder(), DAY = 86400000;
const GENERIC = 'A képfeldolgozás most nem érhető el. Kérjük, próbáld újra később.';
const consent = () => ({ schema_version: 1, granted: true, purposes: ['local_photo_archive', 'human_reference_curation', 'approved_reference_sharing_with_model_provider'] });
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: {
  'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'
} });
const error = (status, message = GENERIC, meta) => json({ error: message, ...(meta ? { _meta: meta } : {}) }, status);
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value)), x => x.toString(16).padStart(2, '0')).join('');
function ready(env) {
  return !!(env.MATERIAL_PHOTOS && env.MATERIAL_QUOTA && env.MATERIAL_SYNC_TOKEN?.length >= 32 && env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY &&
    ((env.MATERIAL_PROVIDER === 'gemini' && env.GEMINI_API_KEY) || (env.MATERIAL_PROVIDER === 'openai' && env.OPENAI_API_KEY)));
}
async function body(request, max = 3 * 1024 * 1024) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) throw new InputError('JSON-kérés szükséges.', 415);
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > max)) throw new InputError('Túl nagy feltöltés.', 413);
  if (!request.body) throw new InputError('Hiányzó kérés.');
  const reader = request.body.getReader(), chunks = []; let size = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) throw new InputError('Túl nagy feltöltés.', 413); chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return strictJSON(new TextDecoder('utf-8', { fatal: true }).decode(bytes), max);
  } finally { try { await reader.cancel(); } catch {} reader.releaseLock(); }
}
async function admin(request, env) {
  if (!env.MATERIAL_SYNC_TOKEN || env.MATERIAL_SYNC_TOKEN.length < 32) return false;
  const authorization = request.headers.get('Authorization') || '';
  if (authorization.length > 256 || !authorization.startsWith('Bearer ')) return false;
  // Fixed-length digest comparison; bearer tokens are never returned or logged.
  const a = await hash(authorization.slice(7)), b = await hash(env.MATERIAL_SYNC_TOKEN);
  let difference = 0; for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i); return difference === 0;
}
async function turnstile(request, env, token) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') || undefined })
    });
    if (response.status !== 200) { await response.body?.cancel(); return false; }
    const value = await body(new Request('https://internal/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: response.body, duplex: 'half' }), 16384);
    return value.success === true && value.hostname === new URL(request.url).hostname && HOSTS.has(value.hostname) && value.action === 'material-analysis';
  } catch { return false; }
}
async function quota(env, operation, data) {
  const stub = env.MATERIAL_QUOTA.get(env.MATERIAL_QUOTA.idFromName('global-v1'));
  return stub.fetch(new Request('https://quota/' + operation, { method: 'POST', body: JSON.stringify(data) }));
}
function recordFor(id, image, provider, sha256) {
  return { schema_version: 1, id, received_utc: new Date().toISOString(), sha256, media: 'image/jpeg',
    provider, model: provider === 'gemini' ? 'gemini-2.5-flash-lite' : 'gpt-5.6-luna', consent: consent(), status: 'pending' };
}
async function material(request, env, owner = false) {
  if (!ready(env)) return error(503);
  const raw = await body(request);
  if (!owner && !(await turnstile(request, env, raw?.turnstile_token))) return error(403, 'A biztonsági ellenőrzést kérjük, ismételd meg.');
  const input = parseInput(raw), requested = input.archive_consent, meta = { archive_requested: requested, archive_saved: false, reference_count: 0 };
  const ip = request.headers.get('CF-Connecting-IP');
  if (!owner && !ip) return error(403);
  const ipHash = await hash(env.MATERIAL_SYNC_TOKEN + ':' + Math.floor(Date.now() / DAY) + ':' + (owner ? 'operator' : ip));
  const reservation = await quota(env, 'reserve', { ip: ipHash });
  if (reservation.status !== 200) return error(429, 'Most sok kérés érkezett. Kérjük, próbáld újra később.', meta);
  const { lease } = await reservation.json();
  let id, record, finalized = false;
  try {
    const refsObject = await env.MATERIAL_PHOTOS.get('references/active.json');
    const references = refsObject ? strictJSON(await refsObject.text(), 7 * 1024 * 1024).references : [];
    if (!Array.isArray(references) || references.length > 4) return error(503, GENERIC, meta);
    meta.reference_count = references.length;
    if (requested) {
      id = crypto.randomUUID(); record = recordFor(id, input.image, env.MATERIAL_PROVIDER, await hash(input.image));
      await env.MATERIAL_PHOTOS.put('photos/' + id + '.jpg', input.image, { httpMetadata: { contentType: 'image/jpeg' } });
    }
    let result = null, providerError = null;
    try { result = await analyze(env, input.image, input.note, references); }
    catch (e) { providerError = e; }
    if (requested) {
      // Only finalized immutable records are discoverable by desktop sync.
      await env.MATERIAL_PHOTOS.put('records/' + id + '.json', JSON.stringify({ record, annotation: result }), {
        httpMetadata: { contentType: 'application/json' },
        customMetadata: { id, sha256: record.sha256, received_utc: record.received_utc,
          provider: record.provider, model: record.model, bytes: String(input.image.length) }
      });
      finalized = true; meta.archive_saved = true;
    }
    if (providerError) return error(providerError instanceof ProviderError ? providerError.status : 502, GENERIC, meta);
    return json({ ...result, _meta: meta });
  } catch { return error(503, GENERIC, meta); }
  finally {
    // Incomplete saves are never advertised. Remove this request's orphan only.
    if (id && !finalized) { try { await env.MATERIAL_PHOTOS.delete('photos/' + id + '.jpg'); } catch {} }
    try { await quota(env, 'release', { lease }); } catch {}
  }
}
async function references(request, env) {
  const value = await body(request, 7 * 1024 * 1024);
  if (!value || Object.keys(value).join() !== 'references' || !Array.isArray(value.references) || value.references.length > 4) throw new InputError();
  const refs = [], ids = new Set(); let total = 0;
  for (const ref of value.references) {
    if (!ref || Object.keys(ref).sort().join(',') !== 'b64,brand,id,label,material,media' || !UUID.test(ref.id) || ids.has(ref.id) || ref.media !== 'image/jpeg') throw new InputError();
    ids.add(ref.id);
    for (const [name, max] of [['label', 300], ['brand', 200], ['material', 300]]) {
      if (typeof ref[name] !== 'string' || !ref[name].trim() || ref[name].length > max || /[\x00-\x1f\x7f]/.test(ref[name])) throw new InputError();
    }
    total += typeof ref.b64 === 'string' ? ref.b64.length : Infinity; if (total > 6 * 1024 * 1024) throw new InputError();
    const input = parseInput({ image: 'data:image/jpeg;base64,' + ref.b64, media_type: 'image/jpeg', note: '', archive_consent: false });
    refs.push({ ...ref, b64: encodeBase64(input.image) });
  }
  await env.MATERIAL_PHOTOS.put('references/active.json', JSON.stringify({ references: refs, published_utc: new Date().toISOString() }), { httpMetadata: { contentType: 'application/json' } });
  return json({ ok: true, count: refs.length });
}
// Email review is a separate customer request. It never invokes a vision provider
// or grants permission to reuse the photo as a reference.
async function review(request, env, owner = false) {
  if (!env.MATERIAL_PHOTOS || !env.MATERIAL_QUOTA || !env.MATERIAL_SYNC_TOKEN || !env.TURNSTILE_SECRET_KEY) return error(503);
  const raw = await body(request);
  if (!owner && !(await turnstile(request, env, raw?.turnstile_token))) return error(403, 'Ismételd meg a biztonsági ellenőrzést.');
  const allowed = ['image', 'media_type', 'note', 'email', 'review_consent', 'turnstile_token', 'analysis_summary'];
  if (!raw || Object.keys(raw).some(k => !allowed.includes(k)) || raw.review_consent !== true) throw new InputError('Az e-mailes ellenőrzéshez fogadd el a fotó és az e-mail-cím megőrzését.');
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  if (email.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(email)) throw new InputError('Adj meg egy érvényes e-mail-címet.');
  const input = parseInput({ image: raw.image, media_type: raw.media_type, note: raw.note || '', archive_consent: false });
  let summary = null;
  if (raw.analysis_summary != null) {
    const s = raw.analysis_summary;
    if (!s || typeof s !== 'object' || Array.isArray(s) || Object.keys(s).sort().join(',') !== 'material,status' || typeof s.material !== 'string' || s.material.length > 150 || !['likely_other', 'possible_novalife', 'label_novalife', 'uncertain'].includes(s.status)) throw new InputError('Az előzetes eredmény formátuma hibás.');
    summary = { material: s.material, status: s.status, source: 'unverified_client_summary', human_verified: false };
  }
  const ip = request.headers.get('CF-Connecting-IP'); if (!owner && !ip) return error(403);
  const reservation = await quota(env, 'reserve', { ip: await hash(env.MATERIAL_SYNC_TOKEN + ':' + Math.floor(Date.now() / DAY) + ':' + (owner ? 'operator' : ip)) });
  if (reservation.status !== 200) return error(429, 'Most sok kérés érkezett. Próbáld újra később.');
  const { lease } = await reservation.json(), id = crypto.randomUUID(); let finalized = false;
  try {
    const record = { schema_version: 1, id, received_utc: new Date().toISOString(), email, note: input.note, sha256: await hash(input.image),
      consent: { purpose: 'email_material_review', granted: true, schema_version: 1 }, status: 'pending', analysis_summary: summary };
    await env.MATERIAL_PHOTOS.put('reviews/photos/' + id + '.jpg', input.image, { httpMetadata: { contentType: 'image/jpeg' } });
    await env.MATERIAL_PHOTOS.put('reviews/records/' + id + '.json', JSON.stringify(record), { httpMetadata: { contentType: 'application/json' }, customMetadata: { id, received_utc: record.received_utc, sha256: record.sha256 } });
    finalized = true;
    return json({ review_saved: true, review_id: id, message: 'Megkaptuk a fotódat és az e-mail-címedet. A csapatunk ellenőrzi a képet, majd e-mailben válaszol.' });
  } catch { return error(503, 'Az ellenőrzési kérést most nem sikerült menteni. Próbáld újra; még nem igazoltuk vissza az átvételt.'); }
  finally {
    if (!finalized) { try { await env.MATERIAL_PHOTOS.delete('reviews/photos/' + id + '.jpg'); } catch {} }
    try { await quota(env, 'release', { lease }); } catch {}
  }
}
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url), path = url.pathname;
      if (url.protocol !== 'https:' || !HOSTS.has(url.hostname)) return error(403);
      if (path === '/api/material-health' && request.method === 'GET') return json({ enabled: true, ready: ready(env), review_enabled: !!(env.MATERIAL_PHOTOS && env.MATERIAL_QUOTA && env.MATERIAL_SYNC_TOKEN && env.TURNSTILE_SECRET_KEY), collection_enabled: !!env.MATERIAL_PHOTOS, turnstile_site_key: env.TURNSTILE_SITE_KEY || '' });
      if (path.startsWith('/api/material-admin/')) {
        if (!(await admin(request, env))) return error(401);
        if (path === '/api/material-admin/analyze' && request.method === 'POST') return await material(request, env, true);
        if (path === '/api/material-admin/review' && request.method === 'POST') return await review(request, env, true);
        if (path === '/api/material-admin/reviews' && request.method === 'GET') {
          const cursor = url.searchParams.get('cursor'); if (cursor && cursor.length > 2048) throw new InputError();
          const page = await env.MATERIAL_PHOTOS.list({ prefix: 'reviews/records/', limit: 100, include: ['customMetadata'], ...(cursor ? { cursor } : {}) });
          return json({ items: page.objects.map(o => o.customMetadata), cursor: page.truncated ? page.cursor : null });
        }
        const reviewMatch = /^\/api\/material-admin\/reviews\/([^/]+)$/.exec(path);
        if (reviewMatch && UUID.test(reviewMatch[1])) {
          const id = reviewMatch[1];
          if (request.method === 'GET') {
            const item = await env.MATERIAL_PHOTOS.get('reviews/records/' + id + '.json'); if (!item) return error(404);
            const photo = await env.MATERIAL_PHOTOS.get('reviews/photos/' + id + '.jpg'); if (!photo) return error(503);
            return json({ record: strictJSON(await item.text()), image: encodeBase64(new Uint8Array(await photo.arrayBuffer())) });
          }
          if (request.method === 'DELETE') {
            await env.MATERIAL_PHOTOS.delete('reviews/records/' + id + '.json');
            await env.MATERIAL_PHOTOS.delete('reviews/photos/' + id + '.jpg');
            return json({ deleted: true });
          }
        }
        if (path === '/api/material-admin/references' && request.method === 'POST') return await references(request, env);
        if (path === '/api/material-admin/manifest' && request.method === 'GET') {
          const cursor = url.searchParams.get('cursor'); if (cursor && cursor.length > 2048) throw new InputError();
          const page = await env.MATERIAL_PHOTOS.list({ prefix: 'records/', limit: 100, include: ['customMetadata'], ...(cursor ? { cursor } : {}) });
          return json({ items: page.objects.map(o => ({ ...o.customMetadata, bytes: Number(o.customMetadata.bytes) })), cursor: page.truncated ? page.cursor : null });
        }
        const match = /^\/api\/material-admin\/items\/([^/]+)$/.exec(path);
        if (match && request.method === 'GET' && UUID.test(match[1])) {
          const stored = await env.MATERIAL_PHOTOS.get('records/' + match[1] + '.json'); if (!stored) return error(404);
          const item = strictJSON(await stored.text());
          const photo = await env.MATERIAL_PHOTOS.get('photos/' + match[1] + '.jpg'); if (!photo) return error(503);
          return json({ ...item, image: encodeBase64(new Uint8Array(await photo.arrayBuffer())) });
        }
        return error(404);
      }
      if (['/api/material-analyze', '/api/material-review'].includes(path) && request.method === 'POST') {
        if (request.headers.get('Origin') !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return error(403);
        return path === '/api/material-review' ? await review(request, env) : await material(request, env);
      }
      return error(404);
    } catch (e) { return error(e instanceof InputError ? e.status : 503, e instanceof InputError ? e.message : GENERIC); }
  }
};

/** One durable, transactional quota record. Counters survive deploys/restarts.
 * IPs are daily salted hashes; no raw IPs/photos/notes are stored here.
 * Count attempts, not successes, to cap costs even if the provider fails.
 */
export class MaterialQuota {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const data = await request.json(), operation = new URL(request.url).pathname;
    const now = Date.now(), day = Math.floor(now / DAY), hour = Math.floor(now / 3600000);
    const response = await this.state.storage.transaction(async storage => {
      let q = await storage.get('quota') || { day, count: 0, ips: {}, leases: {} };
      q.leases = Object.fromEntries(Object.entries(q.leases).filter(([, until]) => until > now));
      if (q.day !== day) { q.day = day; q.count = 0; q.ips = {}; }
      if (operation === '/release') { delete q.leases[data.lease]; await storage.put('quota', q); return json({ ok: true }); }
      if (operation !== '/reserve' || !/^[0-9a-f]{64}$/.test(data.ip)) return error(400);
      const ip = q.ips[data.ip]?.hour === hour ? q.ips[data.ip] : { hour, count: 0 };
      if (q.count >= 200 || ip.count >= 10 || Object.keys(q.leases).length >= 4) return error(429);
      const lease = crypto.randomUUID(); q.count++; ip.count++; q.ips[data.ip] = ip; q.leases[lease] = now + 120000;
      await storage.put('quota', q); return json({ lease });
    });
    await this.state.storage.setAlarm((day + 1) * DAY + 120001);
    return response;
  }
  async alarm() {
    const q = await this.state.storage.get('quota');
    if (q && q.day < Math.floor(Date.now() / DAY)) await this.state.storage.deleteAll();
    else if (q) await this.state.storage.setAlarm((q.day + 1) * DAY + 120001);
  }
}
