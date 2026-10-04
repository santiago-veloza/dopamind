-- journal_db: entradas del diario y outbox

CREATE TABLE journal_entries (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  content    TEXT NOT NULL,
  prompt     TEXT,
  mood       INTEGER NOT NULL DEFAULT 3 CHECK (mood BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_user_id ON journal_entries (user_id, created_at DESC);

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
