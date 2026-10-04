#!/usr/bin/env bash
# Deja las 5 bases de prueba limpias. Requiere PGHOST/PGPORT/PGUSER (y PGPASSWORD si aplica).
set -euo pipefail
cd "$(dirname "$0")/.."

for svc in auth task journal achievement focus; do
  psql -v ON_ERROR_STOP=1 --no-psqlrc -q -d postgres \
    -c "DROP DATABASE IF EXISTS ${svc}_db WITH (FORCE)" \
    -c "DROP ROLE IF EXISTS ${svc}_svc"
done

export SCHEMAS_DIR="$PWD/db/schemas"
for svc in AUTH TASK JOURNAL ACHIEVEMENT FOCUS; do export "${svc}_DB_PASSWORD=test"; done
bash db/init/00-provision.sh
