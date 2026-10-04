// Prueba de humo contra un gateway en marcha: node scripts/smoke.js [url] [--wait-events]
const base = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:3000';
const waitEvents = process.argv.includes('--wait-events');
const email = `smoke-${Date.now()}@example.com`;
let access, refresh;

async function api(method, path, body, token = access) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

function check(name, cond, extra = '') {
  console.log(`${cond ? 'OK  ' : 'FALLA'} ${name} ${cond ? '' : extra}`);
  if (!cond) process.exitCode = 1;
}

(async () => {
  let r = await api('POST', '/auth/register', { email, password: 'clave-segura-1', display_name: 'Smoke' }, null);
  check('registro', r.status === 201, r.status);
  access = r.json.accessToken;
  refresh = r.json.refreshToken;

  check('refresh token no abre la API', (await api('GET', '/tasks', null, refresh)).status === 401);
  r = await api('POST', '/auth/refresh', { refreshToken: refresh }, null);
  check('refresh rota tokens', r.status === 200 && r.json.refreshToken !== refresh);
  check('el refresh viejo ya no sirve', (await api('POST', '/auth/refresh', { refreshToken: refresh }, null)).status === 401);
  r = await api('POST', '/auth/login', { email, password: 'clave-segura-1' }, null);
  check('login', r.status === 200);
  access = r.json.accessToken;

  r = await api('POST', '/tasks', { title: 'Tarea de humo', priority: 'high' });
  check('crear tarea', r.status === 201);
  const taskId = r.json.task.id;
  r = await api('PUT', `/tasks/${taskId}`, { completed: true });
  check('completar tarea', r.status === 200 && r.json.task.completed_at);
  check('listar tareas', (await api('GET', '/tasks?completed=true')).json.tasks.length === 1);
  check('catálogo predefinido', (await api('GET', '/tasks/predefined')).json.predefined_tasks.length === 23);

  check('crear diario', (await api('POST', '/journal-entries', { content: 'hola', mood: 4 })).status === 201);
  check('crear sesión de enfoque', (await api('POST', '/focus-sessions', { type: 'focus', duration_minutes: 25 })).status === 201);
  check('logros sembrados', (await api('GET', '/achievements')).json.achievements.length === 12);
  check('validación rechaza mood 9', (await api('POST', '/journal-entries', { content: 'x', mood: 9 })).status === 400);
  check('sin token da 401', (await api('GET', '/tasks', null, null)).status === 401);

  if (waitEvents) {
    let p;
    for (let i = 0; i < 40; i++) {
      p = (await api('GET', '/progress')).json.progress;
      if (p.points >= 10 + 5 + 75) break;
      await new Promise((r2) => setTimeout(r2, 500));
    }
    check('los eventos llegaron (90 puntos)', p.points === 90, `puntos=${p.points}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
