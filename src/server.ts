import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';

const start = async (): Promise<void> => {
  try {
    await connectDB(env.mongodbUri);
    app.listen(env.port, () => {
      console.log(`Server listening on ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
