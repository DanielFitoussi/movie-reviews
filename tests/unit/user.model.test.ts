import { User } from '../../src/models/user.model';

const validUser = () => ({ username: 'dana', password: 'password123' });

describe('User model', () => {
  it('accepts a valid user', async () => {
    await expect(new User(validUser()).validate()).resolves.toBeUndefined();
  });

  it('sets role to "user" by default', () => {
    expect(new User(validUser()).role).toBe('user');
  });

  it('accepts the "admin" role', async () => {
    await expect(new User({ ...validUser(), role: 'admin' }).validate()).resolves.toBeUndefined();
  });

  it('rejects an unknown role', async () => {
    const error = await new User({ ...validUser(), role: 'superuser' }).validate().catch((e) => e);

    expect(error?.errors.role).toBeDefined();
  });

  it('trims and lowercases the username', () => {
    expect(new User({ ...validUser(), username: '  Dana  ' }).username).toBe('dana');
  });

  it.each(['username', 'password'])('requires %s', async (field) => {
    const data: Record<string, unknown> = validUser();
    delete data[field];

    const error = await new User(data).validate().catch((e) => e);

    expect(error?.errors[field]).toBeDefined();
  });

  it('rejects a password shorter than 8 characters', async () => {
    const error = await new User({ ...validUser(), password: '1234567' }).validate().catch((e) => e);

    expect(error?.errors.password).toBeDefined();
  });

  it('never includes the password in JSON', () => {
    const json = new User(validUser()).toJSON();

    expect(json).not.toHaveProperty('password');
  });
});
