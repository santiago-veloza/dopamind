const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function serializeError(err) {
  return { name: err.name, message: err.message, stack: err.stack };
}

// Un log por línea en JSON para poder filtrarlo después
function createLogger(service, { stream = process.stdout, level = 'info', base = {} } = {}) {
  const min = LEVELS[level] ?? LEVELS.info;

  function write(lvl, msg, fields) {
    if (LEVELS[lvl] < min) return;
    const entry = { level: lvl, time: new Date().toISOString(), service, msg, ...base };
    for (const [k, v] of Object.entries(fields || {})) {
      entry[k] = v instanceof Error ? serializeError(v) : v;
    }
    stream.write(JSON.stringify(entry) + '\n');
  }

  const logger = {
    debug: (msg, f) => write('debug', msg, f),
    info: (msg, f) => write('info', msg, f),
    warn: (msg, f) => write('warn', msg, f),
    error: (msg, f) => write('error', msg, f),
    child: (extra) => createLogger(service, { stream, level, base: { ...base, ...extra } }),
  };
  return logger;
}

module.exports = { createLogger };
