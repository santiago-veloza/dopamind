const { withTransaction } = require('@dopamind/common');
const { ACHIEVEMENTS, STREAK_KEYS } = require('./catalog');
const { EVENTS } = require('./events');
const { localDate, nextStreak, levelOf, levelProgress } = require('./progress');

// Siembra los 12 logros; el ON CONFLICT lo hace seguro aunque lleguen dos a la vez
async function ensureSeed(db, userId) {
  await db.query(
    `INSERT INTO achievements (user_id, key, title, description, icon, required_value)
     SELECT $1, k, t, d, i, r
     FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::int[]) AS s(k, t, d, i, r)
     ON CONFLICT (user_id, key) DO NOTHING`,
    [
      userId,
      ACHIEVEMENTS.map((a) => a.key), ACHIEVEMENTS.map((a) => a.title), ACHIEVEMENTS.map((a) => a.description),
      ACHIEVEMENTS.map((a) => a.icon), ACHIEVEMENTS.map((a) => a.required_value),
    ]
  );
}

// Suma al progreso (tope en el valor requerido) y desbloquea una sola vez
async function advance(db, userId, key, amount) {
  await db.query(
    `UPDATE achievements SET
       current_value = LEAST(current_value + $3, required_value),
       unlocked = LEAST(current_value + $3, required_value) >= required_value,
       unlocked_at = CASE WHEN NOT unlocked AND LEAST(current_value + $3, required_value) >= required_value
                          THEN now() ELSE unlocked_at END
     WHERE user_id = $1 AND key = $2`,
    [userId, key, amount]
  );
}

// Las rachas guardan el día actual de la racha, no un contador de eventos
async function setStreakAchievements(db, userId, streak) {
  await db.query(
    `UPDATE achievements SET
       current_value = GREATEST(current_value, LEAST($3, required_value)),
       unlocked = GREATEST(current_value, LEAST($3, required_value)) >= required_value,
       unlocked_at = CASE WHEN NOT unlocked AND GREATEST(current_value, LEAST($3, required_value)) >= required_value
                          THEN now() ELSE unlocked_at END
     WHERE user_id = $1 AND key = ANY($2::text[])`,
    [userId, STREAK_KEYS, streak]
  );
}

function createAchievementService({ pool, timezone, now = () => new Date() }) {
  // Procesa un evento una sola vez. Devuelve 'applied' o 'duplicate'.
  async function handleEvent(routingKey, rawPayload) {
    const def = EVENTS[routingKey];
    if (!def) throw new Error(`evento desconocido: ${routingKey}`);
    const event = def.schema.parse(rawPayload); // si no valida, el mensaje va a la DLQ

    return withTransaction(pool, async (db) => {
      const fresh = await db.query(
        'INSERT INTO processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING',
        [event.eventId]
      );
      if (fresh.rowCount === 0) return 'duplicate';

      await ensureSeed(db, event.userId);
      await db.query('INSERT INTO user_progress (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [event.userId]);
      // el lock de la fila serializa los eventos de un mismo usuario
      const { rows } = await db.query(
        'SELECT points, current_streak, best_streak, last_active_date::text AS last_active_date FROM user_progress WHERE user_id = $1 FOR UPDATE',
        [event.userId]
      );
      const prog = rows[0];

      const { points, increments } = def.apply(event);
      const today = localDate(now(), timezone);
      const streak = nextStreak({ currentStreak: prog.current_streak, lastActiveDate: prog.last_active_date }, today);

      await db.query(
        `UPDATE user_progress SET points = points + $2, current_streak = $3,
           best_streak = GREATEST(best_streak, $3), last_active_date = $4::date WHERE user_id = $1`,
        [event.userId, points, streak, today]
      );
      for (const key of increments) await advance(db, event.userId, key, 1);
      await setStreakAchievements(db, event.userId, streak);
      return 'applied';
    });
  }

  async function listAchievements(userId) {
    return withTransaction(pool, async (db) => {
      await ensureSeed(db, userId);
      const { rows } = await db.query('SELECT * FROM achievements WHERE user_id = $1 ORDER BY id', [userId]);
      return rows;
    });
  }

  async function getProgress(userId) {
    const { rows } = await pool.query(
      'SELECT points, current_streak, best_streak FROM user_progress WHERE user_id = $1',
      [userId]
    );
    const p = rows[0] || { points: 0, current_streak: 0, best_streak: 0 };
    return {
      points: p.points,
      level: levelOf(p.points),
      level_progress: levelProgress(p.points),
      current_streak: p.current_streak,
      best_streak: p.best_streak,
    };
  }

  return { handleEvent, listAchievements, getProgress };
}

module.exports = { createAchievementService };
