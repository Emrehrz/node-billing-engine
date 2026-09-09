import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../logger';

export const validate =
  (schema: ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Collect human-readable messages for all failed fields
        const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed: ${messages}`,
          },
        });
      }
      
      logger.error({ error }, 'Unexpected error in validation middleware');
      return res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    }
  };
