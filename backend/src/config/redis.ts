import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error("❌ CRITICAL: REDIS_URL is missing in .env file!");
  process.exit(1);
}

// Production-ready Redis client initialization
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => console.log('🚀 [REDIS]: Connected successfully!'));
redis.on('error', (err) => console.error('❌ [REDIS] Error:', err.message));