import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/user.model';
import * as authService from '../../src/services/auth.service';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../src/utils/errors';
import { useTestDatabase } from '../setup/db';

useTestDatabase();

const credentials = { username: 'dana', password: 'password123' };

describe('auth.service', () => {
  describe('register', () => {
    it('saves the user with a hashed password', async () => {
      await authService.register(credentials);

      const saved = await User.findOne({ username: 'dana' }).select('+password');
      expect(saved).not.toBeNull();
      expect(saved!.password).not.toBe('password123');
      expect(await bcrypt.compare('password123', saved!.password)).toBe(true);
    });

    it('always sets role to "user", even if the input says admin', async () => {
      const user = await authService.register({ ...credentials, role: 'admin' });

      expect(user.role).toBe('user');
    });

    it('throws ConflictError when the username is taken', async () => {
      await authService.register(credentials);

      await expect(authService.register(credentials)).rejects.toThrow(ConflictError);
    });

    it('treats usernames that differ only in case as the same', async () => {
      await authService.register(credentials);

      await expect(
        authService.register({ ...credentials, username: 'DANA' }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects a password shorter than 8 characters', async () => {
      await expect(
        authService.register({ ...credentials, password: 'short' }),
      ).rejects.toThrow(/password/);
    });

    it.each([
      ['username is missing', { password: 'password123' }],
      ['password is missing', { username: 'dana' }],
      ['username is not a string', { username: 123, password: 'password123' }],
    ])('throws BadRequestError when %s', async (_case, input) => {
      await expect(authService.register(input)).rejects.toThrow(BadRequestError);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await User.create({ ...credentials, role: 'admin' });
    });

    it('returns a token with the user id and role', async () => {
      const token = await authService.login(credentials);

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
      const user = await User.findOne({ username: 'dana' });
      expect(payload.sub).toBe(user!.id);
      expect(payload.role).toBe('admin');
    });

    it('accepts the username in any case', async () => {
      await expect(authService.login({ ...credentials, username: 'Dana' })).resolves.toEqual(
        expect.any(String),
      );
    });

    it('throws UnauthorizedError for a wrong password', async () => {
      await expect(
        authService.login({ ...credentials, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError for an unknown username', async () => {
      await expect(
        authService.login({ ...credentials, username: 'nobody' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws BadRequestError when the password is missing', async () => {
      await expect(authService.login({ username: 'dana' })).rejects.toThrow(BadRequestError);
    });
  });
});
