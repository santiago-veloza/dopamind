# Tareas Asignadas al Equipo (André)

Checklist correspondiente a las tareas del documento de migración.

## Backend (este kit ya trae la base de cada una)

- [x] **Servicio Auth** (registro, login, JWT) con su propia base de datos
      → `services/auth/` — funciona: probado con register + login
- [x] **API Gateway** con enrutamiento hacia todos los servicios
      → `services/gateway/` — valida JWT, rate limiting (100 req/min), proxy
- [x] **Servicio Task** con endpoints CRUD y su base de datos
      → `services/task/` — CRUD completo + tareas predefinidas + publica eventos
- [x] **Servicio Journal** con su base de datos
      → `services/journal/` — CRUD completo
- [x] **Servicio Achievement** suscrito al evento `task.completed`
      → `services/achievement/` — cola `achievement.task_completed` funcionando
- [x] **Servicio Focus/Timer**
      → `services/focus/` — historial + resumen por tipo
- [x] **Event Bus (RabbitMQ)** con el primer evento publicado desde Task
      → Verificado: completar una tarea desbloquea "Primera Tarea" automáticamente
- [x] **Contratos de API (OpenAPI)** de cada servicio
      → `contracts/` — 5 archivos YAML

## Qué falta (siguiente etapa, coordinar con el equipo)

- [ ] Conectar la app Flutter al gateway (Fase 1) — agrega `http`/`dio` y un `ApiClient`
- [ ] CI/CD por servicio (cada servicio se construye y despliega por separado)
- [ ] Despliegue en cloud/VPS
- [ ] Agregar tests unitarios por servicio
- [ ] Rotación de secretos en producción (gestor de secretos en vez de `.env`)

## Cómo correr el proyecto

```bash
docker compose up -d --build
docker compose ps          # todo debe decir "healthy"
```

Detalle completo en `README.md`.

## Dónde mirar cada cosa

| Quiero ver... | Carpeta |
|---------------|---------|
| Cómo se enruta todo | `services/gateway/src/index.js` |
| Cómo funciona el registro/login | `services/auth/src/index.js` |
| El evento task.completed | `services/task/src/index.js` (busca `publishEvent`) |
| Quién escucha el evento | `services/achievement/src/index.js` (busca `handleTaskCompleted`) |
| El SQL de cada base | `schemas/` |
| La forma de los datos de la app Flutter | `app-reference/` |
