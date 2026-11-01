import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../app';
import { requireAuth } from '../middleware/auth';
import { publicUser } from '../lib/user';

const patchBody = z.object({ displayName: z.string().trim().min(1).max(50) });

export function createMeRouter(db: Db) {
  const router = Router();
  router.use(requireAuth);

  router.get('/', async (_req, res) => {
    const user = await db.user.findUnique({ where: { id: res.locals.userId } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ user: publicUser(user) });
  });

  router.patch('/', async (req, res) => {
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid displayName' });
      return;
    }
    const existing = await db.user.findUnique({
      where: { id: res.locals.userId },
    });
    if (!existing) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await db.user.update({
      where: { id: existing.id },
      data: { displayName: parsed.data.displayName },
    });
    res.json({ user: publicUser(user) });
  });

  return router;
}
