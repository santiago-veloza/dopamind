const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { ALGORITHM, TOKEN_USE, AUDIENCE, ISSUER } = require('@dopamind/common');

// El access lleva audience "api" y el refresh "auth": el refresh no sirve para llamar a otros servicios
function createTokenService({ privateKey, publicKey, accessTtlSeconds, refreshTtlSeconds }) {
  function signAccess(userId) {
    return jwt.sign({ token_use: TOKEN_USE.ACCESS }, privateKey, {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      audience: AUDIENCE.API,
      subject: String(userId),
      expiresIn: accessTtlSeconds,
    });
  }

  function signRefresh(userId) {
    const jti = crypto.randomUUID();
    const token = jwt.sign({ token_use: TOKEN_USE.REFRESH }, privateKey, {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      audience: AUDIENCE.AUTH,
      subject: String(userId),
      expiresIn: refreshTtlSeconds,
      jwtid: jti,
    });
    const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
    return { token, jti, expiresAt };
  }

  // Devuelve los claims o null si el refresh no es válido
  function verifyRefresh(token) {
    try {
      const claims = jwt.verify(token, publicKey, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        audience: AUDIENCE.AUTH,
      });
      if (claims.token_use !== TOKEN_USE.REFRESH || !claims.jti) return null;
      return claims;
    } catch {
      return null;
    }
  }

  return { signAccess, signRefresh, verifyRefresh };
}

module.exports = { createTokenService };
