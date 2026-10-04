const { required, int, readKeyFile } = require('@dopamind/common');

function loadConfig(env = process.env) {
  return {
    port: int('PORT', 3001, env),
    databaseUrl: required('DATABASE_URL', env),
    privateKey: readKeyFile('JWT_PRIVATE_KEY_PATH', env),
    publicKey: readKeyFile('JWT_PUBLIC_KEY_PATH', env),
    bcryptRounds: int('BCRYPT_ROUNDS', 12, env),
    logLevel: env.LOG_LEVEL || 'info',
  };
}

module.exports = { loadConfig };
