import request from 'supertest';
import { createApp, type Db } from '../src/app';
import { signToken } from '../src/lib/token';

process.env.JWT_SECRET = 'test-secret';

interface C {
  id: string;
  habitId: string;
  completedAt: Date;
  points: number;
}

function makeDb() {
  const habits = [
    { id: 'h1', userId: 'alice' },
    { id: 'h2', userId: 'alice' },
    { id: 'hb', userId: 'bob' },
  ];
  const completions: C[] = [];
  const habit = {
    findFirst: jest.fn(
      async ({ where }: { where: { id: string; userId: string } }) =>
        habits.find((h) => h.id === where.id && h.userId === where.userId) ?? null,
    ),
  };
  const completion = {
    findFirst: jest.fn(
      async ({ where }: { where: { habitId: string; completedAt: Date } }) =>
        completions.find(
          (c) =>
            c.habitId === where.habitId && c.completedAt.getTime() === where.completedAt.getTime(),
        ) ?? null,
    ),
    create: jest.fn(async ({ data }: { data: Omit<C, 'id'> }) => {
      const c = { id: `c${completions.length + 1}`, ...data };
      completions.push(c);
      return c;
    }),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      completions.splice(
        completions.findIndex((c) => c.id === where.id),
        1,
      );
    }),
    findMany: jest.fn(
      async ({
        where,
      }: {
        where: { habit: { userId: string }; completedAt: { gte: Date; lt: Date } };
      }) =>
        completions
          .filter(
            (c) =>
              habits.find((h) => h.id === c.habitId)!.userId === where.habit.userId &&
              c.completedAt >= where.completedAt.gte &&
              c.completedAt < where.completedAt.lt,
          )
          .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime()),
    ),
  };
  return { db: { habit, completion } as unknown as Db, completions, completion };
}

const alice = { Authorization: `Bearer ${signToken('alice')}` };
const bob = { Authorization: `Bearer ${signToken('bob')}` };
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

describe('completions', () => {
  it('requires a token on every route', async () => {
    const app = createApp(makeDb().db);
    for (const [m, p] of [
      ['post', '/habits/h1/completions'],
      ['delete', '/habits/h1/completions/2026-01-01'],
      ['get', '/completions?from=2026-01-01&to=2026-01-02'],
    ] as const) {
      const res = await request(app)[m](p);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    }
  });

  it('creates a completion for a date at noon UTC with 10 points', async () => {
    const { db, completions } = makeDb();
    const res = await request(createApp(db))
      .post('/habits/h1/completions')
      .set(alice)
      .send({ date: '2026-03-05' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      completion: { id: 'c1', habitId: 'h1', date: '2026-03-05', points: 10 },
    });
    expect(completions[0].completedAt.toISOString()).toBe('2026-03-05T12:00:00.000Z');
  });

  it('defaults to today (UTC) when no body is sent', async () => {
    const res = await request(createApp(makeDb().db)).post('/habits/h1/completions').set(alice);
    expect(res.status).toBe(201);
    expect(res.body.completion.date).toBe(today);
  });

  it('returns 409 for a duplicate on the same date, but allows other habits/dates', async () => {
    const app = createApp(makeDb().db);
    const post = (id: string, date: string) =>
      request(app).post(`/habits/${id}/completions`).set(alice).send({ date });
    expect((await post('h1', '2026-03-05')).status).toBe(201);
    const dup = await post('h1', '2026-03-05');
    expect(dup.status).toBe(409);
    expect(dup.body).toEqual({ error: expect.any(String) });
    expect((await post('h2', '2026-03-05')).status).toBe(201);
    expect((await post('h1', '2026-03-06')).status).toBe(201);
  });

  it('returns 404 for missing or other users habits', async () => {
    const { db, completion } = makeDb();
    const app = createApp(db);
    expect((await request(app).post('/habits/hb/completions').set(alice)).status).toBe(404);
    expect((await request(app).post('/habits/nope/completions').set(alice)).status).toBe(404);
    expect(completion.create).not.toHaveBeenCalled();
  });

  it('returns 400 for bad or future dates', async () => {
    const { db, completion } = makeDb();
    const app = createApp(db);
    for (const date of ['2026-13-01', '2026-02-30', 'yesterday', '2026-3-5', 20260305, tomorrow]) {
      const res = await request(app).post('/habits/h1/completions').set(alice).send({ date });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String) });
    }
    expect(completion.create).not.toHaveBeenCalled();
  });

  it('deletes a completion, 404 if none or not the users habit', async () => {
    const { db, completions } = makeDb();
    const app = createApp(db);
    await request(app).post('/habits/h1/completions').set(alice).send({ date: '2026-03-05' });
    const del = (who: Record<string, string>, date: string) =>
      request(app).delete(`/habits/h1/completions/${date}`).set(who);
    expect((await del(bob, '2026-03-05')).status).toBe(404);
    expect((await del(alice, '2026-03-06')).status).toBe(404);
    expect((await del(alice, 'bad')).status).toBe(404);
    expect(completions).toHaveLength(1);
    expect((await del(alice, '2026-03-05')).status).toBe(204);
    expect(completions).toHaveLength(0);
    expect((await del(alice, '2026-03-05')).status).toBe(404);
  });

  it('lists own completions in range, inclusive, ordered by date', async () => {
    const app = createApp(makeDb().db);
    const post = (who: Record<string, string>, id: string, date: string) =>
      request(app).post(`/habits/${id}/completions`).set(who).send({ date });
    await post(alice, 'h1', '2026-03-07');
    await post(alice, 'h2', '2026-03-05');
    await post(alice, 'h1', '2026-03-05');
    await post(alice, 'h1', '2026-03-08');
    await post(bob, 'hb', '2026-03-06');

    const res = await request(app).get('/completions?from=2026-03-05&to=2026-03-07').set(alice);
    expect(res.status).toBe(200);
    expect(res.body.completions.map((c: { date: string }) => c.date)).toEqual([
      '2026-03-05',
      '2026-03-05',
      '2026-03-07',
    ]);
    expect(res.body.completions[0]).toEqual({
      id: expect.any(String),
      habitId: expect.any(String),
      date: '2026-03-05',
      points: 10,
    });
    const bobs = await request(app).get('/completions?from=2026-03-01&to=2026-03-31').set(bob);
    expect(bobs.body.completions).toHaveLength(1);
  });

  it('returns 400 for missing, invalid, reversed or too-long ranges', async () => {
    const app = createApp(makeDb().db);
    for (const q of [
      '',
      '?from=2026-03-01',
      '?to=2026-03-01',
      '?from=bad&to=2026-03-01',
      '?from=2026-03-05&to=2026-03-01',
      '?from=2025-01-01&to=2026-01-02',
    ]) {
      const res = await request(app).get(`/completions${q}`).set(alice);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String) });
    }
    // exactly 366 days inclusive is allowed
    const ok = await request(app).get('/completions?from=2024-01-01&to=2024-12-31').set(alice);
    expect(ok.status).toBe(200);
  });
});
