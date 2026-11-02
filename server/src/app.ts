import cors from 'cors';
import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { createAuthRouter } from './routes/auth';
import { createMeRouter } from './routes/me';
import { createHabitsRouter } from './routes/habits';
import { createCompletionsRouter } from './routes/completions';

export type Db = Pick<PrismaClient, 'user' | 'habit' | 'completion'>;

export function createApp(db: Db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', createAuthRouter(db));
  app.use('/me', createMeRouter(db));
  app.use(createCompletionsRouter(db));
  app.use('/habits', createHabitsRouter(db));

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
