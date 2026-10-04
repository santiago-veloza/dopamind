const { z } = require('zod');

// bcrypt solo mira los primeros 72 bytes, por eso el tope
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const maxBytes = (v) => Buffer.byteLength(v, 'utf8') <= MAX_PASSWORD_BYTES;

const registerSchema = z.object({
  email,
  password: z.string().min(MIN_PASSWORD_LENGTH).refine(maxBytes, 'La contraseña es demasiado larga'),
  display_name: z.string().trim().min(1).max(60).optional(),
});

const loginSchema = z.object({
  email,
  password: z.string().min(1).refine(maxBytes, 'La contraseña es demasiado larga'),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

module.exports = { registerSchema, loginSchema, refreshSchema, MIN_PASSWORD_LENGTH };
