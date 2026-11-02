import { Router } from 'express';
import type { Db } from '../app';
import { requireAuth } from '../middleware/auth';
import { characterStats, levelForXp } from '../lib/gamification';

export function dateOf(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Recomputes XP from all of the user's completions and upserts the CharacterState row.
export async function syncCharacter(db: Db, userId: string) {
  const completions = await db.completion.findMany({
    where: { habit: { userId } },
    select: { points: true },
  });
  const xp = completions.reduce((sum, c) => sum + c.points, 0);
  const level = levelForXp(xp);
  await db.characterState.upsert({
    where: { userId },
    create: { userId, xp, level },
    update: { xp, level },
  });
}

export function createCharacterRouter(db: Db) {
  const router = Router();

  router.get('/character', requireAuth, async (_req, res) => {
    const userId: string = res.locals.userId;
    const [state, completions] = await Promise.all([
      db.characterState.findUnique({ where: { userId } }),
      db.completion.findMany({
        where: { habit: { userId } },
        select: { completedAt: true },
      }),
    ]);
    const dates = completions.map((c) => dateOf(c.completedAt));
    res.json({ character: characterStats(state?.xp ?? 0, dates, dateOf(new Date())) });
  });

  return router;
}
