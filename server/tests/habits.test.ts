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
  archivedAt: Date | null;
}

function makeDb() {
  const habits: H[] = [];
  const habit = {
    findMany: jest.fn(async ({ where }: { where: { userId: string; archivedAt: null } }) =>
      habits
        .filter((h) => h.userId === where.userId && h.archivedAt === null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    ),
    findFirst: jest.fn(
      async ({ where }: { where: { id: string; userId: string; archivedAt: null } }) =>
        habits.find(
          (h) => h.id === where.id && h.userId === where.userId && h.archivedAt === null,
        ) ?? null,
    ),
    create: jest.fn(async ({ data }: { data: Omit<H, 'id' | 'createdAt' | 'archivedAt'> }) => {
      const h = {
        id: `h${habits.length + 1}`,
        createdAt: new Date(2026, 0, habits.length + 1),
        archivedAt: null,
        ...data,
      };
      habits.push(h);
      return h;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<H> }) => {
      const h = habits.find((x) => x.id === where.id)!;
      Object.assign(h, data);
      return h;
    }),
  };
  return { db: { habit } as unknown as Db, habits };
}

const alice = `Bearer ${signToken('alice')}`;
const bob = `Bearer ${signToken('bob')}`;
const valid = { name: 'Read', category: 'mind', frequency: 'daily', targetMinutes: 20 };

describe('habits', () => {
  it('requires auth on every route', async () => {
    const app = createApp(makeDb().db);
    expect((await request(app).get('/habits')).status).toBe(401);
    expect((await request(app).post('/habits').send(valid)).status).toBe(401);
    expect((await request(app).patch('/habits/h1').send({ name: 'x' })).status).toBe(401);
    const del = await request(app).delete('/habits/h1').set('Authorization', 'Bearer bad');
    expect(del.status).toBe(401);
    expect(del.body.error).toEqual(expect.any(String));
  });

  it('creates a habit with defaults', async () => {
    const app = createApp(makeDb().db);
    const res = await request(app)
      .post('/habits')
      .set('Authorization', alice)
      .send({ name: ' Run ', frequency: 'weekly' });
    expect(res.status).toBe(201);
    expect(res.body.habit).toEqual({
      id: 'h1',
      name: 'Run',
      category: 'general',
      frequency: 'weekly',
      targetMinutes: null,
      createdAt: expect.any(String),
    });
  });

  it('lists own non-archived habits, newest first', async () => {
    const app = createApp(makeDb().db);
    const a = await request(app).post('/habits').set('Authorization', alice).send(valid);
    await request(app)
      .post('/habits')
      .set('Authorization', alice)
      .send({ ...valid, name: 'Second' });
    await request(app)
      .post('/habits')
      .set('Authorization', alice)
      .send({ ...valid, name: 'Third' });
    await request(app).post('/habits').set('Authorization', bob).send(valid);
    await request(app).delete(`/habits/${a.body.habit.id}`).set('Authorization', alice);
    const res = await request(app).get('/habits').set('Authorization', alice);
    expect(res.status).toBe(200);
    expect(res.body.habits.map((h: { name: string }) => h.name)).toEqual(['Third', 'Second']);
  });

  it('patches a subset of fields, including null targetMinutes', async () => {
    const app = createApp(makeDb().db);
    const c = await request(app).post('/habits').set('Authorization', alice).send(valid);
    const res = await request(app)
      .patch(`/habits/${c.body.habit.id}`)
      .set('Authorization', alice)
      .send({ name: 'Write', targetMinutes: null });
    expect(res.status).toBe(200);
    expect(res.body.habit).toMatchObject({ name: 'Write', targetMinutes: null, category: 'mind' });
  });

  it('soft-deletes with 204 and then 404s', async () => {
    const { db, habits } = makeDb();
    const app = createApp(db);
    const c = await request(app).post('/habits').set('Authorization', alice).send(valid);
    const id = c.body.habit.id;
    const del = await request(app).delete(`/habits/${id}`).set('Authorization', alice);
    expect(del.status).toBe(204);
    expect(habits[0].archivedAt).toBeInstanceOf(Date);
    const again = await request(app).delete(`/habits/${id}`).set('Authorization', alice);
    expect(again.status).toBe(404);
    const patch = await request(app)
      .patch(`/habits/${id}`)
      .set('Authorization', alice)
      .send({ name: 'x' });
    expect(patch.status).toBe(404);
  });

  it("returns 404 for other users' habits", async () => {
    const { db, habits } = makeDb();
    const app = createApp(db);
    const c = await request(app).post('/habits').set('Authorization', alice).send(valid);
    const id = c.body.habit.id;
    const patch = await request(app)
      .patch(`/habits/${id}`)
      .set('Authorization', bob)
      .send({ name: 'hacked' });
    expect(patch.status).toBe(404);
    expect(patch.body.error).toEqual(expect.any(String));
    const del = await request(app).delete(`/habits/${id}`).set('Authorization', bob);
    expect(del.status).toBe(404);
    expect(habits[0]).toMatchObject({ name: 'Read', archivedAt: null });
  });

  it('validates input with 400', async () => {
    const app = createApp(makeDb().db);
    const bads = [
      {},
      { ...valid, name: '' },
      { ...valid, name: 'x'.repeat(61) },
      { ...valid, category: 'c'.repeat(31) },
      { ...valid, category: '' },
      { ...valid, frequency: 'monthly' },
      { ...valid, targetMinutes: 0 },
      { ...valid, targetMinutes: 1441 },
      { ...valid, targetMinutes: 1.5 },
    ];
    for (const body of bads) {
      const res = await request(app).post('/habits').set('Authorization', alice).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toEqual(expect.any(String));
    }
    const c = await request(app).post('/habits').set('Authorization', alice).send(valid);
    for (const body of [{}, { frequency: 'nope' }, { name: '' }, { targetMinutes: 'x' }]) {
      const res = await request(app)
        .patch(`/habits/${c.body.habit.id}`)
        .set('Authorization', alice)
        .send(body);
      expect(res.status).toBe(400);
    }
  });
});
