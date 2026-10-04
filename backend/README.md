# DopamiND — backend

Servicios: `gateway` (3000), `auth` (3001), `task` (3002), `journal` (3003), `achievement` (3004), `focus` (3005), más PostgreSQL y RabbitMQ.
Arquitectura y decisiones en `docs/`; contratos en `contracts/`.

## Levantarlo (Docker)

```bash
cd backend
bash scripts/setup-dev.sh        # crea .env con contraseñas aleatorias y las llaves JWT
docker compose up --build -d
node scripts/smoke.js http://localhost:3000 --wait-events
```

Si ya habías levantado una versión anterior: `docker compose down -v` (cambian los roles de la base y las colas de RabbitMQ).

La app Android (emulador) llega al gateway en `http://10.0.2.2:3000`; un celular físico, en `http://<IP-de-tu-PC>:3000`.

## Pruebas

Necesitan un PostgreSQL local (con `PGHOST/PGPORT/PGUSER/PGPASSWORD` apuntando a él):

```bash
npm ci
npm test            # recrea las bases de prueba y corre todo
```

La prueba contra RabbitMQ real solo corre si defines `RABBITMQ_URL` (en CI sí).

## Estructura

```
libs/common/     logger, validación, JWT, outbox, RabbitMQ
services/<svc>/  src/ (app.js, index.js, config.js, schemas.js) y test/
db/schemas/      una base por servicio
db/init/         crea bases y roles con mínimo privilegio
```

`docs/plan-de-migracion.md` y `docs/tareas-de-andre.md` son anteriores a esta versión y pueden estar desactualizados.
