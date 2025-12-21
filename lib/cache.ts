// Redis cache layer for enterprise scalability
// Falls back to in-memory cache if Redis not available

interface CacheOptions {
    ttl?: number; // Time to live in seconds
}

class CacheManager {
    private memoryCache: Map<string, { data: any; expires: number }> = new Map();
    private redisClient: any = null;

    constructor() {
        // Try to initialize Redis if available
        try {
            // Redis will be initialized when package is installed
            // For now, use in-memory cache
        } catch (error) {
            console.warn("Redis not available, using in-memory cache");
        }
    }

    async get<T>(key: string): Promise<T | null> {
        // Check memory cache first
        const cached = this.memoryCache.get(key);
        if (cached && cached.expires > Date.now()) {
            return cached.data as T;
        }

        if (cached && cached.expires <= Date.now()) {
            this.memoryCache.delete(key);
        }

        // TODO: Check Redis if available
        return null;
    }

    async set(key: string, value: any, options?: CacheOptions): Promise<void> {
        const ttl = options?.ttl || 3600; // Default 1 hour
        const expires = Date.now() + ttl * 1000;

        // Store in memory cache
        this.memoryCache.set(key, { data: value, expires });

        // TODO: Store in Redis if available

        // Clean up expired entries periodically
        if (this.memoryCache.size > 1000) {
            this.cleanup();
        }
    }

    async delete(key: string): Promise<void> {
        this.memoryCache.delete(key);
        // TODO: Delete from Redis if available
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();
        // TODO: Clear Redis if available
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, value] of this.memoryCache.entries()) {
            if (value.expires <= now) {
                this.memoryCache.delete(key);
            }
        }
    }
}

export const cache = new CacheManager();

// Cache keys
export const CacheKeys = {
    user: (id: string) => `user:${id}`,
    post: (id: string) => `post:${id}`,
    posts: (userId?: string) => userId ? `posts:user:${userId}` : "posts:all",
    trending: () => "trending:hashtags",
    notifications: (userId: string) => `notifications:${userId}`,
    followers: (userId: string) => `followers:${userId}`,
    following: (userId: string) => `following:${userId}`,
};







