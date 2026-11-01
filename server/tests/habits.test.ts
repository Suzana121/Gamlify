import request from 'supertest';
import { createApp, type Db } from '../src/app';
import { signToken } from '../src/lib/token';

process.env.JWT_SECRET = 'test-secret';

interface H {
  id: string;
  userId: string;
  name: string;
  category: string;
  frequency: string;
  targetMinutes: number | null;
  createdAt: Date;
}

type Where = { id?: string; userId?: string };

function makeDb() {
  const habits: H[] = [];
  const match = (where: Where) => (h: H) =>
    (where.id === undefined || h.id === where.id) &&
    (where.userId === undefined || h.userId === where.userId);
  const habit = {
    findMany: jest.fn(async ({ where }: { where: Where }) => habits.filter(match(where))),
    findFirst: jest.fn(async ({ where }: { where: Where }) => habits.find(match(where)) ?? null),
    create: jest.fn(async ({ data }: { data: Partial<H> }) => {
      const h = {
        id: `h${habits.length + 1}`,
        createdAt: new Date(0),
        targetMinutes: null,
        ...data,
      } as H;
      habits.push(h);
      return h;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<H> }) => {
      const h = habits.find((x) => x.id === where.id)!;
      Object.assign(h, data);
      return h;
    }),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      habits.splice(
        habits.findIndex((x) => x.id === where.id),
        1,
      );
    }),
  };
  return { db: { habit } as unknown as Db, habits, habit };
}

const alice = { Authorization: `Bearer ${signToken('alice')}` };
const bob = { Authorization: `Bearer ${signToken('bob')}` };
const valid = { name: 'Read', category: 'Learning', frequency: 'daily', targetMinutes: 30 };

describe('habits', () => {
  it('requires a token on every route', async () => {
    const app = createApp(makeDb().db);
    for (const [m, p] of [
      ['get', '/habits'],
      ['post', '/habits'],
      ['get', '/habits/x'],
      ['patch', '/habits/x'],
      ['delete', '/habits/x'],
    ] as const) {
      const res = await request(app)[m](p);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    }
  });

  it('creates and lists only own habits', async () => {
    const app = createApp(makeDb().db);
    const created = await request(app).post('/habits').set(alice).send(valid);
    expect(created.status).toBe(201);
    expect(created.body.habit).toMatchObject({ id: 'h1', ...valid });
    expect(created.body.habit.userId).toBeUndefined();

    const mine = await request(app).get('/habits').set(alice);
    expect(mine.body.habits).toHaveLength(1);
    const theirs = await request(app).get('/habits').set(bob);
    expect(theirs.body.habits).toEqual([]);
  });

  it('defaults targetMinutes to null', async () => {
    const app = createApp(makeDb().db);
    const body = { name: 'Read', category: 'Learning', frequency: 'daily' };
    const res = await request(app).post('/habits').set(alice).send(body);
    expect(res.status).toBe(201);
    expect(res.body.habit.targetMinutes).toBeNull();
  });

  it('rejects invalid input with 400', async () => {
    const { db, habit } = makeDb();
    const app = createApp(db);
    for (const body of [
      {},
      { ...valid, name: '  ' },
      { ...valid, frequency: 'hourly' },
      { ...valid, targetMinutes: -5 },
      { ...valid, targetMinutes: 1.5 },
      { ...valid, category: 5 },
    ]) {
      const res = await request(app).post('/habits').set(alice).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toEqual(expect.any(String));
    }
    expect(habit.create).not.toHaveBeenCalled();
  });

  it('gets one habit, 404 for missing or other users', async () => {
    const app = createApp(makeDb().db);
    await request(app).post('/habits').set(alice).send(valid);
    expect((await request(app).get('/habits/h1').set(alice)).body.habit.name).toBe('Read');
    expect((await request(app).get('/habits/h1').set(bob)).status).toBe(404);
    const missing = await request(app).get('/habits/nope').set(alice);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: expect.any(String) });
  });

  it('patches partially, validates, and scopes to owner', async () => {
    const { db, habit } = makeDb();
    const app = createApp(db);
    await request(app).post('/habits').set(alice).send(valid);

    const ok = await request(app)
      .patch('/habits/h1')
      .set(alice)
      .send({ name: 'Study', targetMinutes: null });
    expect(ok.status).toBe(200);
    expect(ok.body.habit).toMatchObject({
      name: 'Study',
      category: 'Learning',
      targetMinutes: null,
    });

    const empty = await request(app).patch('/habits/h1').set(alice).send({});
    expect(empty.status).toBe(400);
    const bad = await request(app).patch('/habits/h1').set(alice).send({ frequency: 'x' });
    expect(bad.status).toBe(400);
    const other = await request(app).patch('/habits/h1').set(bob).send({ name: 'Hax' });
    expect(other.status).toBe(404);
    expect(habit.update).toHaveBeenCalledTimes(1);
  });

  it('deletes own habit only', async () => {
    const { db, habits } = makeDb();
    const app = createApp(db);
    await request(app).post('/habits').set(alice).send(valid);
    expect((await request(app).delete('/habits/h1').set(bob)).status).toBe(404);
    expect(habits).toHaveLength(1);
    expect((await request(app).delete('/habits/h1').set(alice)).status).toBe(204);
    expect(habits).toHaveLength(0);
    expect((await request(app).delete('/habits/h1').set(alice)).status).toBe(404);
  });
});
