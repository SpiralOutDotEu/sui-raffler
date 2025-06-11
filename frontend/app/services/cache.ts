import { LRUCache } from 'lru-cache';

class CacheService {
    private static instance: CacheService;
    private cache: LRUCache<string, string>;

    private constructor() {
        // Configure cache with a maximum of 1000 items and 24 hour TTL
        this.cache = new LRUCache({
            max: 1000,
            ttl: 1000 * 60 * 60 * 24, // 24 hours in milliseconds
            maxSize: 50 * 1024 * 1024, // 50MB in bytes total size of cached items 
            sizeCalculation: (value) => {
                // Calculate size of the URL string in bytes
                return Buffer.byteLength(value, 'utf8');
            },
        });
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    public get(key: string): string | undefined {
        return this.cache.get(key);
    }

    public set(key: string, value: string): void {
        this.cache.set(key, value);
    }

    // Helper method to get cache statistics
    public getStats() {
        return {
            size: this.cache.calculatedSize,
            itemCount: this.cache.size,
            maxSize: this.cache.maxSize,
        };
    }
}

export const cacheService = CacheService.getInstance(); 