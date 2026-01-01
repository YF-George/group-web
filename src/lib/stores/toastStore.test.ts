import { describe, it, expect, beforeEach } from 'vitest';
import { toasts } from '$lib/stores/toastStore';
import { get } from 'svelte/store';

describe('Toast Store', () => {
	beforeEach(() => {
		toasts.clear();
	});

	it('should add a toast notification', () => {
		toasts.show('Test message', 'info');
		const current = get(toasts);
		
		expect(current).toHaveLength(1);
		expect(current[0].message).toBe('Test message');
		expect(current[0].type).toBe('info');
	});

	it('should add success toast', () => {
		toasts.success('Success!');
		const current = get(toasts);
		
		expect(current[0].type).toBe('success');
		expect(current[0].message).toBe('Success!');
	});

	it('should add error toast', () => {
		toasts.error('Error!');
		const current = get(toasts);
		
		expect(current[0].type).toBe('error');
		expect(current[0].message).toBe('Error!');
	});

	it('should dismiss specific toast', () => {
		const id1 = toasts.show('First', 'info', 0);
		toasts.show('Second', 'info', 0);
		
		toasts.dismiss(id1);
		const current = get(toasts);
		
		expect(current).toHaveLength(1);
		expect(current[0].message).toBe('Second');
	});

	it('should clear all toasts', () => {
		toasts.show('First', 'info', 0);
		toasts.show('Second', 'info', 0);
		toasts.clear();
		
		const current = get(toasts);
		expect(current).toHaveLength(0);
	});

	it('should auto-dismiss after duration', async () => {
		toasts.show('Auto dismiss', 'info', 100);
		
		// Should exist immediately
		expect(get(toasts)).toHaveLength(1);
		
		// Wait for auto-dismiss
		await new Promise(resolve => setTimeout(resolve, 150));
		
		expect(get(toasts)).toHaveLength(0);
	});
});
