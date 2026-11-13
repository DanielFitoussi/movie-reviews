import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../models/user.model';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

// The logged-in user, as read from the JWT.
export interface AuthUser {
  id: string;
  role: Role;
}

// Tells TypeScript that a Request can carry the logged-in user,
// which `authenticate` adds below.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Checks the "Authorization: Bearer <token>" header. If the token is valid,
// puts the user on req.user and continues; otherwise responds 401.
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const [scheme, token] = header?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  let payload: jwt.JwtPayload | string;
  try {
    // Throws if the signature is wrong (forged or a different secret) or the token has expired.
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  if (typeof payload === 'string' || !payload.sub) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
};

// Use after `authenticate`. Lets only admins through; responds 403 to anyone else.
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Admins only');
  }
  next();
};
