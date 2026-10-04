-- auth_db: usuarios y refresh tokens

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un refresh token por fila; family_id agrupa la cadena de rotación
CREATE TABLE refresh_tokens (
  jti         UUID PRIMARY KEY,
  family_id   UUID NOT NULL,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  replaced_by UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_user ON refresh_tokens (user_id);
