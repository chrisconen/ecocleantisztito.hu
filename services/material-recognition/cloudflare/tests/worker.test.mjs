/** Actual Worker/DO methods with isolated in-memory bindings; never calls a live API. */
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { MaterialQuota } from '../src/worker.mjs';
import { validateImage, encodeBase64 } from '../src/analysis.mjs';

class MemoryR2 {
  constructor() { this.objects = new Map(); this.calls = []; this.fail = new Set(); }
  async put(key, data, options = {}) {
    this.calls.push(['put', key]); if (this.fail.has('put')) throw Error('private R2 failure');
    const existing = this.objects.get(key);
    if (options.onlyIf?.etagDoesNotMatch === '*' && existing) return null;
    const value = data instanceof ArrayBuffer ? new Uint8Array(data) : data instanceof Uint8Array ? data.slice() : new Uint8Array(await new Response(data).arrayBuffer());
    const record = { key, value, customMetadata: options.customMetadata || {}, httpMetadata: options.httpMetadata || {}, etag: 'fixture-etag-' + this.calls.length, uploaded: new Date() };
    this.objects.set(key, record); return this.result(record);
  }
  result(record) {
    if (!record) return null;
    const data = record.value.slice();
    return { key: record.key, size: data.length, uploaded: record.uploaded, etag: record.etag, httpEtag: '"' + record.etag + '"', customMetadata: record.customMetadata, httpMetadata: record.httpMetadata,
      body: new Response(data).body, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), text: async () => new TextDecoder().decode(data), json: async () => JSON.parse(new TextDecoder().decode(data)), writeHttpMetadata: headers => { if (record.httpMetadata.contentType) headers.set('Content-Type', record.httpMetadata.contentType); } };
  }
  async get(key) { this.calls.push(['get', key]); if (this.fail.has('get')) throw Error('private R2 failure'); return this.result(this.objects.get(key)); }
  async head(key) { this.calls.push(['head', key]); if (this.fail.has('head')) throw Error('private R2 failure'); return this.result(this.objects.get(key)); }
  async delete(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) { this.calls.push(['delete', key]); this.objects.delete(key); } }
  async list({ prefix = '', limit = 1000, cursor = '' } = {}) {
    this.calls.push(['list', prefix]); if (this.fail.has('list')) throw Error('private R2 failure');
    const all = [...this.objects.values()].filter(x => x.key.startsWith(prefix) && x.key > cursor).sort((a, b) => a.key.localeCompare(b.key));
    const objects = all.slice(0, limit).map(x => this.result(x));
    return { objects, truncated: all.length > limit, cursor: objects.at(-1)?.key || '', delimitedPrefixes: [] };
  }
}

class MemoryStorage {
  constructor() { this.values = new Map(); this.alarm = null; }
  async get(key) { return Array.isArray(key) ? new Map(key.filter(k => this.values.has(k)).map(k => [k, structuredClone(this.values.get(k))])) : structuredClone(this.values.get(key)); }
  async put(key, value) { if (typeof key === 'object') for (const [k, v] of Object.entries(key)) this.values.set(k, structuredClone(v)); else this.values.set(key, structuredClone(value)); }
  async delete(keys) { let count = 0; for (const key of Array.isArray(keys) ? keys : [keys]) count += Number(this.values.delete(key)); return count; }
  async list({ prefix = '', limit = Infinity } = {}) { return new Map([...this.values].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).slice(0, limit).map(([k, v]) => [k, structuredClone(v)])); }
  async transaction(fn) { const previous = this.pending || Promise.resolve(); let release; this.pending = new Promise(resolve => { release = resolve; }); await previous; try { return await fn(this); } finally { release(); } }
  async deleteAll() { this.values.clear(); }
  async setAlarm(time) { this.alarm = +time; }
  async getAlarm() { return this.alarm; }
  async deleteAlarm() { this.alarm = null; }
}

const ORIGIN = 'https://ecocleantisztito.hu', TOKEN = 'fixture-owner-token-never-live-0000000000000';
const UUID = '11111111-2222-4333-8444-555555555555';
const JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/aAAwDAQACEAMQAAABpEz/AP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//aAAwDAQACAAMAAAAQB//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Qf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Qf//Z';
const upload = extra => ({ image: 'data:image/jpeg;base64,' + JPEG, media_type: 'image/jpeg', note: 'private customer note', archive_consent: false, turnstile_token: 'fixture-turnstile', ...extra });
const result = extra => ({ kep_tipus: 'anyag', anyag: 'bouclé', anyag_alt: 'Hurkolt felület.', biztonsag: 83, indoklas: 'A hurkolt szerkezet látható.', tisztitasi_kod: 'W', cimke_szoveg: '', modszer: 'unused', kerulendo: [], kockazatok: [], ellenorzes: 'Címkeellenőrzés szükséges.', kerdes_ugyfelnek: 'Megvan a címke?', ...extra });
const geminiResult = (value = result()) => ({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(value) }] } }] });
function bindings() {
  const storage = new MemoryStorage(), durable = new MaterialQuota({ storage }), bucket = new MemoryR2(), calls = [];
  return { storage, durable, bucket, calls, env: { MATERIAL_PROVIDER: 'gemini', MATERIAL_PHOTOS: bucket, MATERIAL_QUOTA: { idFromName: name => name, get: id => { assert.equal(id, 'global-v1'); return { fetch: request => { calls.push(new URL(request.url).pathname); return durable.fetch(request); } }; } }, MATERIAL_SYNC_TOKEN: TOKEN, GEMINI_API_KEY: 'fixture-gemini-key', OPENAI_API_KEY: 'fixture-openai-key', TURNSTILE_SITE_KEY: 'fixture-public-site', TURNSTILE_SECRET_KEY: 'fixture-private-secret' } };
}
function network(t, { verification = {}, providerStatus = 200, providerBody } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push([url, options]);
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') return Response.json({ success: true, hostname: 'ecocleantisztito.hu', action: 'material-analysis', ...verification });
    assert.ok(url === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent' || url === 'https://api.openai.com/v1/responses', 'Every network call must be mocked and explicitly allowed');
    return Response.json(providerBody || geminiResult(), { status: providerStatus });
  });
  return { calls, provider: () => calls.filter(([url]) => !url.includes('siteverify')), challenge: () => calls.filter(([url]) => url.includes('siteverify')) };
}
function request(path = '/api/material-analyze', data = upload(), extraHeaders = {}, method = 'POST', origin = ORIGIN) {
  return new Request(origin + path, { method, headers: { ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}), Origin: origin, 'CF-Connecting-IP': '203.0.113.45', ...extraHeaders }, ...(method === 'POST' ? { body: typeof data === 'string' ? data : JSON.stringify(data) } : {}) });
}
const ownerRequest = (path, data, method = 'GET', token = TOKEN) => request('/api/material-admin/' + path, data, { Authorization: 'Bearer ' + token }, method);
const qrequest = (operation, data) => new Request('https://quota/' + operation, { method: 'POST', body: JSON.stringify(data) });
const hashIP = n => n.toString(16).padStart(64, '0');
async function reserve(durable, ip = hashIP(1)) { const response = await durable.fetch(qrequest('reserve', { ip })); return { status: response.status, ...await response.json() }; }
async function release(durable, lease) { return durable.fetch(qrequest('release', { lease })); }

test('health is generic public configuration, without provider/key/model or private R2 access', async () => {
  const { env, bucket } = bindings();
  const response = await worker.fetch(request('/api/material-health', null, {}, 'GET'), env), text = await response.text(), value = JSON.parse(text);
  assert.equal(response.status, 200); assert.equal(value.ready, true); assert.equal(value.turnstile_site_key, 'fixture-public-site');
  assert.doesNotMatch(text, /gemini|openai|model|fixture-gemini|fixture-private|fixture-owner/i); assert.equal(bucket.calls.length, 0);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const unavailable = await worker.fetch(request('/api/material-health', null, {}, 'GET'), { ...env, GEMINI_API_KEY: '' }); assert.equal((await unavailable.json()).ready, false);
});
test('unknown host/protocol, foreign/missing Origin and cross-site requests cannot start processing', async t => {
  const net = network(t), { env, bucket, calls } = bindings();
  const inputs = [request(undefined, undefined, {}, 'POST', 'https://evil.example'), request(undefined, undefined, {}, 'POST', 'http://ecocleantisztito.hu'), request(undefined, undefined, { Origin: 'https://evil.example' }), request(undefined, undefined, { Origin: '' }), request(undefined, undefined, { 'Sec-Fetch-Site': 'cross-site' })];
  for (const req of inputs) assert.equal((await worker.fetch(req, env)).status, 403);
  assert.equal(net.calls.length, 0); assert.equal(bucket.calls.length, 0); assert.equal(calls.length, 0);
});
test('every private admin route requires the exact long bearer token', async t => {
  const net = network(t), { env, bucket } = bindings();
  for (const [path, method] of [['manifest', 'GET'], ['items/' + UUID, 'GET'], ['references', 'POST'], ['analyze', 'POST']]) {
    for (const token of ['', TOKEN.slice(1), 'x'.repeat(300)]) assert.equal((await worker.fetch(ownerRequest(path, {}, method, token), env)).status, 401);
  }
  assert.equal(bucket.calls.length, 0); assert.equal(net.calls.length, 0);
  const authorized = await worker.fetch(ownerRequest('manifest'), env); assert.equal(authorized.status, 200); assert.deepEqual((await authorized.json()).items, []);
  assert.equal((await worker.fetch(ownerRequest('manifest'), { ...env, MATERIAL_SYNC_TOKEN: 'short' })).status, 401);
});
test('Turnstile validates hostname/action/success and missing token before provider or R2', async t => {
  const { env, bucket } = bindings(); let verification = { success: false };
  const call = t.mock.method(globalThis, 'fetch', async url => { assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify'); return Response.json(verification); });
  for (const value of [{ success: false }, { success: true, hostname: 'evil.example', action: 'material-analysis' }, { success: true, hostname: 'ecocleantisztito.hu', action: 'other' }, { success: true, hostname: 'www.ecocleantisztito.hu', action: 'material-analysis' }]) { verification = value; assert.equal((await worker.fetch(request(), env)).status, 403); }
  assert.equal((await worker.fetch(request(undefined, upload({ turnstile_token: '' })), env)).status, 403); assert.equal(call.mock.callCount(), 4); assert.equal(bucket.calls.length, 0);
});
test('client provider override and malformed body never reserve quota or call provider', async t => {
  const net = network(t), { env, bucket, calls } = bindings();
  for (const extra of [{ provider: 'openai' }, { provider: 'gemini' }, { model: 'other' }, { archive_consent: 'true' }, { note: 'x'.repeat(1001) }]) assert.equal((await worker.fetch(request(undefined, upload(extra)), env)).status, 400);
  assert.equal((await worker.fetch(request(undefined, '{"a":1,"a":2}'), env)).status, 400);
  assert.equal((await worker.fetch(request(undefined, upload(), { 'Content-Type': 'text/plain' }), env)).status, 415);
  assert.equal((await worker.fetch(request(undefined, upload(), { 'Content-Length': String(3 * 1024 * 1024 + 1) }), env)).status, 413);
  assert.equal(net.provider().length, 0); assert.equal(bucket.calls.length, 0); assert.equal(calls.length, 0);
});
test('consentless success does not write R2; sanitized result and quota release', async t => {
  const net = network(t), { env, bucket, storage, calls } = bindings();
  const response = await worker.fetch(request(), env), data = await response.json();
  assert.equal(response.status, 200); assert.equal(data.anyag, 'bouclé'); assert.equal(data.tisztitasi_kod, 'ismeretlen');
  assert.deepEqual(data._meta, { archive_requested: false, archive_saved: false, reference_count: 0 }); assert.equal(Object.keys(data).length, 13); assert.equal(data.novalife.status, 'uncertain');
  assert.deepEqual(bucket.calls, [['get', 'references/active.json']]); assert.equal(bucket.objects.size, 0);
  assert.equal(net.provider().length, 1); assert.equal(net.challenge().length, 1); assert.deepEqual(calls, ['/reserve', '/release']);
  const quota = await storage.get('quota'); assert.equal(quota.count, 1); assert.equal(Object.keys(quota.leases).length, 0);
  assert.doesNotMatch(JSON.stringify(quota), /203\.0\.113|private customer note|fixture-owner/);
});
test('consented success archives normalized photo and finalized record before manifest discovery', async t => {
  const net = network(t), { env, bucket } = bindings();
  const response = await worker.fetch(request(undefined, upload({ archive_consent: true })), env), data = await response.json();
  assert.equal(response.status, 200); assert.equal(data._meta.archive_saved, true); assert.equal(net.provider().length, 1);
  const recordKey = [...bucket.objects.keys()].find(k => k.startsWith('records/')), photoKey = [...bucket.objects.keys()].find(k => k.startsWith('photos/'));
  assert.ok(recordKey); assert.ok(photoKey); const record = await (await bucket.get(recordKey)).json();
  assert.equal(record.annotation.anyag, 'bouclé'); assert.equal(record.record.consent.granted, true); assert.equal(record.record.media, 'image/jpeg');
  assert.doesNotMatch(JSON.stringify(record), /private customer note|203\.0\.113|fixture-gemini-key/);
  assert.deepEqual(new Uint8Array(await (await bucket.get(photoKey)).arrayBuffer()), validateImage(Uint8Array.from(Buffer.from(JPEG, 'base64'))));
  const manifest = await (await worker.fetch(ownerRequest('manifest'), env)).json(); assert.equal(manifest.items.length, 1);
  const item = await worker.fetch(ownerRequest('items/' + record.record.id), env); assert.equal(item.status, 200); const downloaded = await item.json();
  assert.equal(downloaded.image, encodeBase64(validateImage(Uint8Array.from(Buffer.from(JPEG, 'base64'))))); assert.equal(downloaded.record.id, record.record.id);
});
test('NovaLife uncertain screening survives route, R2 finalization and authenticated desktop download', async t => {
  const net = network(t, { providerBody: geminiResult(result({ anyag: 'mikroszálas/velúr (alcantara-jellegű)', novalife_status: 'likely_other', novalife_reason: 'Gemini: biztosan nem NovaLife, tisztítható.', novalife_label_text: '' })) }), { env, bucket } = bindings();
  const response = await worker.fetch(request(undefined, upload({ archive_consent: true })), env), actual = await response.json();
  assert.equal(response.status, 200); assert.equal(actual.novalife.status, 'uncertain'); assert.equal(net.provider().length, 1);
  const recordKey = [...bucket.objects.keys()].find(k => k.startsWith('records/')), stored = await (await bucket.get(recordKey)).json();
  assert.deepEqual(stored.annotation.novalife, actual.novalife);
  const item = await (await worker.fetch(ownerRequest('items/' + stored.record.id), env)).json(); assert.deepEqual(item.annotation.novalife, actual.novalife);
  assert.doesNotMatch(JSON.stringify(actual), /Gemini|biztosan nem/);
});
test('provider failure finalizes consented photo with null annotation and truthful saved flag, without fallback', async t => {
  const net = network(t, { providerStatus: 429 }), { env, bucket, storage } = bindings();
  const response = await worker.fetch(request(undefined, upload({ archive_consent: true })), env), data = await response.json();
  assert.equal(response.status, 502); assert.equal(data._meta.archive_saved, true); assert.equal(net.provider().length, 1);
  const recordKey = [...bucket.objects.keys()].find(k => k.startsWith('records/')), record = await (await bucket.get(recordKey)).json(); assert.equal(record.annotation, null);
  assert.equal((await storage.get('quota')).count, 1); assert.equal(Object.keys((await storage.get('quota')).leases).length, 0);
});
test('R2 failures before provider fail closed and incomplete archive records never become discoverable', async t => {
  const net = network(t);
  for (const failure of ['get', 'put']) {
    const { env, bucket, storage } = bindings(); bucket.fail.add(failure);
    const response = await worker.fetch(request(undefined, upload({ archive_consent: true })), env), data = await response.json();
    assert.equal(response.status, 503); assert.equal(data._meta.archive_saved, false); assert.equal(bucket.objects.size, 0);
    assert.doesNotMatch(JSON.stringify(data), /private R2/); assert.equal(Object.keys((await storage.get('quota')).leases).length, 0);
  }
  assert.equal(net.provider().length, 0);
});
test('record-finalization failure removes this request photo after provider and releases lease', async t => {
  const net = network(t), { env, bucket, storage } = bindings(), originalPut = bucket.put.bind(bucket);
  bucket.put = async (key, ...args) => { if (key.startsWith('records/')) throw Error('private record failure'); return originalPut(key, ...args); };
  const response = await worker.fetch(request(undefined, upload({ archive_consent: true })), env), data = await response.json();
  assert.equal(response.status, 503); assert.equal(data._meta.archive_saved, false); assert.equal(net.provider().length, 1);
  assert.equal(bucket.objects.size, 0); assert.ok(bucket.calls.some(([operation]) => operation === 'delete')); assert.equal(Object.keys((await storage.get('quota')).leases).length, 0);
});
test('admin analysis bypasses only challenge, retaining provider validation, quota and consent', async t => {
  const net = network(t), { env, bucket, storage } = bindings();
  const data = upload(); delete data.turnstile_token;
  const response = await worker.fetch(ownerRequest('analyze', data, 'POST'), env); assert.equal(response.status, 200);
  assert.equal(net.challenge().length, 0); assert.equal(net.provider().length, 1); assert.equal(bucket.objects.size, 0); assert.equal((await storage.get('quota')).count, 1);
  assert.equal((await worker.fetch(ownerRequest('analyze', { ...data, provider: 'openai' }, 'POST'), env)).status, 400);
  assert.equal(net.provider().length, 1);
});
test('admin publishes only valid reviewed-reference contract; analysis receives active references separately', async t => {
  const net = network(t), { env, bucket } = bindings();
  const ref = { id: UUID, brand: 'Andante', material: 'bouclé', label: 'Reviewed fixture', b64: JPEG, media: 'image/jpeg' };
  for (const refs of [[{ ...ref, id: '../bad' }], [ref, ref], [{ ...ref, media: 'image/png' }]]) assert.equal((await worker.fetch(ownerRequest('references', { references: refs }, 'POST'), env)).status, 400);
  assert.equal(bucket.objects.size, 0);
  const publish = await worker.fetch(ownerRequest('references', { references: [ref] }, 'POST'), env); assert.equal(publish.status, 200);
  const response = await worker.fetch(request(), env), data = await response.json(); assert.equal(response.status, 200); assert.equal(data._meta.reference_count, 1);
  const payload = JSON.parse(net.provider()[0][1].body); assert.match(payload.contents[0].parts[3].text, /REFERENCIA/); assert.match(payload.contents[0].parts[3].text, /Andante/);
  assert.equal(data.tisztitasi_kod, 'ismeretlen');
});
test('quota: ten per IP, four inflight, leases released and counters survive new DO instances', async () => {
  const storage = new MemoryStorage(); let durable = new MaterialQuota({ storage });
  const active = await Promise.all([1, 2, 3, 4].map(n => reserve(durable, hashIP(n)))); assert.deepEqual(active.map(x => x.status), [200, 200, 200, 200]);
  assert.equal((await reserve(durable, hashIP(5))).status, 429);
  durable = new MaterialQuota({ storage }); assert.equal((await reserve(durable, hashIP(5))).status, 429);
  await release(durable, active[0].lease); const fifth = await reserve(durable, hashIP(5)); assert.equal(fifth.status, 200);
  for (const lease of [...active.slice(1), fifth]) await release(durable, lease.lease);
  for (let i = 0; i < 9; i++) { const next = await reserve(durable, hashIP(1)); assert.equal(next.status, 200); await release(durable, next.lease); }
  assert.equal((await reserve(new MaterialQuota({ storage }), hashIP(1))).status, 429);
  assert.equal((await storage.get('quota')).count, 14);
});
test('quota: daily 200 attempts persists across restart, bounded IP map and next-day reset', async t => {
  let now = Date.UTC(2026, 8, 9, 12); t.mock.method(Date, 'now', () => now);
  const storage = new MemoryStorage(); let durable = new MaterialQuota({ storage });
  for (let i = 1; i <= 200; i++) { const reserved = await reserve(durable, hashIP(i)); assert.equal(reserved.status, 200); await release(durable, reserved.lease); }
  durable = new MaterialQuota({ storage }); assert.equal((await reserve(durable, hashIP(201))).status, 429); assert.equal(Object.keys((await storage.get('quota')).ips).length, 200);
  now += 86400000; const next = await reserve(durable, hashIP(201)); assert.equal(next.status, 200); assert.equal((await storage.get('quota')).count, 1); assert.equal(Object.keys((await storage.get('quota')).ips).length, 1);
});
test('quota: lease expiry and UTC hour rollover restore admission without resetting daily count', async t => {
  let now = Date.UTC(2026, 8, 9, 12); t.mock.method(Date, 'now', () => now);
  const storage = new MemoryStorage(), durable = new MaterialQuota({ storage });
  for (let i = 0; i < 4; i++) assert.equal((await reserve(durable, hashIP(1))).status, 200);
  assert.equal((await reserve(durable, hashIP(2))).status, 429); now += 120001;
  const expired = await reserve(new MaterialQuota({ storage }), hashIP(2)); assert.equal(expired.status, 200); assert.equal((await storage.get('quota')).count, 5); await release(durable, expired.lease);
  for (let i = 0; i < 6; i++) { const r = await reserve(durable, hashIP(1)); assert.equal(r.status, 200); await release(durable, r.lease); }
  assert.equal((await reserve(durable, hashIP(1))).status, 429); now += 3600000;
  assert.equal((await reserve(durable, hashIP(1))).status, 200); assert.equal((await storage.get('quota')).count, 12);
});
test('quota reject through public route prevents paid call and R2 writes', async t => {
  const net = network(t), { env, bucket, durable } = bindings();
  for (let i = 0; i < 4; i++) assert.equal((await reserve(durable, hashIP(i))).status, 200);
  const response = await worker.fetch(request(undefined, upload({ archive_consent: true })), env), data = await response.json();
  assert.equal(response.status, 429); assert.equal(data._meta.archive_saved, false); assert.equal(net.provider().length, 0); assert.equal(bucket.calls.length, 0);
});
test('quota rejects malformed operation/IP; alarm cleans old counters after day rollover', async t => {
  let now = Date.UTC(2026, 8, 9, 12); t.mock.method(Date, 'now', () => now);
  const storage = new MemoryStorage(), durable = new MaterialQuota({ storage });
  assert.equal((await durable.fetch(qrequest('reserve', { ip: '203.0.113.1' }))).status, 400); assert.equal((await durable.fetch(qrequest('other', { ip: hashIP(1) }))).status, 400);
  await reserve(durable); assert.ok(await storage.get('quota')); now += 86400000; await new MaterialQuota({ storage }).alarm(); assert.equal(await storage.get('quota'), undefined);
});
