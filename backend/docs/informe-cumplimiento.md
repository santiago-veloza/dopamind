# Informe de cumplimiento de microservicios — estado de los hallazgos

| # | Sev. | Hallazgo | Estado | Dónde se resuelve |
|---|---|---|---|---|
| 1 | 🔴 | Refresh token servía como access | ✅ Resuelto | audiencias distintas + `token_use` (`libs/common/src/auth.js`) |
| 2 | 🔴 | Secreto JWT por defecto | ✅ Resuelto | `config.js`: sin variable no arranca |
| 3 | 🔴 | HS256 compartido por todos | ✅ Resuelto | RS256 (ADR-001) |
| 4 | 🟠 | Un usuario de BD para todo | ✅ Resuelto | `db/init/00-provision.sh` (verificado: `task_svc` no entra a `auth_db`) |
| 5 | 🟠 | Evento perdido (dual-write) | ✅ Resuelto | outbox (ADR-002) |
| 6 | 🟠 | Consumidor sin idempotencia ni DLQ | ✅ Resuelto | `processed_events`, DLQ, un reintento |
| 7 | 🟠 | Gateway sin timeout/breaker | ✅ Resuelto | `services/gateway` |
| 8 | 🟠 | Cliente controla datos | ✅ Parcial | validación zod, `completed_at` del servidor, sin `increment`. `photo_verified` sigue declarado por el cliente |
| 9 | 🟠 | Observabilidad mínima | ✅ Parcial | logs JSON + `x-request-id`. Faltan métricas/trazas |
| 10 | 🟡 | Node 20 sin soporte | ✅ Resuelto | `node:22-alpine` |
| 11 | 🟡 | Sin lockfile | ✅ Resuelto | `package-lock.json` + `npm ci` |
| 12 | 🟡 | Root, sin restart, sin dockerignore | ✅ Resuelto | `Dockerfile`, compose |
| 13 | 🟡 | Rate limit sin limpieza | ✅ Resuelto (1 réplica) | `rateLimit.js` |
| 14 | 🟡 | Registro con carrera; refresh sin rotación | ✅ Resuelto | UNIQUE + 409; rotación |
| 15 | 🟡 | Seed de logros sin transacción | ✅ Resuelto | `ON CONFLICT DO NOTHING` |
| 16 | 🟢 | Sin tests ni CI | ✅ Resuelto | 82 pruebas + GitHub Actions |
| 17 | 🟢 | Contratos con diferencias | ✅ Resuelto | `contracts/*.yaml` actualizados (el de auth tenía un YAML inválido) |
| 18 | 🟢 | Sin HTTPS/CORS | ⏳ Pendiente | HTTPS va en el proxy de producción; CORS no aplica a una app nativa |
| App | 🟠 | Doble conteo de logros al migrar | ✅ Resuelto | la app ya no incrementa logros; lo hace el servidor |
| App | 🟠 | Puntos/niveles/rachas en el cliente | ✅ Resuelto | servicio achievement (ADR-003) |
