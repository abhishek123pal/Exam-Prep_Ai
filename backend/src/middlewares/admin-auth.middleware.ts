import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';

export const requireAdminKey = (req: Request, res: Response, next: NextFunction) => {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return res.status(503).json({ success: false, error: 'Admin API is not configured.' });
  }

  const authorization = req.header('authorization') || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  const valid = suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);

  if (!valid) return res.status(401).json({ success: false, error: 'A valid admin bearer token is required.' });
  return next();
};
