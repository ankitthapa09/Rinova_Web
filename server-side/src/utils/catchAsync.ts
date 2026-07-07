import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so a rejected promise is forwarded to Express's
 * error middleware instead of hanging the request. Express 5 forwards async
 * rejections on its own, but wrapping keeps the intent explicit at every
 * controller and stays correct if a handler is used outside a v5 router.
 */
export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
