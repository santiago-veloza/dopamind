// Circuit breaker simple: abierto tras N fallos seguidos; pasado un tiempo deja pasar una prueba.
function createBreaker({ threshold = 5, openMs = 10_000, now = Date.now }) {
  let failures = 0;
  let openUntil = 0;
  let state = 'closed';
  let probing = false;

  return {
    canRequest() {
      if (state === 'closed') return true;
      if (state === 'open' && now() >= openUntil) {
        state = 'half-open';
      }
      if (state === 'half-open' && !probing) {
        probing = true; // solo una petición de prueba a la vez
        return true;
      }
      return false;
    },
    success() {
      failures = 0;
      probing = false;
      state = 'closed';
    },
    failure() {
      probing = false;
      failures++;
      if (state === 'half-open' || failures >= threshold) {
        state = 'open';
        openUntil = now() + openMs;
      }
    },
    state: () => state,
  };
}

module.exports = { createBreaker };
