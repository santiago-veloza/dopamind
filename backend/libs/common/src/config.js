const fs = require('node:fs');

// Falla al arrancar si falta algo, mejor que seguir con un valor por defecto inseguro
function required(name, env = process.env) {
  const value = env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function int(name, fallback, env = process.env) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`${name} debe ser un entero`);
  return n;
}

// Las llaves JWT llegan como archivo montado, no dentro del código
function readKeyFile(pathVar, env = process.env) {
  return fs.readFileSync(required(pathVar, env), 'utf8');
}

module.exports = { required, int, readKeyFile };
