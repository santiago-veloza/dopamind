const {
  createBaseApp, finish, createAccessVerifier, createRequireAuth,
} = require('@dopamind/common');
const { createRateLimiter } = require('./rateLimit');
const { createBreaker } = require('./breaker');
const { matchRoute, isPublic, isSensitive } = require('./routes');

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function createApp({
  logger, publicKey, targets,
  upstreamTimeoutMs = 5000, rateLimitPerMinute = 100, authRateLimitPerMinute = 10,
  trustProxyHops = 0, fetchFn = fetch, now = Date.now,
  breakerThreshold = 5, breakerOpenMs = 10_000,
}) {
  const app = createBaseApp({ service: 'gateway', logger });
  app.set('trust proxy', trustProxyHops);
  const requireAuth = createRequireAuth(createAccessVerifier({ publicKey }));

  const general = createRateLimiter({ max: rateLimitPerMinute, now });
  const sensitive = createRateLimiter({ max: authRateLimitPerMinute, now });
  const breakers = Object.fromEntries(
    Object.keys(targets).map((name) => [name, createBreaker({ threshold: breakerThreshold, openMs: breakerOpenMs, now })])
  );

  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  function limit(req, res, next) {
    const limiter = isSensitive(req) ? sensitive : general;
    const { allowed, retryAfterSeconds } = limiter.check(req.ip);
    if (allowed) return next();
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Demasiadas solicitudes, intenta más tarde' });
  }

  async function proxy(req, res) {
    const route = req.route_;
    const breaker = breakers[route.service];
    if (!breaker.canRequest()) {
      return res.status(503).json({ error: 'Servicio temporalmente no disponible' });
    }

    // solo se reenvían estas cabeceras; el servicio vuelve a validar el token por su cuenta
    const headers = { 'x-request-id': req.id };
    if (req.headers.authorization) headers.authorization = req.headers.authorization;
    let body;
    if (BODY_METHODS.has(req.method)) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(req.body ?? {});
    }

    try {
      const upstream = await fetchFn(targets[route.service] + req.originalUrl, {
        method: req.method, headers, body, signal: AbortSignal.timeout(upstreamTimeoutMs),
      });
      if (upstream.status >= 500) breaker.failure();
      else breaker.success();

      const payload = Buffer.from(await upstream.arrayBuffer());
      res.status(upstream.status);
      const type = upstream.headers.get('content-type');
      if (type) res.setHeader('Content-Type', type);
      res.send(payload);
    } catch (err) {
      breaker.failure();
      const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
      req.log.error('falló la llamada al servicio', { service: route.service, timedOut, err });
      // al cliente no se le cuentan detalles internos
      res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'El servicio tardó demasiado' : 'Servicio no disponible' });
    }
  }

  app.use((req, res, next) => {
    req.route_ = matchRoute(req.path);
    next();
  });
  app.use((req, res, next) => (req.route_ ? limit(req, res, next) : next()));
  app.use((req, res, next) => {
    if (!req.route_) return next();
    return isPublic(req) ? next() : requireAuth(req, res, next);
  });
  app.use((req, res, next) => (req.route_ ? proxy(req, res) : next()));

  const stop = () => {
    general.stop();
    sensitive.stop();
  };
  return Object.assign(finish(app, logger), { stop, _limiters: { general, sensitive } });
}

module.exports = { createApp };
