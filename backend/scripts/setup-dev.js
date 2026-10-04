// Prepara el entorno local sin bash ni openssl: node scripts/setup-dev.js
// Crea keys/ (par RSA para los JWT) y .env con contraseñas aleatorias. Solo para desarrollo.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const keysDir = path.join(root, 'keys');
const privatePath = path.join(keysDir, 'jwt-private.pem');
const publicPath = path.join(keysDir, 'jwt-public.pem');
const envPath = path.join(root, '.env');

if (fs.existsSync(privatePath)) {
  console.log('keys/ ya existe, no se toca');
} else {
  fs.mkdirSync(keysDir, { recursive: true });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  // 644: el usuario "node" del contenedor tiene que poder leerlas (solo desarrollo)
  fs.writeFileSync(privatePath, privateKey, { mode: 0o644 });
  fs.writeFileSync(publicPath, publicKey, { mode: 0o644 });
  console.log('llaves creadas en keys/');
}

if (fs.existsSync(envPath)) {
  console.log('.env ya existe, no se toca');
} else {
  const rnd = () => crypto.randomBytes(16).toString('hex');
  const lines = [
    `POSTGRES_PASSWORD=${rnd()}`,
    `AUTH_DB_PASSWORD=${rnd()}`,
    `TASK_DB_PASSWORD=${rnd()}`,
    `JOURNAL_DB_PASSWORD=${rnd()}`,
    `ACHIEVEMENT_DB_PASSWORD=${rnd()}`,
    `FOCUS_DB_PASSWORD=${rnd()}`,
    'RABBITMQ_USER=dopamind',
    `RABBITMQ_PASSWORD=${rnd()}`,
  ];
  fs.writeFileSync(envPath, lines.join('\n') + '\n', { mode: 0o600 });
  console.log('.env creado');
}
