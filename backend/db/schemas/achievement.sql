-- achievement_db: logros, progreso (puntos, nivel, racha) y eventos ya procesados

CREATE TABLE achievements (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL,
  key            TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL,
  icon           TEXT NOT NULL,
  unlocked       BOOLEAN NOT NULL DEFAULT false,
  unlocked_at    TIMESTAMPTZ,
  required_value INTEGER NOT NULL DEFAULT 1,
  current_value  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, key)
);

CREATE TABLE user_progress (
  user_id          INTEGER PRIMARY KEY,
  points           INTEGER NOT NULL DEFAULT 0,
  current_streak   INTEGER NOT NULL DEFAULT 0,
  best_streak      INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE
);

-- Para no aplicar dos veces el mismo evento (RabbitMQ entrega "al menos una vez")
CREATE TABLE processed_events (
  event_id     TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
