/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per IP/user
 * 
 * PRODUCTION NOTE: Replace in-memory store with Redis for multi-instance deployments
 */

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

// In-memory store (use Redis in production)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes (only in non-serverless environments)
if (typeof setInterval !== 'undefined') {
	setInterval(() => {
		const now = Date.now();
		for (const [key, entry] of store.entries()) {
			if (entry.resetTime < now) {
				store.delete(key);
			}
		}
	}, 5 * 60 * 1000);
}

interface RateLimitConfig {
	/** Maximum requests allowed */
	max: number;
	/** Time window in milliseconds */
	windowMs: number;
	/** Identifier (IP or user ID) */
	identifier: string;
}

/**
 * Check if request should be rate limited
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(config: RateLimitConfig): boolean {
	const { identifier, max, windowMs } = config;
	const now = Date.now();
	
	const entry = store.get(identifier);
	
	if (!entry || entry.resetTime < now) {
		// Create new entry
		store.set(identifier, {
			count: 1,
			resetTime: now + windowMs
		});
		return false;
	}
	
	// Increment count
	entry.count++;
	
	if (entry.count > max) {
		return true;
	}
	
	return false;
}

/**
 * Get remaining requests for identifier
 */
export function getRateLimitInfo(identifier: string): { remaining: number; resetTime: number } | null {
	const entry = store.get(identifier);
	if (!entry) return null;
	
	return {
		remaining: Math.max(0, 100 - entry.count),
		resetTime: entry.resetTime
	};
}

/**
 * Reset rate limit for identifier (useful for testing)
 */
export function resetRateLimit(identifier: string): void {
	store.delete(identifier);
}
