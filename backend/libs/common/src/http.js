const crypto = require('node:crypto');
const express = require('express');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 no captura errores de handlers async por sí solo
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const REQUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const QUIET_PATHS = new Set(['/health', '/ready']);

// id de correlación: se acepta el que manda el gateway si tiene formato válido
function requestContext(logger) {
  return (req, res, next) => {
    const incoming = req.headers['x-request-id'];
    req.id = REQUEST_ID_RE.test(incoming || '') ? incoming : crypto.randomUUID();
    res.setHeader('x-request-id', req.id);
    req.log = logger.child({ reqId: req.id });
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      if (QUIET_PATHS.has(req.path)) return;
      req.log.info('request', {
        method: req.method,
        path: req.originalUrl.split('?')[0], // sin query para no loguear datos sensibles
        status: res.statusCode,
        ms: Number(process.hrtime.bigint() - start) / 1e6,
      });
    });
    next();
  };
}

function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Cuerpo demasiado grande' });
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    (req.log || logger).error('error no controlado', { err });
    res.status(500).json({ error: 'Error interno' }); // sin detalles al cliente
  };
}

// App base común: contexto, json, health y ready. Los servicios agregan sus rutas y llaman finish().
function createBaseApp({ service, logger, pool, bodyLimit = '100kb' }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext(logger));
  app.use(express.json({ limit: bodyLimit }));
  app.get('/health', (req, res) => res.json({ status: 'ok', service }));
  app.get('/ready', async (req, res) => {
    try {
      if (pool) await pool.query('SELECT 1');
      res.json({ status: 'ready', service });
    } catch (err) {
      req.log.error('ready falló', { err });
      res.status(503).json({ status: 'not_ready', service });
    }
  });
  return app;
}

function finish(app, logger) {
  app.use(notFound);
  app.use(errorHandler(logger));
  return app;
}

// Arranca y apaga limpio con SIGTERM (docker stop)
function run({ app, port, logger, onShutdown = async () => {} }) {
  const server = app.listen(port, () => logger.info('escuchando', { port }));
  const shutdown = async (signal) => {
    logger.info('apagando', { signal });
    server.close();
    try {
      await onShutdown();
    } finally {
      process.exit(0);
    }
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  return server;
}

module.exports = { HttpError, asyncHandler, requestContext, notFound, errorHandler, createBaseApp, finish, run };
