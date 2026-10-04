# Arquitectura — DopamiND (backend)

Enfoque: **servicios por capacidad de negocio**, una base por servicio, comunicación síncrona (REST) para lo que se ve al instante y asíncrona (eventos) para las consecuencias.

```
 App Android (Flutter)
        │  HTTP + JWT (access, 15 min)
        ▼
   ┌─────────┐   timeout 5 s · circuit breaker · rate limit · x-request-id
   │ Gateway │──────────────────────────────────────────────┐
   └─────────┘                                              │
     │    │     │          │           │                    │
     ▼    ▼     ▼          ▼           ▼                    │
   Auth  Task  Journal   Focus     Achievement ◄── eventos ─┘
    │     │      │         │           │        (RabbitMQ: dopamind.events)
 auth_db task_db journal_db focus_db achievement_db   (1 rol por base)
          └──── outbox ────┴───── outbox ────┘
```

## Responsabilidades

| Servicio | Es dueño de | Publica | Consume |
|---|---|---|---|
| auth | usuarios, refresh tokens | — | — |
| task | tareas, catálogo predefinido | `task.completed` | — |
| journal | entradas de diario | `journal.created` | — |
| focus | sesiones de enfoque/meditación | `focus.completed` | — |
| achievement | logros, puntos, nivel, racha | — | los 3 eventos |
| gateway | nada (sin datos) | — | — |

Los puntos, niveles y rachas **viven en el servidor** (antes estaban en la app y se podían alterar).

## Reglas

- Ningún servicio lee la base de otro. Cada rol de Postgres solo conecta a su base y solo tiene DML (sin DDL).
- `user_id` es una referencia lógica entre servicios (sin claves foráneas entre bases).
- Solo `auth` firma tokens (RS256). El resto verifica con la llave pública.
- Un evento se guarda en la tabla `outbox` en la misma transacción que el cambio; un relay lo publica con confirmación del broker. Si RabbitMQ está caído, no se pierde.
- Los consumidores son idempotentes (`processed_events`); lo que falla dos veces va a la DLQ `achievement.events.dlq`.
- El gateway no espera a los demás servicios para arrancar; si uno cae, responde 502/503 solo para sus rutas.

## Código compartido

`libs/common` (logger, validación, verificación JWT, outbox, conexión a RabbitMQ). Es una librería pequeña y sin lógica de negocio. Cuesta: un cambio ahí obliga a reconstruir todos los servicios. Ver ADR-004.
