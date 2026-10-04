// Prefijo de la ruta -> servicio que la atiende
const ROUTES = [
  { prefix: '/auth', service: 'auth' },
  { prefix: '/tasks', service: 'task' },
  { prefix: '/journal-entries', service: 'journal' },
  { prefix: '/achievements', service: 'achievement' },
  { prefix: '/progress', service: 'achievement' },
  { prefix: '/focus-sessions', service: 'focus' },
];

// Rutas que no piden token
const PUBLIC = new Set(['POST /auth/register', 'POST /auth/login', 'POST /auth/refresh', 'POST /auth/logout']);
// Rutas con límite más estricto (fuerza bruta)
const SENSITIVE = new Set(['POST /auth/register', 'POST /auth/login', 'POST /auth/refresh']);

function matchRoute(path) {
  return ROUTES.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
}

const routeKey = (req) => `${req.method} ${req.path}`;

module.exports = { ROUTES, matchRoute, isPublic: (req) => PUBLIC.has(routeKey(req)), isSensitive: (req) => SENSITIVE.has(routeKey(req)) };
