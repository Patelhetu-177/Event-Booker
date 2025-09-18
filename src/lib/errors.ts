export class CustomError extends Error {
  statusCode: number;
  errors: unknown[];

  constructor(message: string, statusCode: number = 500, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string = "Validation Error", errors: unknown[] = []) {
    super(message, 400, errors);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = "Not Found") {
    super(message, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = "Conflict") {
    super(message, 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
