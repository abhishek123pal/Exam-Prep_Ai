import { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const requests = new Map<string, { count: number; resetAt: number }>();

export const chatRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let bucket = requests.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    requests.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many chat requests. Please try again shortly.' });
  }
  return next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of requests) {
    if (bucket.resetAt <= now) requests.delete(key);
  }
}, WINDOW_MS).unref();
