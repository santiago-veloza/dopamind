// Outbox: el evento se guarda en la misma transacción que el cambio y después se publica.
// Así no se pierde si RabbitMQ está caído en ese momento.

async function enqueueEvent(db, { eventId, routingKey, payload }) {
  await db.query(
    `INSERT INTO outbox (event_id, routing_key, payload)
     VALUES ($1, $2, $3) ON CONFLICT (event_id) DO NOTHING`,
    [eventId, routingKey, JSON.stringify({ eventId, ...payload })]
  );
}

function publishConfirmed(channel, exchange, row) {
  return new Promise((resolve, reject) => {
    channel.publish(
      exchange,
      row.routing_key,
      Buffer.from(JSON.stringify(row.payload)),
      { persistent: true, contentType: 'application/json', messageId: row.event_id },
      (err) => (err ? reject(err) : resolve())
    );
  });
}

function createOutboxRelay({ pool, getChannel, exchange, logger, batchSize = 50, intervalMs = 1000 }) {
  let timer = null;
  let running = false;

  // Publica lo pendiente. Devuelve cuántos eventos se confirmaron.
  async function relayOnce() {
    const channel = getChannel();
    if (!channel) return 0;
    const client = await pool.connect();
    let sent = 0;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT id, event_id, routing_key, payload FROM outbox
         WHERE published_at IS NULL ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED`,
        [batchSize]
      );
      for (const row of rows) {
        try {
          await publishConfirmed(channel, exchange, row);
        } catch (err) {
          logger.warn('no se pudo publicar, se reintenta', { eventId: row.event_id, err });
          break;
        }
        await client.query('UPDATE outbox SET published_at = now() WHERE id = $1', [row.id]);
        sent++;
      }
      await client.query('COMMIT'); // confirma lo que sí salió
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    return sent;
  }

  function start() {
    timer = setInterval(async () => {
      if (running) return;
      running = true;
      try {
        await relayOnce();
      } catch (err) {
        logger.error('falló el relay del outbox', { err });
      } finally {
        running = false;
      }
    }, intervalMs);
    timer.unref();
  }

  function stop() {
    if (timer) clearInterval(timer);
  }

  return { relayOnce, start, stop };
}

module.exports = { enqueueEvent, createOutboxRelay };
