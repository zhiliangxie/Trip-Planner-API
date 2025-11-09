import Redis from 'ioredis';
import { config } from '../config/env';

if (!config.redisUrl) {
  throw new Error('Missing REDIS_URL in the env file');
}

const redis = new Redis(config.redisUrl);

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error', err));

export { redis };
