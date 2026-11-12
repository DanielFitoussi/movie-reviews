import dotenv from 'dotenv';

dotenv.config();

const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
}

export const env = {
  port: Number(process.env.PORT) || 3000,
  mongodbUri,
};
