import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/models/user.model';
import { useTestDatabase } from '../setup/db';

useTestDatabase();

const credentials = { username: 'dana', password: 'password123' };

describe('Auth API', () => {
  describe('POST /auth/register', () => {
    it('returns 201 and the user, without the password', async () => {
      const res = await request(app).post('/auth/register').send(credentials);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(String), username: 'dana', role: 'user' });
      expect(await User.countDocuments()).toBe(1);
    });

    it('ignores a role sent in the body', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ ...credentials, role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('user');
    });

    it('returns 400 when a field is missing', async () => {
      const res = await request(app).post('/auth/register').send({ username: 'dana' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when the password is too short', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ ...credentials, password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.details).toHaveProperty('password');
    });

    it('returns 409 when the username is taken', async () => {
      await request(app).post('/auth/register').send(credentials);

      const res = await request(app)
        .post('/auth/register')
        .send({ ...credentials, username: 'Dana' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send(credentials);
    });

    it('returns 200 and a token', async () => {
      const res = await request(app).post('/auth/login').send(credentials);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ token: expect.any(String) });
    });

    it('returns 401 for a wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ ...credentials, password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid username or password' });
    });

    it('returns 401 for an unknown username', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ ...credentials, username: 'nobody' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid username or password' });
    });

    it('returns 400 when a field is missing', async () => {
      const res = await request(app).post('/auth/login').send({ username: 'dana' });

      expect(res.status).toBe(400);
    });
  });
});
