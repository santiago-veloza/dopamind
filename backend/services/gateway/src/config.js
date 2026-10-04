const { required, int, readKeyFile } = require('@dopamind/common');

function loadConfig(env = process.env) {
  return {
    port: int('PORT', 3000, env),
    publicKey: readKeyFile('JWT_PUBLIC_KEY_PATH', env),
    targets: {
      auth: required('AUTH_URL', env),
      task: required('TASK_URL', env),
      journal: required('JOURNAL_URL', env),
      achievement: required('ACHIEVEMENT_URL', env),
      focus: required('FOCUS_URL', env),
    },
    upstreamTimeoutMs: int('UPSTREAM_TIMEOUT_MS', 5000, env),
    rateLimitPerMinute: int('RATE_LIMIT_PER_MINUTE', 100, env),
    authRateLimitPerMinute: int('AUTH_RATE_LIMIT_PER_MINUTE', 10, env),
    // cuántos proxies hay delante (0 = ninguno); si no, X-Forwarded-For se podría falsificar
    trustProxyHops: int('TRUST_PROXY_HOPS', 0, env),
    logLevel: env.LOG_LEVEL || 'info',
  };
}

module.exports = { loadConfig };
