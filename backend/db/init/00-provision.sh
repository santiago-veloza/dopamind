#!/usr/bin/env bash
# Crea una base y un rol por servicio. El rol solo puede conectarse a SU base y hacer DML.
# Corre solo en el primer arranque de postgres (initdb.d) o a mano con PGHOST/PGUSER/PGPASSWORD.
set -euo pipefail

SCHEMAS_DIR="${SCHEMAS_DIR:-/schemas}"
PSQL=(psql -v ON_ERROR_STOP=1 --no-psqlrc -q)

for svc in auth task journal achievement focus; do
  var="$(echo "${svc}" | tr '[:lower:]' '[:upper:]')_DB_PASSWORD"
  pass="${!var:?falta ${var}}"
  role="${svc}_svc"
  db="${svc}_db"

  "${PSQL[@]}" -d postgres -v role="$role" -v pass="$pass" -v db="$db" <<'SQL'
CREATE ROLE :"role" LOGIN PASSWORD :'pass';
CREATE DATABASE :"db";
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO :"role";
SQL

  # el esquema lo crea el superusuario; el rol del servicio solo recibe DML
  "${PSQL[@]}" -d "$db" -f "${SCHEMAS_DIR}/${svc}.sql"
  "${PSQL[@]}" -d "$db" -v role="$role" <<'SQL'
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"role";
SQL
done
