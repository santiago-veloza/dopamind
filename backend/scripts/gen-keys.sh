#!/usr/bin/env bash
# Genera el par de llaves RSA para firmar (auth) y verificar (resto) los JWT.
# Solo para desarrollo local. En producción las llaves vienen de un gestor de secretos.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p keys
if [ -f keys/jwt-private.pem ]; then echo "keys/ ya existe, no se toca"; exit 0; fi
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out keys/jwt-private.pem 2>/dev/null
openssl pkey -in keys/jwt-private.pem -pubout -out keys/jwt-public.pem
# el usuario "node" del contenedor tiene que poder leerlas (solo dev)
chmod 644 keys/jwt-private.pem keys/jwt-public.pem
echo "llaves creadas en keys/"
