import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin } from '../../src/middleware/auth.middleware';
import { ForbiddenError, UnauthorizedError } from '../../src/utils/errors';

const SECRET = process.env.JWT_SECRET!; // set in tests/setup/env.ts
const userId = '64b7f0000000000000000001';

// A fake request with only the Authorization header.
const requestWith = (authorization?: string) =>
  ({ headers: authorization === undefined ? {} : { authorization } }) as Request;

const run = (middleware: typeof authenticate, req: Request) => {
  const next = jest.fn() as jest.MockedFunction<NextFunction>;
  middleware(req, {} as Response, next);
  return next;
};

describe('authenticate', () => {
  it('sets req.user and calls next() for a valid token', () => {
    const token = jwt.sign({ sub: userId, role: 'admin' }, SECRET);
    const req = requestWith(`Bearer ${token}`);

    const next = run(authenticate, req);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: userId, role: 'admin' });
  });

  it.each([
    ['there is no Authorization header', undefined],
    ['the header is not "Bearer <token>"', 'Basic abc'],
    ['the token is missing after Bearer', 'Bearer '],
    ['the token is not a JWT', 'Bearer not-a-token'],
    ['the token was signed with another secret', `Bearer ${jwt.sign({ sub: userId, role: 'user' }, 'other-secret')}`],
    ['the token has expired', `Bearer ${jwt.sign({ sub: userId, role: 'user' }, SECRET, { expiresIn: -10 })}`],
  ])('throws UnauthorizedError when %s', (_case, header) => {
    expect(() => run(authenticate, requestWith(header))).toThrow(UnauthorizedError);
  });
});

describe('requireAdmin', () => {
  const requestAs = (role: string) => ({ user: { id: userId, role } }) as Request;

  it('calls next() for an admin', () => {
    const next = run(requireAdmin, requestAs('admin'));

    expect(next).toHaveBeenCalledWith();
  });

  it('throws ForbiddenError for a regular user', () => {
    expect(() => run(requireAdmin, requestAs('user'))).toThrow(ForbiddenError);
  });

  it('throws UnauthorizedError when authenticate did not run', () => {
    expect(() => run(requireAdmin, {} as Request)).toThrow(UnauthorizedError);
  });
});
