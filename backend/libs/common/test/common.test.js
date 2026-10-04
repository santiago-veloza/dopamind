const { test } = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');
const { createLogger, required, int, validate, createAccessVerifier } = require('../src');
const { generateKeyPair, signTestAccessToken, silentLogger } = require('../src/testing');

test('required falla si falta la variable (no hay valores por defecto inseguros)', () => {
  assert.throws(() => required('NO_EXISTE', {}), /NO_EXISTE/);
  assert.equal(required('X', { X: 'a' }), 'a');
});

test('int valida enteros y usa el valor por defecto', () => {
  assert.equal(int('P', 3000, {}), 3000);
  assert.equal(int('P', 3000, { P: '80' }), 80);
  assert.throws(() => int('P', 1, { P: 'abc' }));
});

test('el logger escribe una línea JSON y serializa errores', () => {
  const logger = silentLogger();
  logger.child({ reqId: 'r1' }).error('falló', { err: new Error('boom') });
  const line = logger.lines.at(-1);
  assert.equal(line.level, 'error');
  assert.equal(line.service, 'test');
  assert.equal(line.err.message, 'boom');
});

test('el logger respeta el nivel mínimo', () => {
  const lines = [];
  const logger = createLogger('s', { level: 'warn', stream: { write: (l) => lines.push(l) } });
  logger.info('no sale');
  logger.warn('sí sale');
  assert.equal(lines.length, 1);
});

test('validate responde 400 con el detalle por campo y deja los datos limpios', () => {
  const mw = validate(z.object({ n: z.number().int() }));
  let status, body, nextCalled = false;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; } };
  mw({ body: { n: 'x' } }, res, () => { nextCalled = true; });
  assert.equal(status, 400);
  assert.equal(body.details[0].path, 'n');
  assert.equal(nextCalled, false);

  const req = { body: { n: 2, extra: 1 } };
  mw(req, res, () => { nextCalled = true; });
  assert.deepEqual(req.valid.body, { n: 2 }); // el campo extra se descarta
});

test('el verificador rechaza llave equivocada, audiencia equivocada y token de refresh', () => {
  const a = generateKeyPair();
  const b = generateKeyPair();
  const verify = createAccessVerifier({ publicKey: a.publicKey });
  assert.equal(verify(signTestAccessToken(a.privateKey, 5)).userId, 5);
  assert.throws(() => verify(signTestAccessToken(b.privateKey, 5)));
  assert.throws(() => verify(signTestAccessToken(a.privateKey, 5, { options: { audience: 'otra' } })));
  assert.throws(() => verify(signTestAccessToken(a.privateKey, 5, { claims: { token_use: 'refresh' } })));
  assert.throws(() => verify(signTestAccessToken(a.privateKey, 'abc')));
});
