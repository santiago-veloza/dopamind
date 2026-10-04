const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPair, silentLogger, testPool, listen, call, signTestAccessToken } = require('../../../libs/common/src/testing');
const { createApp } = require('../src/app');

let pool, server, url, alice, bob;

before(async () => {
  const keys = generateKeyPair();
  const logger = silentLogger();
  pool = testPool('focus', logger);
  ({ server, url } = await listen(createApp({ pool, logger, publicKey: keys.publicKey })));
  alice = signTestAccessToken(keys.privateKey, 1);
  bob = signTestAccessToken(keys.privateKey, 2);
});

after(async () => {
  server.close();
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DELETE FROM outbox');
  await pool.query('DELETE FROM focus_sessions');
});

const post = (body, token = alice) => call(`${url}/focus-sessions`, { method: 'POST', token, body });

test('exige token', async () => {
  assert.equal((await call(`${url}/focus-sessions`)).status, 401);
});

test('guarda la sesión y deja un evento focus.completed', async () => {
  const res = await post({ type: 'focus', duration_minutes: 25 });
  assert.equal(res.status, 201);
  assert.equal(res.json.focus_session.completed, true);
  const { rows } = await pool.query('SELECT * FROM outbox');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].routing_key, 'focus.completed');
  assert.equal(rows[0].payload.durationMinutes, 25);
  assert.equal(rows[0].payload.type, 'focus');
});

test('valida tipo, duración y fecha', async () => {
  const future = new Date(Date.now() + 3600_000).toISOString();
  for (const body of [{}, { type: 'yoga', duration_minutes: 10 }, { type: 'focus', duration_minutes: 0 },
    { type: 'focus', duration_minutes: -5 }, { type: 'focus', duration_minutes: 10.5 },
    { type: 'focus', duration_minutes: '10' }, { type: 'focus', duration_minutes: 721 },
    { type: 'focus', duration_minutes: 10, started_at: future },
    { type: 'focus', duration_minutes: 10, started_at: 'ayer' }]) {
    assert.equal((await post(body)).status, 400, JSON.stringify(body));
  }
});

test('historial con resumen numérico y filtro por tipo', async () => {
  await post({ type: 'focus', duration_minutes: 25 });
  await post({ type: 'focus', duration_minutes: 50 });
  await post({ type: 'mindfulness', duration_minutes: 10 });
  const all = await call(`${url}/focus-sessions`, { token: alice });
  assert.equal(all.json.focus_sessions.length, 3);
  assert.deepEqual(all.json.summary, [
    { type: 'focus', session_count: 2, total_minutes: 75 },
    { type: 'mindfulness', session_count: 1, total_minutes: 10 },
  ]);
  const only = await call(`${url}/focus-sessions?type=mindfulness`, { token: alice });
  assert.equal(only.json.focus_sessions.length, 1);
  assert.equal((await call(`${url}/focus-sessions?type=otro`, { token: alice })).status, 400);
});

test('aislamiento entre usuarios', async () => {
  const { json } = await post({ type: 'focus', duration_minutes: 25 });
  assert.equal((await call(`${url}/focus-sessions/${json.focus_session.id}`, { method: 'DELETE', token: bob })).status, 404);
  assert.deepEqual((await call(`${url}/focus-sessions`, { token: bob })).json.focus_sessions, []);
  assert.equal((await call(`${url}/focus-sessions/${json.focus_session.id}`, { method: 'DELETE', token: alice })).status, 200);
});
