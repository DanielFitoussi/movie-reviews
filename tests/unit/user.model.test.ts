import { User } from '../../src/models/user.model';

const validUser = () => ({ username: 'dana', password: 'password123' });

describe('User model', () => {
  it('accepts a valid user', () => {
    expect(new User(validUser()).validateSync()).toBeUndefined();
  });

  it('sets role to "user" by default', () => {
    expect(new User(validUser()).role).toBe('user');
  });

  it('accepts the "admin" role', () => {
    expect(new User({ ...validUser(), role: 'admin' }).validateSync()).toBeUndefined();
  });

  it('rejects an unknown role', () => {
    const error = new User({ ...validUser(), role: 'superuser' }).validateSync();

    expect(error?.errors.role).toBeDefined();
  });

  it('trims and lowercases the username', () => {
    expect(new User({ ...validUser(), username: '  Dana  ' }).username).toBe('dana');
  });

  it.each(['username', 'password'])('requires %s', (field) => {
    const data: Record<string, unknown> = validUser();
    delete data[field];

    const error = new User(data).validateSync();

    expect(error?.errors[field]).toBeDefined();
  });

  it('rejects a password shorter than 8 characters', () => {
    const error = new User({ ...validUser(), password: '1234567' }).validateSync();

    expect(error?.errors.password).toBeDefined();
  });

  it('never includes the password in JSON', () => {
    const json = new User(validUser()).toJSON();

    expect(json).not.toHaveProperty('password');
  });
});
