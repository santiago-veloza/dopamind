const {
  createBaseApp, finish, asyncHandler, validate, withTransaction, enqueueEvent,
  createAccessVerifier, createRequireAuth,
} = require('@dopamind/common');
const { createEntrySchema, idParamSchema, listQuerySchema } = require('./schemas');

function createApp({ pool, logger, publicKey }) {
  const app = createBaseApp({ service: 'journal', logger, pool });
  const requireAuth = createRequireAuth(createAccessVerifier({ publicKey }));

  app.get('/journal-entries', requireAuth, validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
    const { limit, offset } = req.valid.query;
    const { rows } = await pool.query(
      'SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3',
      [req.userId, limit, offset]
    );
    res.json({ journal_entries: rows });
  }));

  app.post('/journal-entries', requireAuth, validate(createEntrySchema), asyncHandler(async (req, res) => {
    const { content, prompt, mood } = req.valid.body;
    const entry = await withTransaction(pool, async (db) => {
      const { rows } = await db.query(
        'INSERT INTO journal_entries (user_id, content, prompt, mood) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.userId, content, prompt ?? null, mood]
      );
      await enqueueEvent(db, {
        eventId: `journal:${rows[0].id}`,
        routingKey: 'journal.created',
        payload: { entryId: rows[0].id, userId: req.userId, createdAt: rows[0].created_at },
      });
      return rows[0];
    });
    res.status(201).json({ journal_entry: entry });
  }));

  app.get('/journal-entries/:id', requireAuth, validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2', [
      req.valid.params.id,
      req.userId,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Entrada no encontrada' });
    res.json({ journal_entry: rows[0] });
  }));

  app.delete('/journal-entries/:id', requireAuth, validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
    const { rows } = await pool.query('DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING id', [
      req.valid.params.id,
      req.userId,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Entrada no encontrada' });
    res.json({ deleted: true, id: rows[0].id });
  }));

  return finish(app, logger);
}

module.exports = { createApp };
