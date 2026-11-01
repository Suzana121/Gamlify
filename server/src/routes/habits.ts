import { Router, type Response } from 'express';
import { z } from 'zod';
import type { Db } from '../app';
import { requireAuth } from '../middleware/auth';

export const FREQUENCIES = ['daily', 'weekly'] as const;

const fields = {
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  frequency: z.enum(FREQUENCIES),
  targetMinutes: z.number().int().positive().max(1440).nullable(),
};

const createBody = z.object({ ...fields, targetMinutes: fields.targetMinutes.optional() });
const patchBody = z
  .object(fields)
  .partial()
  .refine((v) => Object.keys(v).length > 0);

interface HabitRecord {
  id: string;
  name: string;
  category: string;
  frequency: string;
  targetMinutes: number | null;
  createdAt: Date;
}

function publicHabit(h: HabitRecord) {
  return {
    id: h.id,
    name: h.name,
    category: h.category,
    frequency: h.frequency,
    targetMinutes: h.targetMinutes,
    createdAt: h.createdAt,
  };
}

function notFound(res: Response) {
  res.status(404).json({ error: 'Habit not found' });
}

export function createHabitsRouter(db: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    const habits = await db.habit.findMany({
      where: { userId: res.locals.userId },
      orderBy: { createdAt: 'asc' },
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
      data: { ...parsed.data, userId: res.locals.userId },
    });
    res.status(201).json({ habit: publicHabit(habit) });
  });

  router.get('/:id', async (req, res) => {
    const habit = await db.habit.findFirst({
      where: { id: req.params.id, userId: res.locals.userId },
    });
    if (!habit) return notFound(res);
    res.json({ habit: publicHabit(habit) });
  });

  router.patch('/:id', async (req, res) => {
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid habit' });
      return;
    }
    const existing = await db.habit.findFirst({
      where: { id: req.params.id, userId: res.locals.userId },
    });
    if (!existing) return notFound(res);
    const habit = await db.habit.update({ where: { id: existing.id }, data: parsed.data });
    res.json({ habit: publicHabit(habit) });
  });

  router.delete('/:id', async (req, res) => {
    const existing = await db.habit.findFirst({
      where: { id: req.params.id, userId: res.locals.userId },
    });
    if (!existing) return notFound(res);
    await db.habit.delete({ where: { id: existing.id } });
    res.status(204).end();
  });

  return router;
}
