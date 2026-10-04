const { z } = require('zod');

const PRIORITIES = ['high', 'medium', 'low'];

const keywords = z.array(z.string().trim().min(1).max(50)).max(30);
const hour = z.number().int().min(0).max(23).nullable();
const minute = z.number().int().min(0).max(59).nullable();
const dateTime = z.iso.datetime({ offset: true }).nullable();

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(PRIORITIES).default('medium'),
  category: z.string().trim().min(1).max(40).default('general'),
  scheduled_hour: hour.optional(),
  scheduled_minute: minute.optional(),
  due_date: dateTime.optional(),
  verification_keywords: keywords.optional(),
});

// completed_at no se acepta: lo pone el servidor al completar
const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).nullable(),
    priority: z.enum(PRIORITIES),
    category: z.string().trim().min(1).max(40),
    completed: z.boolean(),
    photo_verified: z.boolean(),
    photo_path: z.string().max(500).nullable(),
    scheduled_hour: hour,
    scheduled_minute: minute,
    due_date: dateTime,
    verification_keywords: keywords,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'No hay nada que actualizar');

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const listQuerySchema = z.object({
  completed: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  priority: z.enum(PRIORITIES).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = { createTaskSchema, updateTaskSchema, idParamSchema, listQuerySchema };
