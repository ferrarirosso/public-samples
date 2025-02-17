import { add, format } from 'date-fns';

export interface ICacheEntry<T> {
    expiration: string;
    value: T;
}

export type FetchFunction<T> = () => Promise<T>;

// Define the type for an idle callback function (compatible with requestIdleCallback)
export type IdleRequestCallback = (deadline: {
    didTimeout: boolean;
    timeRemaining: () => number;
}) => void;

// Create a properly typed fallback for requestIdleCallback
const requestIdleCallbackFn: (callback: IdleRequestCallback) => number =
    typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback.bind(window)
        : (callback: IdleRequestCallback): number => {
            return setTimeout(() => {
                callback({
                    didTimeout: true,
                    timeRemaining: () => 0,
                });
            }, 200);
        };

/**
 * A generic cache manager that uses localStorage to store data,
 * and defers a refresh when the cache is expired.
 *
 * Optionally, an onBackgroundRefresh callback can be provided to update the UI,
 * and an onLog callback to send log messages to the UI instead of (or in addition to) console.log.
 */
export class CacheManager<T> {
    private refreshScheduled: boolean = false;

    constructor(
        private key: string,
        private expirationSeconds: number,
        private fetchFunction: FetchFunction<T>,
        private onBackgroundRefresh?: (freshData: T) => void,
        private onLog?: (message: string) => void
    ) { }

    /**
     * Retrieves data from cache (if available) and schedules a background refresh if expired.
     * If reload is true, the cache is cleared before fetching fresh data.
     */
    async getData(reload: boolean): Promise<T> {
        // If reload is requested, clear the cache.
        if (reload) {
            localStorage.removeItem(this.key);
            this.log(`Reload requested. Cache cleared.`);
        }

        const cacheItem = localStorage.getItem(this.key);
        let cachedValue: T | null = null;
        let expiration = new Date();

        if (cacheItem) {
            try {
                const cacheJSON: ICacheEntry<T> = JSON.parse(cacheItem);
                expiration = new Date(cacheJSON.expiration);
                cachedValue = cacheJSON.value;
                this.log(`Cache hit. Returning cached data. Expiration: ${format(expiration, "HH:mm:ss")}`);
            } catch {
                this.log(`Invalid cache found.`);
            }
        }

        if (cachedValue) {
            // If the cache is expired, schedule a background refresh.
            if (new Date() > expiration) {
                this.log(`Cache expired (expired at: ${format(expiration, "HH:mm:ss")}). Scheduling background refresh.`);
                this.scheduleRefresh();
            }
            return cachedValue;
        }

        // If no valid cache exists, fetch fresh data.
        const freshData = await this.fetchFunction();
        this.setCache(freshData);
        return freshData;
    }

    /**
     * Sets the cache entry with a new expiration time.
     */
    private setCache(data: T): void {
        const expirationTime = add(new Date(), { seconds: this.expirationSeconds });
        const cacheEntry: ICacheEntry<T> = {
            expiration: expirationTime.toISOString(),
            value: data,
        };
        localStorage.setItem(this.key, JSON.stringify(cacheEntry));
        this.log(`Cache updated. New expiration: ${format(expirationTime, "HH:mm:ss")}`);
    }

    /**
     * Schedules a deferred background refresh using requestIdleCallback (or a fallback).
     */
    private scheduleRefresh(): void {
        if (this.refreshScheduled) return;
        this.refreshScheduled = true;

        requestIdleCallbackFn(async (deadline) => {
            this.log(`Background refresh starting.`);
            try {
                const freshData = await this.fetchFunction();
                this.setCache(freshData);
                this.log(`Background refresh completed.`);
                this.onBackgroundRefresh?.(freshData);
            } catch (error) {
                this.log(`Error during background refresh: ${error}`);
                console.error("Error during background refresh:", error);
            } finally {
                this.refreshScheduled = false;
            }
        });
    }

    /**
     * Logs a message using the provided onLog callback or falls back to console.log.
     */
    private log(message: string): void {
        if (this.onLog) {
            this.onLog(message);
        } else {
            console.log(message);
        }
    }

    /**
     * Updates the expirationSeconds value without needing to recreate the CacheManager instance.
     */
    updateExpiration(newExpirationSeconds: number): void {
        this.expirationSeconds = newExpirationSeconds;
        this.log(`Expiration seconds updated to ${newExpirationSeconds}`);
    }
}