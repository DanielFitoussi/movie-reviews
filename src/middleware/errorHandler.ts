import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors';

// Express knows this is an error handler because it takes 4 arguments.
// Any error thrown in a route (including rejected promises, in Express 5) ends up here.
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string> = {};
    for (const [field, fieldError] of Object.entries(error.errors)) {
      details[field] = fieldError.message;
    }
    res.status(400).json({ error: 'Validation failed', details });
    return;
  }

  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: `Invalid value for ${error.path}` });
    return;
  }

  // MongoDB rejects a value that breaks a unique index (e.g. two users with the same
  // username saved at the same moment, so both passed the service's check).
  if (error instanceof Error && 'code' in error && error.code === 11000) {
    res.status(409).json({ error: 'Duplicate value' });
    return;
  }

  // express.json() throws this when the request body isn't valid JSON.
  if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  // Unexpected error: log it for us, but don't leak internal details to the client.
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
};
