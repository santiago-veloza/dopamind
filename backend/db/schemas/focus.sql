-- focus_db: sesiones de enfoque/meditación y outbox

CREATE TABLE focus_sessions (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('mindfulness', 'focus')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 720),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed        BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_focus_user_type ON focus_sessions (user_id, type, started_at DESC);

-- Eventos pendientes de publicar en RabbitMQ (patrón outbox)
CREATE TABLE outbox (
  id           BIGSERIAL PRIMARY KEY,
  event_id     TEXT NOT NULL UNIQUE,
  routing_key  TEXT NOT NULL,
  payload      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON outbox (id) WHERE published_at IS NULL;
