const { createBroker, EXCHANGE } = require('./broker');
const { createOutboxRelay } = require('./outbox');

// Conecta a RabbitMQ y publica lo que haya en el outbox del servicio
function startEventPublisher({ pool, logger, url }) {
  const broker = createBroker({ url, logger });
  const relay = createOutboxRelay({ pool, getChannel: broker.getChannel, exchange: EXCHANGE, logger });
  broker.start();
  relay.start();
  return {
    relay,
    async stop() {
      relay.stop();
      await broker.close();
    },
  };
}

module.exports = { startEventPublisher };
