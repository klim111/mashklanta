import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

// Singleton Redis client with connection pooling for Vercel
let redisClient: Redis | null = null;

export const redis = (() => {
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ REDIS_URL not configured - rate limits and caches fall back to memory');
    }
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(redisUrl, {
      // Optimize for Vercel serverless
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      // Connection pool settings
      keepAlive: 30000,
      // Timeouts
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
      redisClient = null;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
})();
