import { describe, it, expect } from 'vitest';
import { isRateLimited, resetRateLimit } from '$lib/server/rateLimit';

describe('Rate Limiting', () => {
	it('should not rate limit first request', () => {
		const identifier = 'test-user-1';
		const limited = isRateLimited({
			identifier,
			max: 5,
			windowMs: 60000
		});
		
		expect(limited).toBe(false);
		resetRateLimit(identifier);
	});

	it('should rate limit after max requests', () => {
		const identifier = 'test-user-2';
		const config = { identifier, max: 3, windowMs: 60000 };
		
		// Make 3 requests (should all pass)
		expect(isRateLimited(config)).toBe(false);
		expect(isRateLimited(config)).toBe(false);
		expect(isRateLimited(config)).toBe(false);
		
		// 4th request should be rate limited
		expect(isRateLimited(config)).toBe(true);
		
		resetRateLimit(identifier);
	});

	it('should reset after window expires', async () => {
		const identifier = 'test-user-3';
		const config = { identifier, max: 2, windowMs: 100 };
		
		// Make 2 requests
		isRateLimited(config);
		isRateLimited(config);
		
		// Should be rate limited
		expect(isRateLimited(config)).toBe(true);
		
		// Wait for window to expire
		await new Promise(resolve => setTimeout(resolve, 150));
		
		// Should allow requests again
		expect(isRateLimited(config)).toBe(false);
		
		resetRateLimit(identifier);
	});
});
