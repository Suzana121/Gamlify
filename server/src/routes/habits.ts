import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../app';
import { requireAuth } from '../middleware/auth';

const fields = {
  name: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(30),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  targetMinutes: z.number().int().min(1).max(1440).nullable(),
};

const createBody = z.object({
  name: fields.name,
  category: fields.category.default('general'),
  frequency: fields.frequency,
  targetMinutes: fields.targetMinutes.optional(),
});

const patchBody = z
  .object({
    name: fields.name,
    category: fields.category,
    frequency: fields.frequency,
    targetMinutes: fields.targetMinutes,
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0);

interface HabitRow {
  id: string;
  name: string;
  category: string;
  frequency: string;
  targetMinutes: number | null;
  createdAt: Date;
}

function publicHabit(h: HabitRow) {
  return {
    id: h.id,
    name: h.name,
    category: h.category,
    frequency: h.frequency,
    targetMinutes: h.targetMinutes,
    createdAt: h.createdAt,
  };
}

export function createHabitsRouter(db: Db) {
  const router = Router();
  router.use(requireAuth);

  const findOwned = (id: string, userId: string) =>
    db.habit.findFirst({ where: { id, userId, archivedAt: null } });

  router.get('/', async (_req, res) => {
    const habits = await db.habit.findMany({
      where: { userId: res.locals.userId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ habits: habits.map(publicHabit) });
  });

  router.post('/', async (req, res) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid habit' });
      return;
    }
    const habit = await db.habit.create({
      data: {
        ...parsed.data,
        targetMinutes: parsed.data.targetMinutes ?? null,
        userId: res.locals.userId,
      },
    });
    res.status(201).json({ habit: publicHabit(habit) });
  });

  router.patch('/:id', async (req, res) => {
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid habit' });
      return;
    }
    const existing = await findOwned(req.params.id, res.locals.userId);
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    const habit = await db.habit.update({ where: { id: existing.id }, data: parsed.data });
    res.json({ habit: publicHabit(habit) });
  });

  router.delete('/:id', async (req, res) => {
    const existing = await findOwned(req.params.id, res.locals.userId);
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    await db.habit.update({ where: { id: existing.id }, data: { archivedAt: new Date() } });
    res.status(204).end();
  });

  return router;
}
