import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { errorHandler } from '../../src/middleware/errorHandler';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../src/utils/errors';

// A fake Express response that records what the middleware sends.
const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const run = (error: unknown) => {
  const res = mockResponse();
  errorHandler(error, {} as Request, res, jest.fn() as NextFunction);
  return res;
};

describe('errorHandler', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the status of an AppError', () => {
    const res = run(new NotFoundError('Movie not found'));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Movie not found' });
  });

  it('returns 400 for BadRequestError', () => {
    const res = run(new BadRequestError('Invalid movie id'));

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it.each([
    [new UnauthorizedError(), 401],
    [new ForbiddenError(), 403],
    [new ConflictError(), 409],
  ])('returns the right status for %p', (error, status) => {
    const res = run(error);

    expect(res.status).toHaveBeenCalledWith(status);
  });

  it('returns 409 for a MongoDB duplicate key error', () => {
    const error = Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });

    const res = run(error);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Duplicate value' });
  });

  it('returns 400 with field details for a Mongoose ValidationError', () => {
    const error = new mongoose.Error.ValidationError();
    error.addError(
      'title',
      new mongoose.Error.ValidatorError({ path: 'title', message: 'title is required' }),
    );

    const res = run(error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      details: { title: 'title is required' },
    });
  });

  it('returns 400 for a Mongoose CastError', () => {
    const error = new mongoose.Error.CastError('Number', 'abc', 'releaseYear');

    const res = run(error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid value for releaseYear' });
  });

  it('returns 400 when the request body is invalid JSON', () => {
    const error = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
      type: 'entity.parse.failed',
    });

    const res = run(error);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid JSON body' });
  });

  it('returns 500 for unknown errors and hides the details', () => {
    const res = run(new Error('database password is 1234'));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
