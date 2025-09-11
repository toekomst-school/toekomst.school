import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	type: 'success' | 'error' | 'warning' | 'info';
	title: string;
	description?: string;
	duration?: number;
	action?: {
		label: string;
		onClick: () => void;
	};
}

function createToastStore() {
	const { subscribe, set, update } = writable<Toast[]>([]);

	return {
		subscribe,
		add: (toast: Omit<Toast, 'id'>) => {
			const id = crypto.randomUUID();
			const newToast: Toast = {
				...toast,
				id,
				duration: toast.duration ?? 5000
			};

			update((toasts) => [...toasts, newToast]);

			// Auto-remove toast after duration
			if (newToast.duration > 0) {
				setTimeout(() => {
					update((toasts) => toasts.filter((t) => t.id !== id));
				}, newToast.duration);
			}

			return id;
		},
		remove: (id: string) => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		},
		clear: () => set([]),

		// Convenience methods
		success: (title: string, description?: string, options?: Partial<Toast>) => {
			return toastStore.add({ type: 'success', title, description, ...options });
		},
		error: (title: string, description?: string, options?: Partial<Toast>) => {
			return toastStore.add({ type: 'error', title, description, duration: 8000, ...options });
		},
		warning: (title: string, description?: string, options?: Partial<Toast>) => {
			return toastStore.add({ type: 'warning', title, description, ...options });
		},
		info: (title: string, description?: string, options?: Partial<Toast>) => {
			return toastStore.add({ type: 'info', title, description, ...options });
		}
	};
}

export const toastStore = createToastStore();
