import { describe, it, expect } from 'vitest';
import { 
	ValidationError, 
	AuthenticationError,
	NotFoundError,
	formatErrorResponse 
} from '$lib/server/errors';

describe('Error Classes', () => {
	it('should create ValidationError with correct properties', () => {
		const error = new ValidationError('Invalid input', { field: 'email' });
		
		expect(error.message).toBe('Invalid input');
		expect(error.code).toBe('VALIDATION_ERROR');
		expect(error.status).toBe(400);
		expect(error.details).toEqual({ field: 'email' });
	});

	it('should create AuthenticationError', () => {
		const error = new AuthenticationError();
		
		expect(error.message).toBe('請先登入');
		expect(error.code).toBe('AUTHENTICATION_ERROR');
		expect(error.status).toBe(401);
	});

	it('should create NotFoundError', () => {
		const error = new NotFoundError('團隊');
		
		expect(error.message).toBe('找不到團隊');
		expect(error.code).toBe('NOT_FOUND');
		expect(error.status).toBe(404);
	});

	it('should format AppError response correctly', () => {
		const error = new ValidationError('Test error', { test: true });
		const response = formatErrorResponse(error);
		
		expect(response.success).toBe(false);
		expect(response.error.code).toBe('VALIDATION_ERROR');
		expect(response.error.message).toBe('Test error');
		if ('details' in response.error) {
			expect(response.error.details).toEqual({ test: true });
		}
	});

	it('should format unknown error safely', () => {
		const error = new Error('Internal error');
		const response = formatErrorResponse(error);
		
		expect(response.success).toBe(false);
		expect(response.error.code).toBe('INTERNAL_SERVER_ERROR');
		expect(response.error.message).toBe('伺服器錯誤，請稍後再試');
		expect(response.error).not.toHaveProperty('details');
	});
});
