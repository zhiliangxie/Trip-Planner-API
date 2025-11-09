import dotenv from 'dotenv';

dotenv.config();

if (!process.env.TRIPS_API_URL) {
  throw new Error('TRIPS_API_URL is required');
}
if (!process.env.TRIPS_API_KEY) {
  throw new Error('TRIPS_API_KEY is required');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  tripsApiUrl: process.env.TRIPS_API_URL,
  tripsApiKey: process.env.TRIPS_API_KEY,
  tripsMaxRetry: Number(process.env.TRIPS_MAX_RETRY),
  cacheTTL: Number(process.env.CACHE_TTL_SECONDS),
  redisUrl: process.env.REDIS_URL,
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
