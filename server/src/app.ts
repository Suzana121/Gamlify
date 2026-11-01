import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { createAuthRouter } from './routes/auth';
import { createMeRouter } from './routes/me';

export type Db = Pick<PrismaClient, 'user'>;

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', createAuthRouter(db));
  app.use('/me', createMeRouter(db));

  // Express identifies error handlers by their 4-argument signature.
  /* eslint-disable @typescript-eslint/no-unused-vars */
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status: unknown }).status)
          : 500;
      if (status === 400) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  return app;
}
