import dotenv from 'dotenv';

dotenv.config({ quiet: true }); // don't print "injected env (N) from .env" on every load

// Reads a variable that the app can't run without, and stops at startup if it's missing.
const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  }
  return value;
};

export const env = {
  port: Number(process.env.PORT) || 3000,
  mongodbUri: required('MONGODB_URI'),
  // Signs and verifies JWTs. Anyone who knows it can create valid tokens,
  // so it lives only in .env (which is gitignored), never in the code.
  jwtSecret: required('JWT_SECRET'),
  // How long a token stays valid, e.g. "1d", "12h".
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
};
