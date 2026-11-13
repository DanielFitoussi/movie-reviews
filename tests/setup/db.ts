import os from 'os';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Call inside a describe block (or at the top of a test file) to give
// those tests a fresh in-memory MongoDB. Every test starts with empty collections.
export const useTestDatabase = (): void => {
  let mongo: MongoMemoryServer;

  // Starting mongod can take longer than Jest's default 5s hook timeout
  // (especially on Windows), so this hook gets 60s.
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    // The MongoDB driver loads Node's `os` module with a dynamic import(),
    // which Jest's sandbox doesn't support. Passing `os` ourselves avoids it.
    // Without this the connection fails with
    // "Missing required sub-document 'driver' in the client metadata document".
    await mongoose.connect(mongo.getUri(), { runtimeAdapters: { os } });
  }, 60_000);

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });
};
