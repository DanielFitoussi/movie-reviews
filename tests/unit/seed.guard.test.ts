import { assertSeedAllowed } from '../../src/scripts/seed';

// The seed deletes every user, movie and review, so it must not run
// on a production database by accident.
describe('assertSeedAllowed', () => {
  it('refuses to run when NODE_ENV is production', () => {
    expect(() => assertSeedAllowed('production', [])).toThrow(/production/);
  });

  it('runs in production when --force is passed', () => {
    expect(() => assertSeedAllowed('production', ['--force'])).not.toThrow();
  });

  it('runs when NODE_ENV is development', () => {
    expect(() => assertSeedAllowed('development', [])).not.toThrow();
  });

  it('runs when NODE_ENV is not set', () => {
    expect(() => assertSeedAllowed(undefined, [])).not.toThrow();
  });
});
