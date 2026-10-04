# Seguridad — controles implementados

| Tema | Control | Dónde |
|---|---|---|
| Tokens | RS256; access 15 min (aud `dopamind-api`), refresh 7 días (aud `dopamind-auth`) y `token_use` verificado | `libs/common/src/auth.js`, `services/auth` |
| Llaves | Privada solo en auth; el resto recibe la pública. Sin secretos por defecto: si faltan, el servicio no arranca | `config.js`, compose `secrets` |
| Refresh | De un solo uso, con rotación; reutilizarlo revoca toda la familia; `/auth/logout` revoca | `services/auth/src/app.js` |
| Contraseñas | bcrypt (12 rondas), 8 a 72 bytes; login con tiempo similar exista o no el correo | `services/auth` |
| Entradas | Esquemas zod en cada endpoint; los campos no permitidos se descartan | `schemas.js` de cada servicio |
| Datos de otros usuarios | Todas las consultas filtran por `user_id` del token | todos los servicios |
| Base de datos | Un rol por servicio, `CONNECT` solo a su base, solo DML | `db/init/00-provision.sh` |
| Gateway | Rate limit (100/min general, 10/min login/registro/refresh), timeout, circuit breaker, cabeceras reenviadas por lista blanca | `services/gateway` |
| Errores | Respuestas genéricas al cliente; el detalle va solo al log | `libs/common/src/http.js` |
| Contenedores | Usuario `node`, `read_only`, `cap_drop: ALL`, `no-new-privileges` | `Dockerfile`, compose |
| Secretos en git | `.env`, `keys/` y `*.pem` ignorados | `.gitignore` |

## Pendiente (deuda conocida)

- **HTTPS**: el gateway habla HTTP. En producción va detrás de un proxy con TLS (y `TRUST_PROXY_HOPS` ajustado).
- **Rate limit en memoria**: sirve con una réplica; con varias hace falta Redis.
- **Fuerza bruta por cuenta**: hoy el límite es por IP, no por correo.
- **`photo_verified` lo declara el cliente**: no hay verificación de foto en el servidor; da 15 puntos extra. Hasta tenerla, es una limitación aceptada.
- **Crear y completar tareas en bucle** otorga puntos: no hay tope diario.
- **Métricas y trazas**: hay logs JSON y `x-request-id`, no Prometheus/OpenTelemetry.
- **Llaves**: rotación manual; en producción usar un gestor de secretos.
- **Zona horaria de rachas**: una sola (`STREAK_TIMEZONE`) para todos los usuarios.
