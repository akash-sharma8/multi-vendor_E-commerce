import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

const email = `test${Date.now()}@mail.com`;

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe('auth', () => {
  it('registers a user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email, password: 'Test@1234' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('blocks /me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});