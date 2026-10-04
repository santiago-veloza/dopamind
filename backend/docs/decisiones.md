# Decisiones de arquitectura (ADR)

## ADR-001 — JWT con RS256 en vez de HS256 compartido
**Problema:** con un secreto compartido, cualquier servicio podía fabricar tokens de cualquier usuario.
**Decisión:** auth firma con llave privada; los demás solo verifican con la pública. Audiencias distintas para access y refresh.
**Ventajas:** un servicio comprometido no puede emitir tokens. **Costo:** manejar un par de llaves y su rotación.
**Cambiar cuando:** se necesite rotación automática de llaves (JWKS).

## ADR-002 — Outbox para publicar eventos
**Problema:** guardar en la base y publicar en RabbitMQ son dos operaciones; si la segunda falla, el evento se perdía.
**Decisión:** el evento se inserta en `outbox` en la misma transacción y un relay lo publica con confirmaciones.
**Ventajas:** no se pierden eventos con el broker caído. **Costo:** entrega "al menos una vez" (por eso los consumidores son idempotentes) y una tabla extra que se purga a los 7 días.

## ADR-003 — Puntos, nivel y racha en el servidor
**Problema:** en el cliente se podían alterar y se duplicaba el conteo de logros al migrar.
**Decisión:** el servicio achievement los calcula solo desde eventos; se eliminó el endpoint público de incremento.
**Costo:** el cliente muestra datos con un pequeño retraso (consistencia eventual).

## ADR-004 — Librería común y workspaces de npm
**Problema:** repetir logger, validación, JWT y outbox en 6 servicios.
**Decisión:** `libs/common` como workspace; una sola Dockerfile parametrizada y un solo `package-lock.json`.
**Costo:** acoplamiento de versiones entre servicios. **Mitigación:** la librería no tiene lógica de negocio.
**Cambiar cuando:** los servicios los mantengan equipos distintos (publicarla como paquete versionado).

## ADR-005 — Una instancia de Postgres, una base y un rol por servicio
**Decisión:** aislamiento lógico y de privilegios sin el costo de 5 servidores. Para escalar basta cambiar el `DATABASE_URL` de un servicio.
