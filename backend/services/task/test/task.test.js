const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateKeyPair, silentLogger, testPool, listen, call, signTestAccessToken, fakeChannel,
} = require('../../../libs/common/src/testing');
const { createOutboxRelay } = require('../../../libs/common/src/outbox');
const { createApp } = require('../src/app');

let pool, server, url, keys, alice, bob;
const logger = silentLogger();

before(async () => {
  keys = generateKeyPair();
  pool = testPool('task', logger);
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
  await pool.query('DELETE FROM tasks');
});

const create = (token = alice, body = { title: 'Lavar la loza' }) =>
  call(`${url}/tasks`, { method: 'POST', token, body });
const outbox = async () => (await pool.query('SELECT * FROM outbox ORDER BY id')).rows;

test('exige un access token válido', async () => {
  assert.equal((await call(`${url}/tasks`)).status, 401);
  const refreshShaped = signTestAccessToken(keys.privateKey, 1, {
    claims: { token_use: 'refresh' }, options: { audience: 'dopamind-auth' },
  });
  assert.equal((await call(`${url}/tasks`, { token: refreshShaped })).status, 401);
  const wrongUse = signTestAccessToken(keys.privateKey, 1, { claims: { token_use: 'refresh' } });
  assert.equal((await call(`${url}/tasks`, { token: wrongUse })).status, 401);
});

test('crea con valores por defecto y keywords como arreglo', async () => {
  const res = await create(alice, { title: '  Hacer cama ', verification_keywords: ['bed', 'cama'] });
  assert.equal(res.status, 201);
  assert.equal(res.json.task.title, 'Hacer cama');
  assert.equal(res.json.task.priority, 'medium');
  assert.deepEqual(res.json.task.verification_keywords, ['bed', 'cama']);
  assert.equal(res.json.task.user_id, 1);
});

test('valida entradas al crear', async () => {
  for (const body of [{ title: '' }, {}, { title: 'x', priority: 'urgent' }, { title: 'x', scheduled_hour: 24 },
    { title: 'x', due_date: 'mañana' }, { title: 'x', verification_keywords: 'a,b' }]) {
    assert.equal((await create(alice, body)).status, 400, JSON.stringify(body));
  }
});

test('un usuario no ve ni toca las tareas de otro', async () => {
  const { json } = await create(alice);
  const id = json.task.id;
  assert.equal((await call(`${url}/tasks/${id}`, { token: bob })).status, 404);
  assert.equal((await call(`${url}/tasks/${id}`, { method: 'PUT', token: bob, body: { title: 'x' } })).status, 404);
  assert.equal((await call(`${url}/tasks/${id}`, { method: 'DELETE', token: bob })).status, 404);
  assert.deepEqual((await call(`${url}/tasks`, { token: bob })).json.tasks, []);
});

test('filtra por completed y priority', async () => {
  await create(alice, { title: 'a', priority: 'high' });
  await create(alice, { title: 'b', priority: 'low' });
  const high = await call(`${url}/tasks?priority=high`, { token: alice });
  assert.equal(high.json.tasks.length, 1);
  const done = await call(`${url}/tasks?completed=true`, { token: alice });
  assert.equal(done.json.tasks.length, 0);
  assert.equal((await call(`${url}/tasks?priority=nada`, { token: alice })).status, 400);
});

test('PUT ignora campos que el cliente no puede controlar', async () => {
  const { json } = await create(alice);
  const res = await call(`${url}/tasks/${json.task.id}`, {
    method: 'PUT', token: alice,
    body: { title: 'Nuevo', user_id: 99, id: 12345, completed_at: '2001-01-01T00:00:00Z' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.task.title, 'Nuevo');
  assert.equal(res.json.task.user_id, 1);
  assert.equal(res.json.task.id, json.task.id);
  assert.equal(res.json.task.completed_at, null);
});

test('PUT rechaza cuerpo vacío o con tipos incorrectos, y ids no numéricos', async () => {
  const { json } = await create(alice);
  const put = (body, id = json.task.id) => call(`${url}/tasks/${id}`, { method: 'PUT', token: alice, body });
  assert.equal((await put({})).status, 400);
  assert.equal((await put({ completed: 'si' })).status, 400);
  assert.equal((await put({ title: null })).status, 400);
  assert.equal((await put({ title: 'x' }, 'abc')).status, 400);
});

test('completar guarda completed_at en servidor y deja UN evento en el outbox', async () => {
  const { json } = await create(alice);
  const id = json.task.id;
  const res = await call(`${url}/tasks/${id}`, { method: 'PUT', token: alice, body: { completed: true, photo_verified: true } });
  assert.ok(res.json.task.completed_at);
  const rows = await outbox();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].routing_key, 'task.completed');
  assert.equal(rows[0].event_id, `task:${id}`);
  assert.equal(rows[0].payload.userId, 1);
  assert.equal(rows[0].payload.photoVerified, true);
  assert.equal(rows[0].published_at, null);
});

test('actualizar de nuevo o completar otra vez no genera más eventos', async () => {
  const { json } = await create(alice);
  const put = (body) => call(`${url}/tasks/${json.task.id}`, { method: 'PUT', token: alice, body });
  await put({ completed: true });
  await put({ completed: true });
  await put({ title: 'otro título' });
  await put({ completed: false });
  await put({ completed: true }); // volver a completar no premia otra vez
  assert.equal((await outbox()).length, 1);
});

test('predefinidas devuelve el catálogo', async () => {
  const res = await call(`${url}/tasks/predefined`, { token: alice });
  assert.equal(res.json.predefined_tasks.length, 23);
});

test('delete borra solo lo propio', async () => {
  const { json } = await create(alice);
  assert.equal((await call(`${url}/tasks/${json.task.id}`, { method: 'DELETE', token: alice })).status, 200);
  assert.equal((await call(`${url}/tasks/${json.task.id}`, { token: alice })).status, 404);
});

// ---- relay del outbox ----

async function completeTasks(n) {
  for (let i = 0; i < n; i++) {
    const { json } = await create(alice, { title: `t${i}` });
    await call(`${url}/tasks/${json.task.id}`, { method: 'PUT', token: alice, body: { completed: true } });
  }
}

test('el relay publica lo pendiente y lo marca como publicado', async () => {
  await completeTasks(2);
  const channel = fakeChannel();
  const relay = createOutboxRelay({ pool, getChannel: () => channel, exchange: 'dopamind.events', logger });
  assert.equal(await relay.relayOnce(), 2);
  assert.equal(channel.published.length, 2);
  assert.equal(channel.published[0].routingKey, 'task.completed');
  assert.ok(channel.published[0].body.eventId.startsWith('task:'));
  assert.equal(await relay.relayOnce(), 0); // nada nuevo
});

test('si RabbitMQ no está disponible el evento se conserva', async () => {
  await completeTasks(1);
  const relay = createOutboxRelay({ pool, getChannel: () => null, exchange: 'x', logger });
  assert.equal(await relay.relayOnce(), 0);
  assert.equal((await outbox())[0].published_at, null);
});

test('si un publish falla, se confirman los anteriores y se reintenta el resto', async () => {
  await completeTasks(3);
  const relay = createOutboxRelay({
    pool, getChannel: () => fakeChannel({ failOn: 2 }), exchange: 'x', logger,
  });
  assert.equal(await relay.relayOnce(), 1);
  const pending = (await outbox()).filter((r) => r.published_at === null);
  assert.equal(pending.length, 2);
  const retry = createOutboxRelay({ pool, getChannel: () => fakeChannel(), exchange: 'x', logger });
  assert.equal(await retry.relayOnce(), 2);
});

test('el purge borra solo lo publicado hace tiempo', async () => {
  await completeTasks(2);
  const relay = createOutboxRelay({ pool, getChannel: () => fakeChannel(), exchange: 'x', logger });
  await relay.relayOnce();
  await pool.query("UPDATE outbox SET published_at = now() - interval '30 days' WHERE id = (SELECT min(id) FROM outbox)");
  await relay.purgePublished(7);
  assert.equal((await outbox()).length, 1);
});
