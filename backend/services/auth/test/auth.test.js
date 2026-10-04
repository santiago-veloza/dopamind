const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { generateKeyPair, silentLogger, testPool, listen, call } = require('../../../libs/common/src/testing');
const { createApp } = require('../src/app');

let pool, server, url, keys;
const creds = { email: 'ana@example.com', password: 'clave-segura-1' };

before(async () => {
  keys = generateKeyPair();
  pool = testPool('auth');
  const app = createApp({
    pool, logger: silentLogger(), privateKey: keys.privateKey, publicKey: keys.publicKey, bcryptRounds: 4,
  });
  ({ server, url } = await listen(app));
});

after(async () => {
  server.close();
  await pool.end();
});

beforeEach(() => pool.query('DELETE FROM users'));

const register = (body = creds) => call(`${url}/auth/register`, { method: 'POST', body });

test('registro devuelve usuario y tokens, sin el hash', async () => {
  const res = await register();
  assert.equal(res.status, 201);
  assert.equal(res.json.user.email, creds.email);
  assert.equal(res.json.user.password_hash, undefined);
  assert.ok(res.json.accessToken && res.json.refreshToken);
});

test('el email se normaliza a minúsculas', async () => {
  const res = await register({ email: '  ANA@Example.COM ', password: creds.password });
  assert.equal(res.json.user.email, 'ana@example.com');
});

test('email repetido da 409', async () => {
  await register();
  assert.equal((await register()).status, 409);
});

test('registros simultáneos con el mismo email: uno gana, el resto 409, ninguno 500', async () => {
  const results = await Promise.all(Array.from({ length: 6 }, () => register()));
  const codes = results.map((r) => r.status).sort();
  assert.equal(codes.filter((c) => c === 201).length, 1);
  assert.equal(codes.filter((c) => c === 409).length, 5);
});

test('valida entradas del registro', async () => {
  assert.equal((await register({ email: 'no-es-email', password: creds.password })).status, 400);
  assert.equal((await register({ email: creds.email, password: 'corta' })).status, 400);
  assert.equal((await register({ email: creds.email, password: 'a'.repeat(73) })).status, 400);
  assert.equal((await register({ email: creds.email })).status, 400);
});

test('login correcto e incorrecto dan la misma respuesta ante fallo', async () => {
  await register();
  const ok = await call(`${url}/auth/login`, { method: 'POST', body: creds });
  assert.equal(ok.status, 200);
  const badPass = await call(`${url}/auth/login`, { method: 'POST', body: { ...creds, password: 'otra-clave-1' } });
  const noUser = await call(`${url}/auth/login`, { method: 'POST', body: { email: 'x@example.com', password: 'otra-clave-1' } });
  assert.equal(badPass.status, 401);
  assert.deepEqual(badPass.json, noUser.json);
});

test('/auth/me acepta el access token', async () => {
  const { json } = await register();
  const me = await call(`${url}/auth/me`, { token: json.accessToken });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.email, creds.email);
});

test('un refresh token NO sirve como access token', async () => {
  const { json } = await register();
  const me = await call(`${url}/auth/me`, { token: json.refreshToken });
  assert.equal(me.status, 401);
});

test('token firmado con HS256 usando la llave pública es rechazado', async () => {
  const { json } = await register();
  const sub = jwt.decode(json.accessToken).sub;
  const forged = jwt.sign({ token_use: 'access' }, keys.publicKey, {
    algorithm: 'HS256', issuer: 'dopamind-auth', audience: 'dopamind-api', subject: sub,
  });
  assert.equal((await call(`${url}/auth/me`, { token: forged })).status, 401);
});

test('token expirado es rechazado', async () => {
  const { json } = await register();
  const expired = jwt.sign({ token_use: 'access' }, keys.privateKey, {
    algorithm: 'RS256', issuer: 'dopamind-auth', audience: 'dopamind-api',
    subject: jwt.decode(json.accessToken).sub, expiresIn: -10,
  });
  assert.equal((await call(`${url}/auth/me`, { token: expired })).status, 401);
});

test('refresh rota el token: el nuevo sirve y el anterior queda inservible', async () => {
  const first = (await register()).json;
  const second = await call(`${url}/auth/refresh`, { method: 'POST', body: { refreshToken: first.refreshToken } });
  assert.equal(second.status, 200);
  assert.notEqual(second.json.refreshToken, first.refreshToken);
  assert.equal((await call(`${url}/auth/me`, { token: second.json.accessToken })).status, 200);

  const replay = await call(`${url}/auth/refresh`, { method: 'POST', body: { refreshToken: first.refreshToken } });
  assert.equal(replay.status, 401);
});

test('reusar un refresh viejo revoca toda la familia', async () => {
  const first = (await register()).json;
  const second = (await call(`${url}/auth/refresh`, { method: 'POST', body: { refreshToken: first.refreshToken } })).json;
  await call(`${url}/auth/refresh`, { method: 'POST', body: { refreshToken: first.refreshToken } }); // reuso
  const afterReuse = await call(`${url}/auth/refresh`, { method: 'POST', body: { refreshToken: second.refreshToken } });
  assert.equal(afterReuse.status, 401);
});

test('refresh con un access token es rechazado', async () => {
  const { json } = await register();
  const res = await call(`${url}/auth/refresh`, { method: 'POST', body: { refreshToken: json.accessToken } });
  assert.equal(res.status, 401);
});

test('logout revoca la sesión', async () => {
  const { json } = await register();
  const out = await call(`${url}/auth/logout`, { method: 'POST', body: { refreshToken: json.refreshToken } });
  assert.equal(out.status, 204);
  const res = await call(`${url}/auth/refresh`, { method: 'POST', body: { refreshToken: json.refreshToken } });
  assert.equal(res.status, 401);
});

test('logout con token basura responde 204 igual', async () => {
  const out = await call(`${url}/auth/logout`, { method: 'POST', body: { refreshToken: 'basura' } });
  assert.equal(out.status, 204);
});

test('JSON malformado da 400 y ruta inexistente 404', async () => {
  const bad = await fetch(`${url}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{x' });
  assert.equal(bad.status, 400);
  assert.equal((await call(`${url}/nada`)).status, 404);
});
