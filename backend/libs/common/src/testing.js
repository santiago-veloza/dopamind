// Utilidades solo para pruebas (no se exportan desde index.js)
const crypto = require('node:crypto');
const { Writable } = require('node:stream');
const { createLogger } = require('./logger');
const { createPool } = require('./db');

// Llaves RSA nuevas por ejecución de pruebas
function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

function silentLogger() {
  const lines = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(JSON.parse(chunk.toString()));
      cb();
    },
  });
  const logger = createLogger('test', { stream, level: 'debug' });
  logger.lines = lines;
  return logger;
}

// Conecta como el rol real del servicio (mínimo privilegio), no como superusuario
function testPool(service, logger = silentLogger()) {
  const host = process.env.PGHOST || '127.0.0.1';
  const port = process.env.PGPORT || '5432';
  return createPool(`postgres://${service}_svc:test@${host}:${port}/${service}_db`, logger, 5);
}

async function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

// fetch con JSON y cabecera de token opcional
async function call(url, { method = 'GET', body, token, headers = {} } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* respuesta sin json */
  }
  return { status: res.status, json, headers: res.headers };
}

module.exports = { generateKeyPair, silentLogger, testPool, listen, call };

const jwt = require('jsonwebtoken');

// Access token válido para un usuario de prueba
function signTestAccessToken(privateKey, userId, overrides = {}) {
  return jwt.sign({ token_use: 'access', ...overrides.claims }, privateKey, {
    algorithm: 'RS256',
    issuer: 'dopamind-auth',
    audience: 'dopamind-api',
    subject: String(userId),
    expiresIn: 300,
    ...overrides.options,
  });
}

// Canal falso: guarda lo publicado; failOn(n) hace fallar el n-ésimo publish (1 = el primero)
function fakeChannel({ failOn = null } = {}) {
  const published = [];
  let count = 0;
  return {
    published,
    publish(exchange, routingKey, content, options, cb) {
      count++;
      if (count === failOn) return cb(new Error('nack simulado'));
      published.push({ exchange, routingKey, body: JSON.parse(content.toString()), options });
      cb(null);
      return true;
    },
  };
}

module.exports.signTestAccessToken = signTestAccessToken;
module.exports.fakeChannel = fakeChannel;
