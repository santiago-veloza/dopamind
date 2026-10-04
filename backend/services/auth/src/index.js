const { createLogger, createPool, run } = require('@dopamind/common');
const { loadConfig } = require('./config');
const { createApp } = require('./app');

const config = loadConfig();
const logger = createLogger('auth', { level: config.logLevel });
const pool = createPool(config.databaseUrl, logger);

const app = createApp({ pool, logger, ...config });

// limpia refresh tokens vencidos una vez por hora
const PURGE_EVERY_MS = 60 * 60 * 1000;
const purge = setInterval(() => {
  pool
    .query("DELETE FROM refresh_tokens WHERE expires_at < now() - interval '1 day'")
    .catch((err) => logger.error('no se pudo limpiar refresh_tokens', { err }));
}, PURGE_EVERY_MS);
purge.unref();

run({ app, port: config.port, logger, onShutdown: () => pool.end() });
