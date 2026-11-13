import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors';

interface Credentials {
  username: string;
  password: string;
}

// Takes only username and password from the input. Anything else (like role) is ignored.
const readCredentials = (input: Record<string, unknown>): Credentials => {
  const { username, password } = input;
  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new BadRequestError('username and password are required');
  }
  return { username, password };
};

// The same message for "no such user" and "wrong password",
// so the API doesn't reveal which usernames exist.
const invalidCredentials = () => new UnauthorizedError('Invalid username or password');

export const register = async (input: Record<string, unknown>) => {
  const { username, password } = readCredentials(input);

  // Same normalization as the model (trim + lowercase), so "Dana" finds "dana".
  if (await User.exists({ username: username.trim().toLowerCase() })) {
    throw new ConflictError('Username is already taken');
  }

  // role isn't passed, so the model's default ("user") is always used.
  return User.create({ username, password });
};

export const login = async (input: Record<string, unknown>): Promise<string> => {
  const { username, password } = readCredentials(input);

  const user = await User.findOne({ username: username.trim().toLowerCase() }).select(
    '+password',
  );
  // bcrypt hashes the given password the same way and compares it to the stored hash.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw invalidCredentials();
  }

  // sub ("subject") is the standard JWT field for who the token belongs to.
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
};
