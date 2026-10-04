const { createLogger, createPool, startEventPublisher, run } = require('@dopamind/common');
const { loadConfig } = require('./config');
const { createApp } = require('./app');

const config = loadConfig();
const logger = createLogger('focus', { level: config.logLevel });
const pool = createPool(config.databaseUrl, logger);

const publisher = startEventPublisher({ pool, logger, url: config.rabbitUrl });
const app = createApp({ pool, logger, publicKey: config.publicKey });

run({
  app, port: config.port, logger,
  onShutdown: async () => {
    await publisher.stop();
    await pool.end();
  },
});
