import request from 'supertest';
import { createApp, type Db } from '../src/app';

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(createApp({} as Db)).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
