// Prueba de extremo a extremo con RabbitMQ real: outbox -> relay -> exchange -> consumidor.
// Solo corre si RABBITMQ_URL está definida (en CI hay un servicio de RabbitMQ).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createBroker, createOutboxRelay, enqueueEvent, withTransaction, EXCHANGE,
} = require('@dopamind/common');
const { silentLogger, testPool } = require('../../../libs/common/src/testing');
const { createAchievementService } = require('../src/service');
const { setupConsumer } = require('../src/consumer');

const url = process.env.RABBITMQ_URL;

async function waitFor(check, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const value = await check();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('se agotó la espera');
}

test('un task.completed del outbox llega al servicio de logros', { skip: !url }, async () => {
  const logger = silentLogger();
  const taskPool = testPool('task', logger);
  const achPool = testPool('achievement', logger);
  const service = createAchievementService({ pool: achPool, timezone: 'America/Bogota' });
  await achPool.query('DELETE FROM processed_events');
  await achPool.query('DELETE FROM user_progress');
  await achPool.query('DELETE FROM achievements');
  await taskPool.query('DELETE FROM outbox');

  const broker = createBroker({ url, logger, setup: (ch) => setupConsumer(ch, { service, logger }) });
  await broker.start();
  const relay = createOutboxRelay({ pool: taskPool, getChannel: broker.getChannel, exchange: EXCHANGE, logger });

  try {
    await withTransaction(taskPool, (db) =>
      enqueueEvent(db, {
        eventId: 'task:9001', routingKey: 'task.completed',
        payload: { taskId: 9001, userId: 4242, photoVerified: false },
      })
    );
    assert.equal(await relay.relayOnce(), 1);
    const progress = await waitFor(async () => {
      const p = await service.getProgress(4242);
      return p.points > 0 ? p : null;
    });
    assert.equal(progress.points, 10);
  } finally {
    await broker.close();
    await taskPool.end();
    await achPool.end();
  }
});
