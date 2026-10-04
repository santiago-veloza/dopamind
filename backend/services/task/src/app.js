const {
  createBaseApp, finish, asyncHandler, validate, withTransaction, enqueueEvent,
  createAccessVerifier, createRequireAuth,
} = require('@dopamind/common');
const { createTaskSchema, updateTaskSchema, idParamSchema, listQuerySchema } = require('./schemas');

// columnas que el cliente puede cambiar (lista fija, nunca nombres que vengan del request)
const UPDATABLE = [
  'title', 'description', 'priority', 'category', 'completed', 'photo_verified', 'photo_path',
  'scheduled_hour', 'scheduled_minute', 'due_date', 'verification_keywords',
];

const toRow = (value) => (Array.isArray(value) ? value.join(',') : value);

function serialize(row) {
  return { ...row, verification_keywords: row.verification_keywords ? row.verification_keywords.split(',') : [] };
}

function createApp({ pool, logger, publicKey }) {
  const app = createBaseApp({ service: 'task', logger, pool });
  const requireAuth = createRequireAuth(createAccessVerifier({ publicKey }));

  app.get('/tasks/predefined', requireAuth, asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM predefined_tasks ORDER BY id');
    res.json({ predefined_tasks: rows });
  }));

  app.get('/tasks', requireAuth, validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
    const { completed, priority, limit, offset } = req.valid.query;
    const params = [req.userId];
    let where = 'user_id = $1';
    if (completed !== undefined) where += ` AND completed = $${params.push(completed)}`;
    if (priority) where += ` AND priority = $${params.push(priority)}`;
    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM tasks WHERE ${where} ORDER BY created_at DESC, id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ tasks: rows.map(serialize) });
  }));

  app.post('/tasks', requireAuth, validate(createTaskSchema), asyncHandler(async (req, res) => {
    const t = req.valid.body;
    const { rows } = await pool.query(
      `INSERT INTO tasks (user_id, title, description, priority, category,
                          scheduled_hour, scheduled_minute, due_date, verification_keywords)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.userId, t.title, t.description ?? null, t.priority, t.category,
        t.scheduled_hour ?? null, t.scheduled_minute ?? null, t.due_date ?? null,
        toRow(t.verification_keywords ?? []),
      ]
    );
    res.status(201).json({ task: serialize(rows[0]) });
  }));

  app.get('/tasks/:id', requireAuth, validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [
      req.valid.params.id,
      req.userId,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ task: serialize(rows[0]) });
  }));

  app.put('/tasks/:id', requireAuth, validate(idParamSchema, 'params'), validate(updateTaskSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.valid.params;
      const changes = req.valid.body;

      const task = await withTransaction(pool, async (db) => {
        const found = await db.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, req.userId]);
        const existing = found.rows[0];
        if (!existing) return null;

        const sets = [];
        const params = [];
        for (const col of UPDATABLE) {
          if (changes[col] !== undefined) sets.push(`${col} = $${params.push(toRow(changes[col]))}`);
        }
        const completing = changes.completed === true && !existing.completed;
        if (completing) sets.push('completed_at = now()');
        if (changes.completed === false) sets.push('completed_at = NULL');

        params.push(id, req.userId);
        const { rows } = await db.query(
          `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`,
          params
        );
        const updated = rows[0];

        // el evento va en la misma transacción; el id fijo evita premiar dos veces la misma tarea
        if (completing) {
          await enqueueEvent(db, {
            eventId: `task:${id}`,
            routingKey: 'task.completed',
            payload: {
              taskId: id,
              userId: req.userId,
              completedAt: updated.completed_at,
              photoVerified: updated.photo_verified,
            },
          });
        }
        return updated;
      });

      if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
      res.json({ task: serialize(task) });
    }));

  app.delete('/tasks/:id', requireAuth, validate(idParamSchema, 'params'), asyncHandler(async (req, res) => {
    const { rows } = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id', [
      req.valid.params.id,
      req.userId,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ deleted: true, id: rows[0].id });
  }));

  return finish(app, logger);
}

module.exports = { createApp };
