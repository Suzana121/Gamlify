import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Db } from '../app';
import { signToken } from '../lib/token';
import { publicUser } from '../lib/user';

const credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8),
});

export function createAuthRouter(db: Db) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }
    const { email, password } = parsed.data;
    if (await db.user.findUnique({ where: { email } })) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const user = await db.user.create({ data: { email, passwordHash } });
      res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      throw e;
    }
  });

  router.post('/login', async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email or password' });
      return;
    }
    const { email, password } = parsed.data;
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    res.status(200).json({ token: signToken(user.id), user: publicUser(user) });
  });

  return router;
}
