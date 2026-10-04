const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPair, silentLogger, testPool, listen, call, signTestAccessToken } = require('../../../libs/common/src/testing');
const { createApp } = require('../src/app');

let pool, server, url, alice, bob;

before(async () => {
  const keys = generateKeyPair();
  const logger = silentLogger();
  pool = testPool('journal', logger);
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
  await pool.query('DELETE FROM journal_entries');
});

const post = (body, token = alice) => call(`${url}/journal-entries`, { method: 'POST', token, body });

test('exige token', async () => {
  assert.equal((await call(`${url}/journal-entries`)).status, 401);
});

test('crea con mood por defecto 3 y deja un evento journal.created', async () => {
  const res = await post({ content: '  Hoy me sentí bien ' });
  assert.equal(res.status, 201);
  assert.equal(res.json.journal_entry.mood, 3);
  assert.equal(res.json.journal_entry.content, 'Hoy me sentí bien');
  const { rows } = await pool.query('SELECT * FROM outbox');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].routing_key, 'journal.created');
  assert.equal(rows[0].event_id, `journal:${res.json.journal_entry.id}`);
});

test('valida contenido y mood (entero 1 a 5)', async () => {
  for (const body of [{}, { content: '   ' }, { content: 'x', mood: 0 }, { content: 'x', mood: 6 },
    { content: 'x', mood: 2.5 }, { content: 'x', mood: '3' }, { content: 'a'.repeat(10001) }]) {
    assert.equal((await post(body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM outbox')).rows[0].n, 0);
});

test('aislamiento entre usuarios', async () => {
  const { json } = await post({ content: 'privado' });
  const id = json.journal_entry.id;
  assert.equal((await call(`${url}/journal-entries/${id}`, { token: bob })).status, 404);
  assert.equal((await call(`${url}/journal-entries/${id}`, { method: 'DELETE', token: bob })).status, 404);
  assert.deepEqual((await call(`${url}/journal-entries`, { token: bob })).json.journal_entries, []);
  assert.equal((await call(`${url}/journal-entries/${id}`, { token: alice })).status, 200);
});

test('lista paginada, más reciente primero', async () => {
  for (const c of ['uno', 'dos', 'tres']) await post({ content: c });
  const res = await call(`${url}/journal-entries?limit=2`, { token: alice });
  assert.deepEqual(res.json.journal_entries.map((e) => e.content), ['tres', 'dos']);
  assert.equal((await call(`${url}/journal-entries?limit=0`, { token: alice })).status, 400);
});

test('borra la propia entrada', async () => {
  const { json } = await post({ content: 'x' });
  assert.equal((await call(`${url}/journal-entries/${json.journal_entry.id}`, { method: 'DELETE', token: alice })).status, 200);
  assert.equal((await call(`${url}/journal-entries/abc`, { token: alice })).status, 400);
});
