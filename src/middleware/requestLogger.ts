import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

// Extend Express Request type to include id and log
declare global {
  namespace Express {
    interface Request {
      id: string;
      log: typeof logger;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const reqId = req.header('x-request-id') || crypto.randomUUID();
  req.id = reqId;
  req.log = logger.child({ reqId });

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    
    req.log.info({
      method: req.method,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      errorCode: res.locals.errorCode, // Will be set by errorHandler if applicable
    }, 'Request completed');
  });

  next();
};
