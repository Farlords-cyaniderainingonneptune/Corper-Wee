/**
 * Corper Wee: Request Validation Middleware with Zod
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        next(new AppError('Invalid request parameters', 422, issues));
      } else {
        next(error);
      }
    }
  };
}
