const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPair, silentLogger, testPool, listen, call, signTestAccessToken } = require('../../../libs/common/src/testing');
const { createApp } = require('../src/app');
const { createAchievementService } = require('../src/service');
const { setupConsumer } = require('../src/consumer');
const { localDate, nextStreak, levelOf } = require('../src/progress');

const TZ = 'America/Bogota';
let pool, server, url, keys, clock, service;
const logger = silentLogger();

before(async () => {
  keys = generateKeyPair();
  pool = testPool('achievement', logger);
  clock = new Date('2026-10-04T15:00:00Z');
  service = createAchievementService({ pool, timezone: TZ, now: () => clock });
  ({ server, url } = await listen(createApp({ pool, logger, publicKey: keys.publicKey, service })));
});

after(async () => {
  server.close();
  await pool.end();
});

beforeEach(async () => {
  clock = new Date('2026-10-04T15:00:00Z');
  for (const t of ['achievements', 'user_progress', 'processed_events']) await pool.query(`DELETE FROM ${t}`);
});

const taskDone = (id, extra = {}) => ({ eventId: `task:${id}`, taskId: id, userId: 1, photoVerified: false, ...extra });
const byKey = async (userId = 1) =>
  Object.fromEntries((await service.listAchievements(userId)).map((a) => [a.key, a]));

// ---- lógica pura ----

test('el día se calcula en la zona configurada (01:00 UTC sigue siendo el día anterior en Bogotá)', () => {
  assert.equal(localDate(new Date('2026-10-05T01:00:00Z'), TZ), '2026-10-04');
  assert.equal(localDate(new Date('2026-10-05T06:00:00Z'), TZ), '2026-10-05');
});

test('nextStreak: primer día, mismo día, día siguiente y hueco', () => {
  assert.equal(nextStreak({ currentStreak: 0, lastActiveDate: null }, '2026-10-04'), 1);
  assert.equal(nextStreak({ currentStreak: 4, lastActiveDate: '2026-10-04' }, '2026-10-04'), 4);
  assert.equal(nextStreak({ currentStreak: 4, lastActiveDate: '2026-10-03' }, '2026-10-04'), 5);
  assert.equal(nextStreak({ currentStreak: 4, lastActiveDate: '2026-10-01' }, '2026-10-04'), 1);
});

test('nivel: sube cada 100 puntos', () => {
  assert.equal(levelOf(0), 1);
  assert.equal(levelOf(99), 1);
  assert.equal(levelOf(100), 2);
});

// ---- eventos ----

test('task.completed da 10 puntos y desbloquea first_task', async () => {
  assert.equal(await service.handleEvent('task.completed', taskDone(1)), 'applied');
  const a = await byKey();
  assert.equal(a.first_task.unlocked, true);
  assert.ok(a.first_task.unlocked_at);
  assert.equal(a.tasks_50.current_value, 1);
  assert.equal(a.photo_verify.unlocked, false);
  assert.equal((await service.getProgress(1)).points, 10);
});

test('con foto verificada suma 25 y desbloquea photo_verify', async () => {
  await service.handleEvent('task.completed', taskDone(1, { photoVerified: true }));
  assert.equal((await service.getProgress(1)).points, 25);
  assert.equal((await byKey()).photo_verify.unlocked, true);
});

test('el mismo evento dos veces se aplica una sola vez', async () => {
  await service.handleEvent('task.completed', taskDone(1));
  assert.equal(await service.handleEvent('task.completed', taskDone(1)), 'duplicate');
  assert.equal((await service.getProgress(1)).points, 10);
  assert.equal((await byKey()).tasks_50.current_value, 1);
});

test('el mismo evento entregado en paralelo se aplica una sola vez', async () => {
  const results = await Promise.all(Array.from({ length: 6 }, () => service.handleEvent('task.completed', taskDone(7))));
  assert.equal(results.filter((r) => r === 'applied').length, 1);
  assert.equal((await service.getProgress(1)).points, 10);
});

test('eventos distintos del mismo usuario en paralelo no pierden puntos', async () => {
  await Promise.all([1, 2, 3, 4].map((i) => service.handleEvent('task.completed', taskDone(i))));
  assert.equal((await service.getProgress(1)).points, 40);
});

test('journal y focus aplican sus puntos y logros', async () => {
  await service.handleEvent('journal.created', { eventId: 'journal:1', entryId: 1, userId: 1 });
  await service.handleEvent('focus.completed', { eventId: 'focus:1', sessionId: 1, userId: 1, type: 'focus', durationMinutes: 25 });
  await service.handleEvent('focus.completed', { eventId: 'focus:2', sessionId: 2, userId: 1, type: 'mindfulness', durationMinutes: 10 });
  const a = await byKey();
  assert.equal(a.journal_1.unlocked, true);
  assert.equal(a.journal_7.current_value, 1);
  assert.equal(a.focus_1.unlocked, true);
  assert.equal(a.mindful_1.unlocked, true);
  assert.equal((await service.getProgress(1)).points, 5 + 75 + 20);
});

test('el progreso de un logro no pasa del valor requerido', async () => {
  for (let i = 1; i <= 52; i++) await service.handleEvent('task.completed', taskDone(i));
  const a = (await byKey()).tasks_50;
  assert.equal(a.current_value, 50);
  assert.equal(a.unlocked, true);
});

test('rachas: días seguidos suben, un hueco reinicia, y desbloquea streak_3', async () => {
  const days = ['2026-10-04T15:00:00Z', '2026-10-05T15:00:00Z', '2026-10-06T15:00:00Z'];
  for (const [i, d] of days.entries()) {
    clock = new Date(d);
    await service.handleEvent('task.completed', taskDone(i + 1));
  }
  let p = await service.getProgress(1);
  assert.equal(p.current_streak, 3);
  assert.equal((await byKey()).streak_3.unlocked, true);
  assert.equal((await byKey()).streak_7.current_value, 3);

  clock = new Date('2026-10-10T15:00:00Z'); // hueco
  await service.handleEvent('task.completed', taskDone(10));
  p = await service.getProgress(1);
  assert.equal(p.current_streak, 1);
  assert.equal(p.best_streak, 3);
  assert.equal((await byKey()).streak_3.unlocked, true); // lo ganado no se pierde
});

test('varios eventos el mismo día no inflan la racha', async () => {
  await service.handleEvent('task.completed', taskDone(1));
  await service.handleEvent('journal.created', { eventId: 'journal:1', entryId: 1, userId: 1 });
  assert.equal((await service.getProgress(1)).current_streak, 1);
});

test('payload inválido o evento desconocido lanzan error (van a la DLQ)', async () => {
  await assert.rejects(service.handleEvent('task.completed', { eventId: 'x' }));
  await assert.rejects(service.handleEvent('focus.completed', { eventId: 'f', sessionId: 1, userId: 1, type: 'yoga', durationMinutes: 5 }));
  await assert.rejects(service.handleEvent('otro.evento', {}));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM processed_events')).rows[0].n, 0);
});

test('si falla a mitad, no queda el evento marcado como procesado', async () => {
  const broken = createAchievementService({
    pool, timezone: 'Zona/Invalida', now: () => clock, // Intl lanza error después del insert en processed_events
  });
  await assert.rejects(broken.handleEvent('task.completed', taskDone(1)));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM processed_events')).rows[0].n, 0);
  assert.equal(await service.handleEvent('task.completed', taskDone(1)), 'applied'); // se puede reintentar
});

// ---- API ----

test('API: exige token, siembra los 12 logros y aísla usuarios', async () => {
  assert.equal((await call(`${url}/achievements`)).status, 401);
  const alice = signTestAccessToken(keys.privateKey, 1);
  const bob = signTestAccessToken(keys.privateKey, 2);
  const results = await Promise.all([1, 2, 3].map(() => call(`${url}/achievements`, { token: alice })));
  assert.ok(results.every((r) => r.status === 200 && r.json.achievements.length === 12));
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM achievements WHERE user_id = 1')).rows[0].n, 12);

  await service.handleEvent('task.completed', taskDone(1));
  const forBob = await call(`${url}/achievements`, { token: bob });
  assert.equal(forBob.json.achievements.find((a) => a.key === 'first_task').unlocked, false);
});

test('API: /progress devuelve ceros al inicio y datos después', async () => {
  const alice = signTestAccessToken(keys.privateKey, 1);
  let res = await call(`${url}/progress`, { token: alice });
  assert.deepEqual(res.json.progress, { points: 0, level: 1, level_progress: 0, current_streak: 0, best_streak: 0 });
  for (let i = 1; i <= 10; i++) await service.handleEvent('task.completed', taskDone(i));
  res = await call(`${url}/progress`, { token: alice });
  assert.equal(res.json.progress.points, 100);
  assert.equal(res.json.progress.level, 2);
});

test('API: ya no existe el endpoint para incrementar logros a mano', async () => {
  const alice = signTestAccessToken(keys.privateKey, 1);
  const res = await call(`${url}/achievements/tasks_50/increment`, { method: 'POST', token: alice, body: { amount: 999 } });
  assert.equal(res.status, 404);
});

// ---- consumidor ----

function fakeConsumerChannel() {
  const ch = { exchanges: [], queues: {}, bindings: [], acks: [], nacks: [] };
  ch.assertExchange = async (name, type) => ch.exchanges.push({ name, type });
  ch.assertQueue = async (name, opts) => { ch.queues[name] = opts; };
  ch.bindQueue = async (queue, exchange, key) => ch.bindings.push({ queue, exchange, key });
  ch.prefetch = async () => {};
  ch.consume = async (queue, fn) => { ch.handler = fn; };
  ch.ack = (m) => ch.acks.push(m);
  ch.nack = (m, all, requeue) => ch.nacks.push({ m, requeue });
  return ch;
}
const message = (key, body, redelivered = false) => ({
  fields: { routingKey: key, redelivered }, content: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
});

test('consumidor: cola con DLQ configurada y enlazada a los 3 eventos', async () => {
  const ch = fakeConsumerChannel();
  await setupConsumer(ch, { service, logger });
  assert.equal(ch.queues['achievement.events'].arguments['x-dead-letter-exchange'], 'dopamind.events.dlx');
  assert.ok(ch.queues['achievement.events.dlq']);
  const keys = ch.bindings.filter((b) => b.queue === 'achievement.events').map((b) => b.key).sort();
  assert.deepEqual(keys, ['focus.completed', 'journal.created', 'task.completed']);
});

test('consumidor: ack si sale bien; reintenta una vez y luego descarta hacia la DLQ', async () => {
  const ch = fakeConsumerChannel();
  await setupConsumer(ch, { service, logger });

  const ok = message('task.completed', taskDone(1));
  await ch.handler(ok);
  assert.deepEqual(ch.acks, [ok]);

  const bad = message('task.completed', { eventId: 'roto' });
  await ch.handler(bad);
  assert.equal(ch.nacks[0].requeue, true);
  await ch.handler(message('task.completed', { eventId: 'roto' }, true));
  assert.equal(ch.nacks[1].requeue, false);

  await ch.handler(message('task.completed', 'no es json'));
  assert.equal(ch.nacks.length, 3);
});
