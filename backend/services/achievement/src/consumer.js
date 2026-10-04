const { DLX } = require('@dopamind/common');

const QUEUE = 'achievement.events';
const DLQ = 'achievement.events.dlq';
const ROUTING_KEYS = ['task.completed', 'journal.created', 'focus.completed'];

// Declara colas y consumidor. Lo que falle dos veces va a la cola de mensajes muertos (DLQ).
async function setupConsumer(channel, { service, logger, exchange = 'dopamind.events' }) {
  await channel.assertExchange(DLX, 'fanout', { durable: true });
  await channel.assertQueue(DLQ, { durable: true });
  await channel.bindQueue(DLQ, DLX, '');

  await channel.assertQueue(QUEUE, { durable: true, arguments: { 'x-dead-letter-exchange': DLX } });
  for (const key of ROUTING_KEYS) await channel.bindQueue(QUEUE, exchange, key);
  await channel.prefetch(1);

  await channel.consume(QUEUE, async (msg) => {
    if (!msg) return;
    const routingKey = msg.fields.routingKey;
    try {
      const payload = JSON.parse(msg.content.toString());
      const result = await service.handleEvent(routingKey, payload);
      logger.info('evento procesado', { routingKey, eventId: payload.eventId, result });
      channel.ack(msg);
    } catch (err) {
      // primer fallo: reintento; segundo: DLQ
      const retry = !msg.fields.redelivered;
      logger.error('falló el evento', { routingKey, retry, err });
      channel.nack(msg, false, retry);
    }
  });
}

module.exports = { setupConsumer, QUEUE, DLQ, ROUTING_KEYS };
