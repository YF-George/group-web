/**
 * Toast Notification Store
 * Provides user feedback for actions
 */

import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	return {
		subscribe,
		
		/**
		 * Show a toast notification
		 */
		show(message: string, type: ToastType = 'info', duration = 3000) {
			const id = crypto.randomUUID();
			const toast: Toast = { id, message, type, duration };
			
			update(toasts => [...toasts, toast]);
			
			if (duration > 0) {
				setTimeout(() => {
					this.dismiss(id);
				}, duration);
			}
			
			return id;
		},
		
		/**
		 * Show success toast
		 */
		success(message: string, duration?: number) {
			return this.show(message, 'success', duration);
		},
		
		/**
		 * Show error toast
		 */
		error(message: string, duration?: number) {
			return this.show(message, 'error', duration);
		},
		
		/**
		 * Show info toast
		 */
		info(message: string, duration?: number) {
			return this.show(message, 'info', duration);
		},
		
		/**
		 * Show warning toast
		 */
		warning(message: string, duration?: number) {
			return this.show(message, 'warning', duration);
		},
		
		/**
		 * Dismiss a specific toast
		 */
		dismiss(id: string) {
			update(toasts => toasts.filter(t => t.id !== id));
		},
		
		/**
		 * Clear all toasts
		 */
		clear() {
			update(() => []);
		}
	};
}

export const toasts = createToastStore();
