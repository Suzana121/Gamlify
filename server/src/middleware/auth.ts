import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/token';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  const userId = match ? verifyToken(match[1]) : null;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.locals.userId = userId;
  next();
}
