import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

// Singleton Redis client with connection pooling for Vercel
let redisClient: Redis | null = null;

export const redis = (() => {
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ REDIS_URL not configured - signaling will not persist across deployments');
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

// Helper functions for call management
export const callStore = {
  // Get call data
  async get(callId: string) {
    if (!redis) return null;
    try {
      const data = await redis.get(`call:${callId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting call data:', error);
      return null;
    }
  },

  // Set call data with TTL
  async set(callId: string, data: any, ttlSeconds = 3600) {
    if (!redis) return false;
    try {
      await redis.setex(`call:${callId}`, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error setting call data:', error);
      return false;
    }
  },

  // Delete call data
  async delete(callId: string) {
    if (!redis) return false;
    try {
      await redis.del(`call:${callId}`);
      return true;
    } catch (error) {
      console.error('Error deleting call data:', error);
      return false;
    }
  },

  // Add participant
  async addParticipant(callId: string, userId: string, userType: string) {
    const call = await callStore.get(callId) || {
      participants: {},
      messages: [],
      signals: []
    };
    
    call.participants[userId] = {
      userType,
      joinedAt: Date.now(),
      lastSeen: Date.now()
    };
    
    return callStore.set(callId, call);
  },

  // Update participant last seen
  async updateParticipant(callId: string, userId: string) {
    const call = await callStore.get(callId);
    if (!call || !call.participants[userId]) return false;
    
    call.participants[userId].lastSeen = Date.now();
    return callStore.set(callId, call);
  },

  // Remove participant
  async removeParticipant(callId: string, userId: string) {
    const call = await callStore.get(callId);
    if (!call) return false;
    
    delete call.participants[userId];
    
    // Clean up empty calls
    if (Object.keys(call.participants).length === 0) {
      await callStore.delete(callId);
      return true;
    }
    
    return callStore.set(callId, call);
  },

  // Add message
  async addMessage(callId: string, message: any) {
    const call = await callStore.get(callId) || {
      participants: {},
      messages: [],
      signals: []
    };
    
    call.messages.push(message);
    // Keep only last 200 messages
    if (call.messages.length > 200) {
      call.messages = call.messages.slice(-200);
    }
    
    return callStore.set(callId, call);
  },

  // Add signal
  async addSignal(callId: string, signal: any) {
    const call = await callStore.get(callId) || {
      participants: {},
      messages: [],
      signals: []
    };
    
    call.signals.push(signal);
    // Keep only last 100 signals
    if (call.signals.length > 100) {
      call.signals = call.signals.slice(-100);
    }
    
    return callStore.set(callId, call);
  },

  // Get messages since timestamp
  async getMessagesSince(callId: string, since: number) {
    const call = await callStore.get(callId);
    if (!call) return [];
    return call.messages.filter((msg: any) => msg.timestamp > since);
  },

  // Get signals since timestamp
  async getSignalsSince(callId: string, since: number) {
    const call = await callStore.get(callId);
    if (!call) return [];
    return call.signals.filter((signal: any) => signal.timestamp > since);
  },
};