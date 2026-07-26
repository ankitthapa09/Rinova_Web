import type { Request, Response, NextFunction, RequestHandler } from 'express';

// forwards a rejected promise to the error middleware. express 5 does this
// itself, but wrapping keeps it explicit and safe outside a v5 router
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
