// Ventana fija en memoria. Sirve con una sola réplica; con varias haría falta Redis.
function createRateLimiter({ windowMs = 60_000, max, now = Date.now }) {
  const hits = new Map(); // clave -> { count, resetAt }

  // quita las ventanas vencidas para que el Map no crezca sin fin
  function sweep() {
    const t = now();
    for (const [key, entry] of hits) if (entry.resetAt <= t) hits.delete(key);
  }

  function check(key) {
    const t = now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= t) {
      entry = { count: 0, resetAt: t + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    return { allowed: entry.count <= max, retryAfterSeconds: Math.ceil((entry.resetAt - t) / 1000) };
  }

  const timer = setInterval(sweep, windowMs);
  timer.unref();

  return { check, sweep, size: () => hits.size, stop: () => clearInterval(timer) };
}

module.exports = { createRateLimiter };
