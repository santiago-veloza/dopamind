const amqp = require('amqplib');

const EXCHANGE = 'dopamind.events';
const DLX = 'dopamind.events.dlx';

// Conexión a RabbitMQ que se reconecta sola. setup(channel) arma colas/consumidores en cada conexión.
function createBroker({ url, logger, setup = async () => {}, connect = (u) => amqp.connect(u), retryMs = 2000, maxRetryMs = 30000 }) {
  let channel = null;
  let connection = null;
  let closed = false;
  let retryTimer = null;
  let attempt = 0;

  async function open() {
    try {
      connection = await connect(url);
      const ch = await connection.createConfirmChannel();
      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
      await setup(ch);
      connection.on('error', (err) => logger.warn('error de conexión con rabbit', { err }));
      connection.on('close', () => {
        channel = null;
        if (!closed) scheduleRetry();
      });
      channel = ch;
      attempt = 0;
      logger.info('conectado a rabbitmq');
    } catch (err) {
      channel = null;
      logger.warn('no se pudo conectar a rabbitmq', { err });
      if (!closed) scheduleRetry();
    }
  }

  function scheduleRetry() {
    attempt++;
    const delay = Math.min(retryMs * 2 ** (attempt - 1), maxRetryMs);
    retryTimer = setTimeout(open, delay);
    retryTimer.unref();
  }

  return {
    start: () => open(),
    getChannel: () => channel,
    async close() {
      closed = true;
      clearTimeout(retryTimer);
      try {
        await connection?.close();
      } catch {
        /* ya estaba cerrada */
      }
    },
  };
}

module.exports = { createBroker, EXCHANGE, DLX };
