const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { generateKeyPair, silentLogger, listen, call, signTestAccessToken } = require('../../../libs/common/src/testing');
const { createApp } = require('../src/app');
const { createRateLimiter } = require('../src/rateLimit');
const { createBreaker } = require('../src/breaker');

let keys, token, upstream, upstreamUrl, seen;

before(async () => {
  keys = generateKeyPair();
  token = signTestAccessToken(keys.privateKey, 1);
  seen = [];
  // servicio falso: /slow tarda, /boom da 500, lo demás responde eco
  upstream = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, headers: req.headers, body: raw });
      if (req.url.startsWith('/tasks/slow')) return setTimeout(() => res.end('{}'), 500);
      if (req.url.startsWith('/tasks/boom')) { res.statusCode = 500; return res.end('{"error":"detalle interno secreto"}'); }
      if (req.url.startsWith('/tasks/missing')) { res.statusCode = 404; res.setHeader('content-type', 'application/json'); return res.end('{"error":"no existe"}'); }
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
  upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
});

after(() => {
  upstream.close();
  upstream.closeAllConnections(); // fetch mantiene conexiones abiertas
});

async function gateway(opts = {}) {
  const targets = Object.fromEntries(['auth', 'task', 'journal', 'achievement', 'focus'].map((s) => [s, upstreamUrl]));
  const app = createApp({ logger: silentLogger(), publicKey: keys.publicKey, targets, ...opts });
  const { server, url } = await listen(app);
  return { url, close: () => { server.close(); server.closeAllConnections(); app.stop(); } };
}

test('rutas protegidas piden token válido; el refresh token no vale', async () => {
  const gw = await gateway();
  assert.equal((await call(`${gw.url}/tasks`)).status, 401);
  assert.equal((await call(`${gw.url}/tasks`, { token: 'basura' })).status, 401);
  const refreshLike = signTestAccessToken(keys.privateKey, 1, { claims: { token_use: 'refresh' }, options: { audience: 'dopamind-auth' } });
  assert.equal((await call(`${gw.url}/tasks`, { token: refreshLike })).status, 401);
  assert.equal((await call(`${gw.url}/tasks`, { token })).status, 200);
  gw.close();
});

test('login/registro/refresh/logout son públicos; /auth/me no', async () => {
  const gw = await gateway();
  for (const p of ['register', 'login', 'refresh', 'logout']) {
    assert.equal((await call(`${gw.url}/auth/${p}`, { method: 'POST', body: {} })).status, 200, p);
  }
  assert.equal((await call(`${gw.url}/auth/me`)).status, 401);
  gw.close();
});

test('reenvía método, query, cuerpo y token; agrega x-request-id', async () => {
  const gw = await gateway();
  seen.length = 0;
  await call(`${gw.url}/tasks?completed=true`, { method: 'POST', token, body: { title: 'x' } });
  const hit = seen.at(-1);
  assert.equal(hit.url, '/tasks?completed=true');
  assert.equal(hit.body, '{"title":"x"}');
  assert.equal(hit.headers.authorization, `Bearer ${token}`);
  assert.ok(hit.headers['x-request-id']);
  gw.close();
});

test('respeta un x-request-id válido y reemplaza uno malicioso', async () => {
  const gw = await gateway();
  seen.length = 0;
  await call(`${gw.url}/tasks`, { token, headers: { 'x-request-id': 'abc-12345678' } });
  assert.equal(seen.at(-1).headers['x-request-id'], 'abc-12345678');
  await call(`${gw.url}/tasks`, { token, headers: { 'x-request-id': 'id malo con espacios!' } });
  assert.notEqual(seen.at(-1).headers['x-request-id'], 'id malo con espacios!');
  gw.close();
});

test('no reenvía cabeceras que el cliente invente', async () => {
  const gw = await gateway();
  seen.length = 0;
  await call(`${gw.url}/tasks`, { token, headers: { 'x-user-id': '999', 'x-forwarded-for': '6.6.6.6' } });
  assert.equal(seen.at(-1).headers['x-user-id'], undefined);
  assert.equal(seen.at(-1).headers['x-forwarded-for'], undefined);
  gw.close();
});

test('devuelve el estado y cuerpo del servicio tal cual (404 con json)', async () => {
  const gw = await gateway();
  const res = await call(`${gw.url}/tasks/missing`, { token });
  assert.equal(res.status, 404);
  assert.deepEqual(res.json, { error: 'no existe' });
  gw.close();
});

test('timeout da 504 y no filtra detalles', async () => {
  const gw = await gateway({ upstreamTimeoutMs: 100 });
  const res = await call(`${gw.url}/tasks/slow`, { token });
  assert.equal(res.status, 504);
  assert.deepEqual(Object.keys(res.json), ['error']);
  gw.close();
});

test('servicio caído da 502 sin detalles internos', async () => {
  const gw = await gateway({ targets: Object.fromEntries(['auth', 'task', 'journal', 'achievement', 'focus'].map((s) => [s, 'http://127.0.0.1:1'])) });
  const res = await call(`${gw.url}/tasks`, { token });
  assert.equal(res.status, 502);
  assert.deepEqual(Object.keys(res.json), ['error']);
  assert.ok(!JSON.stringify(res.json).includes('ECONNREFUSED'));
  gw.close();
});

test('circuit breaker: tras varios 500 corta con 503 sin llamar al servicio, y se recupera', async () => {
  let t = 1_000_000;
  const gw = await gateway({ now: () => t, breakerThreshold: 3, breakerOpenMs: 10_000 });
  for (let i = 0; i < 3; i++) assert.equal((await call(`${gw.url}/tasks/boom`, { token })).status, 500);
  seen.length = 0;
  assert.equal((await call(`${gw.url}/tasks`, { token })).status, 503);
  assert.equal(seen.length, 0);
  // otro servicio sigue vivo
  assert.equal((await call(`${gw.url}/focus-sessions`, { token })).status, 200);
  t += 11_000; // pasa el tiempo: se permite una prueba
  assert.equal((await call(`${gw.url}/tasks`, { token })).status, 200);
  assert.equal((await call(`${gw.url}/tasks`, { token })).status, 200);
  gw.close();
});

test('rate limit general y más estricto en login', async () => {
  const gw = await gateway({ rateLimitPerMinute: 5, authRateLimitPerMinute: 2 });
  const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await call(`${gw.url}/auth/login`, { method: 'POST', body: {} })).status);
  assert.deepEqual(codes, [200, 200, 429, 429]);
  const limited = await call(`${gw.url}/auth/login`, { method: 'POST', body: {} });
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  const gen = [];
  for (let i = 0; i < 7; i++) gen.push((await call(`${gw.url}/tasks`, { token })).status);
  assert.equal(gen.filter((c) => c === 429).length, 2);
  gw.close();
});

test('X-Forwarded-For no sirve para saltarse el límite si no hay proxy de confianza', async () => {
  const gw = await gateway({ authRateLimitPerMinute: 1 });
  const a = await call(`${gw.url}/auth/login`, { method: 'POST', body: {}, headers: { 'x-forwarded-for': '1.1.1.1' } });
  const b = await call(`${gw.url}/auth/login`, { method: 'POST', body: {}, headers: { 'x-forwarded-for': '2.2.2.2' } });
  assert.equal(a.status, 200);
  assert.equal(b.status, 429);
  gw.close();
});

test('rutas desconocidas dan 404, cuerpo gigante 413, JSON roto 400; health responde', async () => {
  const gw = await gateway();
  assert.equal((await call(`${gw.url}/otra-cosa`, { token })).status, 404);
  assert.equal((await call(`${gw.url}/health`)).status, 200);
  const big = await call(`${gw.url}/tasks`, { method: 'POST', token, body: { title: 'x'.repeat(200_000) } });
  assert.equal(big.status, 413);
  const bad = await fetch(`${gw.url}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{x' });
  assert.equal(bad.status, 400);
  gw.close();
});

test('limitador: la limpieza elimina ventanas vencidas', () => {
  let t = 0;
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => t });
  limiter.check('a'); limiter.check('b');
  assert.equal(limiter.size(), 2);
  t = 2000;
  limiter.sweep();
  assert.equal(limiter.size(), 0);
  limiter.stop();
});

test('breaker: half-open deja pasar solo una prueba', () => {
  let t = 0;
  const b = createBreaker({ threshold: 1, openMs: 100, now: () => t });
  b.failure();
  assert.equal(b.canRequest(), false);
  t = 150;
  assert.equal(b.canRequest(), true);
  assert.equal(b.canRequest(), false);
  b.failure();
  assert.equal(b.state(), 'open');
});
