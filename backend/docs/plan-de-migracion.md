# Plan de Migración por Fases

| Fase | Qué se hace | Estado |
|------|-------------|--------|
| **0** | Construir Auth + API Gateway; la app sigue con BD local para todo lo demás | ✅ Backend listo en este kit |
| **1** | Migrar Task — la app lee/escribe tareas contra el servicio, con la BD local como respaldo offline | ⬜ |
| **2** | Migrar Journal y Focus/Timer de la misma forma | ⬜ |
| **3** | Migrar Achievement y conectar el Event Bus | ✅ Backend listo (evento task.completed funciona) |
| **4** | Retirar la BD local como fuente de verdad; queda solo como caché offline | ⬜ |

## Fase 0 — Auth + Gateway (LISTA en este kit)

- [x] Servicio Auth con PostgreSQL (register, login, refresh)
- [x] API Gateway con validación JWT y rate limiting
- [x] Contraseñas con bcrypt, tokens con expiración (15 min / 7 días)

## Fase 1 — Task

- [ ] Agregar `http` (o `dio`) a `pubspec.yaml` de la app
- [ ] Crear un `ApiClient` en Dart que apunte a `http://<ip-del-servidor>:3000`
- [ ] Modificar `AppProvider.addTask/updateTask/deleteTask` para llamar a la API
- [ ] Mantener SQLite como caché: si no hay internet, escribir local y sincronizar después
- [ ] Migrar datos existentes del usuario: `GET /tasks` + `POST /tasks` en el primer arranque con sesión

**Contrato de Task:** ver `contracts/task.yaml`

## Fase 2 — Journal y Focus

- [ ] Mismos pasos que Fase 1 para `addJournalEntry` y las sesiones de focus/mindfulness
- [ ] Los puntos (+5 journal, +2/min mindfulness, +3/min foco) siguen calculándose en la app por ahora

## Fase 3 — Achievement + Event Bus

- [x] Servicio Achievement con los 12 logros (sembrados por usuario al primer GET)
- [x] Evento `task.completed` publicado por Task y consumido por Achievement
- [ ] Mover también los incrementos de `journal_1`, `mindful_*`, `focus_*` al backend (pueden ser eventos nuevos o el endpoint manual `POST /achievements/:key/increment`)

## Fase 4 — Retirar la BD local

- [ ] SQLite queda solo como caché offline, la API es la fuente de verdad
- [ ] Sync: al abrir la app, pull de cambios; al operar sin conexión, push al reconectar
- [ ] Resolver conflictos (por ejemplo, `updated_at` más reciente gana)

## Decisiones ya tomadas

1. **Puntos, nivel y racha** viven en `SharedPreferences` de la app → eventualmente pasarán a un servicio de perfil (no está en el alcance actual del PDF).
2. **Verificación por foto (ML Kit)** se sigue haciendo en el dispositivo — subir la foto a un servicio de visión sería un paso futuro si se necesita.
3. **PostgreSQL 5 bases en 1 contenedor** — separación lógica completa, escalable a 5 servidores cambiando solo `DATABASE_URL`.
