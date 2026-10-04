const { z } = require('zod');
const { POINTS } = require('./catalog');

const id = z.number().int().positive();

// Cada evento dice qué puntos da y qué logros avanza
const EVENTS = {
  'task.completed': {
    schema: z.object({ eventId: z.string().min(1), taskId: id, userId: id, photoVerified: z.boolean().default(false) }),
    apply: (e) => ({
      points: POINTS.TASK + (e.photoVerified ? POINTS.PHOTO : 0),
      increments: ['first_task', 'tasks_50', ...(e.photoVerified ? ['photo_verify'] : [])],
    }),
  },
  'journal.created': {
    schema: z.object({ eventId: z.string().min(1), entryId: id, userId: id }),
    apply: () => ({ points: POINTS.JOURNAL, increments: ['journal_1', 'journal_7'] }),
  },
  'focus.completed': {
    schema: z.object({
      eventId: z.string().min(1), sessionId: id, userId: id,
      type: z.enum(['focus', 'mindfulness']), durationMinutes: z.number().int().min(1).max(720),
    }),
    apply: (e) =>
      e.type === 'focus'
        ? { points: e.durationMinutes * POINTS.FOCUS_PER_MINUTE, increments: ['focus_1', 'focus_10'] }
        : { points: e.durationMinutes * POINTS.MINDFULNESS_PER_MINUTE, increments: ['mindful_1', 'mindful_10'] },
  },
};

module.exports = { EVENTS };
