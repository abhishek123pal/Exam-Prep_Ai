import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

// Redis is optional for local development. Chat still works with process memory.
export const redis = redisUrl ? new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
}) : null;

redis?.on('connect', () => console.log('🚀 [REDIS]: Connected successfully!'));
redis?.on('error', (err) => console.error('❌ [REDIS] Error:', err.message));
if (!redisUrl) console.warn('[REDIS]: REDIS_URL is not set; using in-memory chat history.');
