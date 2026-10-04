const { createLogger, run } = require('@dopamind/common');
const { loadConfig } = require('./config');
const { createApp } = require('./app');

const config = loadConfig();
const logger = createLogger('gateway', { level: config.logLevel });
const app = createApp({ logger, ...config });

run({ app, port: config.port, logger, onShutdown: async () => app.stop() });
