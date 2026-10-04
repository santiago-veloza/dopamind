#!/usr/bin/env bash
# Prepara el entorno local: .env con contraseñas aleatorias y llaves JWT.
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/gen-keys.sh
if [ -f .env ]; then echo ".env ya existe, no se toca"; exit 0; fi
rnd() { openssl rand -hex 16; }
cat > .env <<ENV
POSTGRES_PASSWORD=$(rnd)
AUTH_DB_PASSWORD=$(rnd)
TASK_DB_PASSWORD=$(rnd)
JOURNAL_DB_PASSWORD=$(rnd)
ACHIEVEMENT_DB_PASSWORD=$(rnd)
FOCUS_DB_PASSWORD=$(rnd)
RABBITMQ_USER=dopamind
RABBITMQ_PASSWORD=$(rnd)
ENV
chmod 600 .env
echo ".env creado"
