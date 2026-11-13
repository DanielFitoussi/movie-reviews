// Runs before every test file (see `setupFiles` in jest.config.js), so before
// src/config/env.ts is imported. dotenv never overwrites variables that are
// already set, so tests always use these values and don't need a .env file.
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1d';

// Tests use an in-memory MongoDB (tests/setup/db.ts) and never connect to this URI,
// but env.ts requires it to be set.
process.env.MONGODB_URI ??= 'mongodb://localhost:27017/not-used-in-tests';
