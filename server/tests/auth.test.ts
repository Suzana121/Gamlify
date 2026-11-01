import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp, type Db } from '../src/app';

process.env.JWT_SECRET = 'test-secret';

interface U {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
}

function makeDb() {
  const users: U[] = [];
  const user = {
    findUnique: jest.fn(
      async ({ where }: { where: { id?: string; email?: string } }) =>
        users.find((u) => u.id === where.id || u.email === where.email) ?? null,
    ),
    create: jest.fn(async ({ data }: { data: { email: string; passwordHash: string } }) => {
      const u = { id: `id${users.length + 1}`, displayName: null, ...data };
      users.push(u);
      return u;
    }),
    update: jest.fn(
      async ({ where, data }: { where: { id: string }; data: { displayName: string } }) => {
        const u = users.find((x) => x.id === where.id)!;
        Object.assign(u, data);
        return u;
      },
    ),
  };
  return { db: { user } as unknown as Db, users };
}

const creds = { email: 'a@example.com', password: 'password123' };

describe('auth + profile', () => {
  it('registers a user', async () => {
    const { db, users } = makeDb();
    const res = await request(createApp(db)).post('/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: 'id1',
      email: 'a@example.com',
      displayName: null,
    });
    expect(users[0].passwordHash).not.toBe(creds.password);
  });

  it('rejects invalid input with 400', async () => {
    const { db } = makeDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'a@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    const bad = await request(app)
      .post('/auth/register')
      .send({ email: 'nope', password: 'password123' });
    expect(bad.status).toBe(400);
  });

  it('rejects duplicate email with 409', async () => {
    const { db } = makeDb();
    const app = createApp(db);
    await request(app).post('/auth/register').send(creds);
    const res = await request(app).post('/auth/register').send(creds);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it('logs in with valid credentials', async () => {
    const { db, users } = makeDb();
    users.push({
      id: 'u9',
      email: creds.email,
      passwordHash: await bcrypt.hash(creds.password, 4),
      displayName: 'Ann',
    });
    const res = await request(createApp(db)).post('/auth/login').send(creds);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 'u9',
      email: creds.email,
      displayName: 'Ann',
    });
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects bad password and unknown user with 401', async () => {
    const { db, users } = makeDb();
    users.push({
      id: 'u9',
      email: creds.email,
      passwordHash: await bcrypt.hash(creds.password, 4),
      displayName: null,
    });
    const app = createApp(db);
    const bad = await request(app)
      .post('/auth/login')
      .send({ ...creds, password: 'wrongpassword' });
    expect(bad.status).toBe(401);
    const unknown = await request(app)
      .post('/auth/login')
      .send({ email: 'x@example.com', password: 'password123' });
    expect(unknown.status).toBe(401);
  });

  it('GET /me requires a valid token', async () => {
    const { db } = makeDb();
    const app = createApp(db);
    expect((await request(app).get('/me')).status).toBe(401);
    const res = await request(app).get('/me').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it('GET /me and PATCH /me work with a token', async () => {
    const { db } = makeDb();
    const app = createApp(db);
    const reg = await request(app).post('/auth/register').send(creds);
    const auth = `Bearer ${reg.body.token}`;
    const me = await request(app).get('/me').set('Authorization', auth);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(creds.email);
    const patched = await request(app)
      .patch('/me')
      .set('Authorization', auth)
      .send({ displayName: 'Ann' });
    expect(patched.status).toBe(200);
    expect(patched.body.user.displayName).toBe('Ann');
    const invalid = await request(app).patch('/me').set('Authorization', auth).send({});
    expect(invalid.status).toBe(400);
    const noAuth = await request(app).patch('/me').send({ displayName: 'x' });
    expect(noAuth.status).toBe(401);
  });
});
