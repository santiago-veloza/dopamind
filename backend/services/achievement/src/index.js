const { createLogger, createPool, createBroker, run } = require('@dopamind/common');
const { loadConfig } = require('./config');
const { createApp } = require('./app');
const { createAchievementService } = require('./service');
const { setupConsumer } = require('./consumer');

const config = loadConfig();
const logger = createLogger('achievement', { level: config.logLevel });
const pool = createPool(config.databaseUrl, logger);

const service = createAchievementService({ pool, timezone: config.timezone });
const broker = createBroker({
  url: config.rabbitUrl,
  logger,
  setup: (channel) => setupConsumer(channel, { service, logger }),
});
broker.start();

const app = createApp({ pool, logger, publicKey: config.publicKey, service });

run({
  app, port: config.port, logger,
  onShutdown: async () => {
    await broker.close();
    await pool.end();
  },
});
