const { z } = require('zod');

const createEntrySchema = z.object({
  content: z.string().trim().min(1).max(10000),
  prompt: z.string().max(500).nullable().optional(),
  mood: z.number().int().min(1).max(5).default(3),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = { createEntrySchema, idParamSchema, listQuerySchema };
