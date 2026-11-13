import request from 'supertest';
import app from '../../src/app';
import { User } from '../../src/models/user.model';

type Role = 'user' | 'admin';

export const TEST_PASSWORD = 'password123';

// Gives every created user a different username.
let counter = 0;

// Creates a user directly in the database, like the seed script will.
// This is the only way to get an admin: the API never creates one.
export const createUser = async (role: Role = 'user', username = `${role}${++counter}`) =>
  User.create({ username, password: TEST_PASSWORD, role });

// Creates a user with the given role and logs in through the real API,
// so tests use exactly the same token a client would get.
export const getToken = async (role: Role = 'user') => {
  const user = await createUser(role);
  const res = await request(app)
    .post('/auth/login')
    .send({ username: user.username, password: TEST_PASSWORD });
  return { token: res.body.token as string, user };
};
