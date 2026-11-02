import { Router } from 'express';
import type { Db } from '../app';
import { requireAuth } from '../middleware/auth';

export const POINTS_PER_COMPLETION = 10;
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

// Parses a strict 'YYYY-MM-DD' string into a UTC midnight Date, or null if invalid.
function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

function dateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function noonOf(day: Date) {
  return new Date(day.getTime() + 12 * 60 * 60 * 1000);
}

interface CompletionRecord {
  id: string;
  habitId: string;
  completedAt: Date;
  points: number;
}

function publicCompletion(c: CompletionRecord) {
  return { id: c.id, habitId: c.habitId, date: dateString(c.completedAt), points: c.points };
}

export function createCompletionsRouter(db: Db) {
  const router = Router();

  router.post('/habits/:id/completions', requireAuth, async (req, res) => {
    const raw = (req.body as { date?: unknown } | undefined)?.date;
    const today = parseDate(dateString(new Date()))!;
    const day = raw === undefined ? today : parseDate(raw);
    if (!day || day.getTime() > today.getTime()) {
      res.status(400).json({ error: 'Invalid date' });
      return;
    }
    const habit = await db.habit.findFirst({
      where: { id: String(req.params.id), userId: res.locals.userId },
    });
    if (!habit) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }
    const completedAt = noonOf(day);
    const existing = await db.completion.findFirst({ where: { habitId: habit.id, completedAt } });
    if (existing) {
      res.status(409).json({ error: 'Already completed on this date' });
      return;
    }
    const completion = await db.completion.create({
      data: { habitId: habit.id, completedAt, points: POINTS_PER_COMPLETION },
    });
    res.status(201).json({ completion: publicCompletion(completion) });
  });

  router.delete('/habits/:id/completions/:date', requireAuth, async (req, res) => {
    const day = parseDate(String(req.params.date));
    const habit = day
      ? await db.habit.findFirst({
          where: { id: String(req.params.id), userId: res.locals.userId },
        })
      : null;
    const existing =
      day && habit
        ? await db.completion.findFirst({
            where: { habitId: habit.id, completedAt: noonOf(day) },
          })
        : null;
    if (!existing) {
      res.status(404).json({ error: 'Completion not found' });
      return;
    }
    await db.completion.delete({ where: { id: existing.id } });
    res.status(204).end();
  });

  router.get('/completions', requireAuth, async (req, res) => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (!from || !to || to.getTime() < from.getTime()) {
      res.status(400).json({ error: 'Invalid date range' });
      return;
    }
    if ((to.getTime() - from.getTime()) / DAY_MS + 1 > MAX_RANGE_DAYS) {
      res.status(400).json({ error: `Range must not exceed ${MAX_RANGE_DAYS} days` });
      return;
    }
    const completions = await db.completion.findMany({
      where: {
        habit: { userId: res.locals.userId },
        completedAt: { gte: from, lt: new Date(to.getTime() + DAY_MS) },
      },
      orderBy: { completedAt: 'asc' },
    });
    res.json({ completions: completions.map(publicCompletion) });
  });

  return router;
}
