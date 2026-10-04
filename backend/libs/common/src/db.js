const { Pool } = require('pg');

function createPool(connectionString, logger, max = 10) {
  const pool = new Pool({ connectionString, max });
  // sin esto un error de un cliente inactivo tumba el proceso
  pool.on('error', (err) => logger.error('error en cliente inactivo de pg', { err }));
  return pool;
}

async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createPool, withTransaction };
