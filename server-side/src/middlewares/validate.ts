import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodType } from 'zod';

// Runs a Zod schema against req.body before the controller. Rejects with a
// field-by-field 400; on success replaces req.body with the parsed result,
// which also drops unknown keys (mass-assignment protection).
export function validate(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

// Same idea for query strings. Express 5 makes req.query read-only, so the
// parsed result lands on res.locals.query for the controller to read.
export function validateQuery(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    res.locals.query = result.data;
    next();
  };
}
