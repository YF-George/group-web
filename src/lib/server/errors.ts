/**
 * Application Error Types
 * Centralized error handling with consistent format
 */

export class AppError extends Error {
	constructor(
		message: string,
		public code: string,
		public status: number = 500,
		public details?: unknown
	) {
		super(message);
		this.name = 'AppError';
	}
}

// Predefined error types
export class ValidationError extends AppError {
	constructor(message: string, details?: unknown) {
		super(message, 'VALIDATION_ERROR', 400, details);
		this.name = 'ValidationError';
	}
}

export class AuthenticationError extends AppError {
	constructor(message = '請先登入') {
		super(message, 'AUTHENTICATION_ERROR', 401);
		this.name = 'AuthenticationError';
	}
}

export class AuthorizationError extends AppError {
	constructor(message = '無權限執行此操作') {
		super(message, 'AUTHORIZATION_ERROR', 403);
		this.name = 'AuthorizationError';
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string) {
		super(`找不到${resource}`, 'NOT_FOUND', 404);
		this.name = 'NotFoundError';
	}
}

export class RateLimitError extends AppError {
	constructor(message = '請求過於頻繁，請稍後再試') {
		super(message, 'RATE_LIMIT_EXCEEDED', 429);
		this.name = 'RateLimitError';
	}
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown) {
	if (error instanceof AppError) {
		const response: {
			success: false;
			error: {
				code: string;
				message: string;
				details?: unknown;
			};
		} = {
			success: false,
			error: {
				code: error.code,
				message: error.message
			}
		};
		
		if (error.details) {
			response.error.details = error.details;
		}
		
		return response;
	}
	
	// Unknown errors - don't expose internal details
	console.error('Unhandled error:', error);
	return {
		success: false,
		error: {
			code: 'INTERNAL_SERVER_ERROR',
			message: '伺服器錯誤，請稍後再試'
		}
	};
}
