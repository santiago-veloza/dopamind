const { z } = require('zod');

const SESSION_TYPES = ['mindfulness', 'focus'];
const MAX_MINUTES = 720;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

const createSessionSchema = z.object({
  type: z.enum(SESSION_TYPES),
  duration_minutes: z.number().int().min(1).max(MAX_MINUTES),
  started_at: z.iso
    .datetime({ offset: true })
    .nullable()
    .optional()
    // se tolera un poco de desfase de reloj, pero no sesiones del futuro
    .refine((v) => !v || new Date(v).getTime() <= Date.now() + FUTURE_TOLERANCE_MS, 'started_at no puede ser futuro'),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const listQuerySchema = z.object({ type: z.enum(SESSION_TYPES).optional() });

module.exports = { createSessionSchema, idParamSchema, listQuerySchema };
