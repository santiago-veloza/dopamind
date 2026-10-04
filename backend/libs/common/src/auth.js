const jwt = require('jsonwebtoken');

const ALGORITHM = 'RS256';
const TOKEN_USE = { ACCESS: 'access', REFRESH: 'refresh' };
const AUDIENCE = { API: 'dopamind-api', AUTH: 'dopamind-auth' };
const ISSUER = 'dopamind-auth';

// Verifica solo con la llave pública: ningún servicio salvo auth puede firmar tokens
function createAccessVerifier({ publicKey, issuer = ISSUER, audience = AUDIENCE.API }) {
  return function verifyAccessToken(token) {
    const payload = jwt.verify(token, publicKey, { algorithms: [ALGORITHM], issuer, audience });
    if (payload.token_use !== TOKEN_USE.ACCESS) throw new Error('el token no es de acceso');
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error('sub inválido');
    return { userId, payload };
  };
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function createRequireAuth(verifyAccessToken) {
  return (req, res, next) => {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
      req.userId = verifyAccessToken(token).userId;
      next();
    } catch {
      res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
}

module.exports = { ALGORITHM, TOKEN_USE, AUDIENCE, ISSUER, createAccessVerifier, createRequireAuth, bearerToken };
