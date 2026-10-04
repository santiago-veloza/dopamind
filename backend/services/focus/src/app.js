const {
  createBaseApp, finish, asyncHandler, validate, withTransaction, enqueueEvent,
  createAccessVerifier, createRequireAuth,
} = require('@dopamind/common');
const { createSessionSchema, idParamSchema, listQuerySchema } = require('./schemas');

const HISTORY_LIMIT = 100;

function createApp({ pool, logger, publicKey }) {
  const app = createBaseApp({ service: 'focus', logger, pool });
  const requireAuth = createRequireAuth(createAccessVerifier({ publicKey }));

  app.post('/focus-sessions', requireAuth, validate(createSessionSchema), asyncHandler(async (req, res) => {
    const { type, duration_minutes, started_at } = req.valid.body;
    const session = await withTransaction(pool, async (db) => {
      const { rows } = await db.query(
        `INSERT INTO focus_sessions (user_id, type, duration_minutes, started_at, completed)
         VALUES ($1, $2, $3, COALESCE($4, now()), true) RETURNING *`,
        [req.userId, type, duration_minutes, started_at ?? null]
      );
      await enqueueEvent(db, {
        eventId: `focus:${rows[0].id}`,
        routingKey: 'focus.completed',
        payload: {
          sessionId: rows[0].id,
          userId: req.userId,
          type,
          durationMinutes: duration_minutes,
          startedAt: rows[0].started_at,
        },
      });
      return rows[0];
    });
    res.status(201).json({ focus_session: session });
  }));

  app.get('/focus-sessions', requireAuth, validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
    const params = [req.userId];
    let where = 'user_id = $1';
    if (req.valid.query.type) where += ` AND type = $${params.push(req.valid.query.type)}`;

    const sessions = await pool.query(
      `SELECT * FROM focus_sessions WHERE ${where} ORDER BY started_at DESC, id DESC LIMIT ${HISTORY_LIMIT}`,
      params
    );
    const summary = await pool.query(
      `SELECT type, COUNT(*)::int AS session_count, COALESCE(SUM(duration_minutes), 0)::int AS total_minutes
       FROM focus_sessions WHERE ${where} GROUP BY type ORDER BY type`,
      params
    );
    res.json({ focus_sessions: sessions.rows, summary: summary.rows });
  }));

  app.delete('/focus-sessions/:id', requireAuth, validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
    const { rows } = await pool.query('DELETE FROM focus_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [
      req.valid.params.id,
      req.userId,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Sesión no encontrada' });
    res.json({ deleted: true, id: rows[0].id });
  }));

  return finish(app, logger);
}

module.exports = { createApp };
