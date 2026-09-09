import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Pass to default Express handler if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle known application errors
  if (err instanceof AppError) {
    res.locals.errorCode = err.code;
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Handle validation errors from zod
  if (err instanceof ZodError) {
    res.locals.errorCode = 'VALIDATION_ERROR';
    const messages = err.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${messages}`,
      },
    });
  }

  // Handle syntax errors from JSON parsing
  if (err instanceof SyntaxError && 'body' in err) {
    res.locals.errorCode = 'BAD_REQUEST';
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid JSON payload',
      },
    });
  }

  // Unexpected errors
  res.locals.errorCode = 'INTERNAL_SERVER_ERROR';
  req.log.error({ err }, 'Unexpected error');
  
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
