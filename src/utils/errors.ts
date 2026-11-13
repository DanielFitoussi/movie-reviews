// An error that already knows which HTTP status it should become.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

// Not logged in: no token, or the token is invalid/expired.
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

// Logged in, but not allowed to do this.
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}
