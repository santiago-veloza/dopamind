const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const {
  createBaseApp, finish, asyncHandler, validate, withTransaction,
  createAccessVerifier, createRequireAuth,
} = require('@dopamind/common');
const { registerSchema, loginSchema, refreshSchema } = require('./schemas');
const { createTokenService } = require('./tokens');

const UNIQUE_VIOLATION = '23505';
const DEFAULT_ACCESS_TTL = 15 * 60;
const DEFAULT_REFRESH_TTL = 7 * 24 * 60 * 60;

const publicUser = (u) => ({ id: u.id, email: u.email, display_name: u.display_name, created_at: u.created_at });

function createApp({
  pool, logger, privateKey, publicKey, bcryptRounds = 12,
  accessTtlSeconds = DEFAULT_ACCESS_TTL, refreshTtlSeconds = DEFAULT_REFRESH_TTL,
}) {
  const app = createBaseApp({ service: 'auth', logger, pool });
  const tokens = createTokenService({ privateKey, publicKey, accessTtlSeconds, refreshTtlSeconds });
  const requireAuth = createRequireAuth(createAccessVerifier({ publicKey }));
  // hash falso para que login tarde igual exista o no el correo
  const dummyHash = bcrypt.hashSync(crypto.randomUUID(), bcryptRounds);

  async function issuePair(db, userId, familyId) {
    const refresh = tokens.signRefresh(userId);
    await db.query(
      'INSERT INTO refresh_tokens (jti, family_id, user_id, expires_at) VALUES ($1, $2, $3, $4)',
      [refresh.jti, familyId, userId, refresh.expiresAt]
    );
    return { accessToken: tokens.signAccess(userId), refreshToken: refresh.token, jti: refresh.jti };
  }

  app.post('/auth/register', validate(registerSchema), asyncHandler(async (req, res) => {
    const { email, password, display_name } = req.valid.body;
    const hash = await bcrypt.hash(password, bcryptRounds);
    try {
      const result = await withTransaction(pool, async (db) => {
        const { rows } = await db.query(
          'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING *',
          [email, hash, display_name || null]
        );
        const pair = await issuePair(db, rows[0].id, crypto.randomUUID());
        return { user: rows[0], pair };
      });
      res.status(201).json({
        user: publicUser(result.user),
        accessToken: result.pair.accessToken,
        refreshToken: result.pair.refreshToken,
      });
    } catch (err) {
      // el UNIQUE decide, no un SELECT previo (evita la carrera entre dos registros)
      if (err.code === UNIQUE_VIOLATION) return res.status(409).json({ error: 'El email ya está registrado' });
      throw err;
    }
  }));

  app.post('/auth/login', validate(loginSchema), asyncHandler(async (req, res) => {
    const { email, password } = req.valid.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password_hash : dummyHash);
    if (!user || !ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const pair = await withTransaction(pool, (db) => issuePair(db, user.id, crypto.randomUUID()));
    res.json({ user: publicUser(user), accessToken: pair.accessToken, refreshToken: pair.refreshToken });
  }));

  // Rotación: cada refresh se usa una sola vez. Si llega uno ya usado, se revoca toda la familia.
  app.post('/auth/refresh', validate(refreshSchema), asyncHandler(async (req, res) => {
    const claims = tokens.verifyRefresh(req.valid.body.refreshToken);
    if (!claims) return res.status(401).json({ error: 'Refresh token inválido o expirado' });

    const outcome = await withTransaction(pool, async (db) => {
      const { rows } = await db.query('SELECT * FROM refresh_tokens WHERE jti = $1 FOR UPDATE', [claims.jti]);
      const current = rows[0];
      if (!current || current.expires_at < new Date()) return { status: 'invalid' };
      if (current.revoked_at) {
        await db.query(
          'UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL',
          [current.family_id]
        );
        return { status: 'reuse', userId: current.user_id };
      }
      const userRes = await db.query('SELECT * FROM users WHERE id = $1', [current.user_id]);
      if (!userRes.rows[0]) return { status: 'invalid' };
      const pair = await issuePair(db, current.user_id, current.family_id);
      await db.query('UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE jti = $1', [
        current.jti,
        pair.jti,
      ]);
      return { status: 'ok', user: userRes.rows[0], pair };
    });

    if (outcome.status === 'reuse') {
      req.log.warn('refresh token reutilizado, familia revocada', { userId: outcome.userId });
    }
    if (outcome.status !== 'ok') return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    res.json({
      user: publicUser(outcome.user),
      accessToken: outcome.pair.accessToken,
      refreshToken: outcome.pair.refreshToken,
    });
  }));

  // Cierra la sesión revocando la familia; siempre 204 para no filtrar si el token existía
  app.post('/auth/logout', validate(refreshSchema), asyncHandler(async (req, res) => {
    const claims = tokens.verifyRefresh(req.valid.body.refreshToken);
    if (claims) {
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at = now()
         WHERE revoked_at IS NULL AND family_id = (SELECT family_id FROM refresh_tokens WHERE jti = $1)`,
        [claims.jti]
      );
    }
    res.status(204).end();
  }));

  app.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: publicUser(rows[0]) });
  }));

  return finish(app, logger);
}

module.exports = { createApp };
