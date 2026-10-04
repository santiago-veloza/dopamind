const { required, int, readKeyFile } = require('@dopamind/common');

function loadConfig(env = process.env) {
  return {
    port: int('PORT', 3004, env),
    databaseUrl: required('DATABASE_URL', env),
    publicKey: readKeyFile('JWT_PUBLIC_KEY_PATH', env),
    rabbitUrl: required('RABBITMQ_URL', env),
    // zona para decidir qué es "un día" en las rachas
    timezone: env.STREAK_TIMEZONE || 'America/Bogota',
    logLevel: env.LOG_LEVEL || 'info',
  };
}

module.exports = { loadConfig };
