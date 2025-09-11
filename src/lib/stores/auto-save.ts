import { writable, derived } from 'svelte/store';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveState {
	status: AutoSaveStatus;
	lastSaved: Date | null;
	hasUnsavedChanges: boolean;
	errorMessage?: string;
	savingProgress?: number;
}

function createAutoSaveStore() {
	const { subscribe, set, update } = writable<AutoSaveState>({
		status: 'idle',
		lastSaved: null,
		hasUnsavedChanges: false
	});

	let saveTimeout: NodeJS.Timeout;
	let savePromise: Promise<void> | null = null;

	return {
		subscribe,

		// Mark content as changed
		markChanged: () => {
			update((state) => ({
				...state,
				hasUnsavedChanges: true,
				status: state.status === 'error' ? 'idle' : state.status
			}));
		},

		// Start auto-save process
		startSaving: () => {
			update((state) => ({
				...state,
				status: 'saving',
				errorMessage: undefined,
				savingProgress: 0
			}));
		},

		// Update saving progress
		updateProgress: (progress: number) => {
			update((state) => ({
				...state,
				savingProgress: Math.min(100, Math.max(0, progress))
			}));
		},

		// Mark as successfully saved
		markSaved: () => {
			update((state) => ({
				...state,
				status: 'saved',
				lastSaved: new Date(),
				hasUnsavedChanges: false,
				errorMessage: undefined,
				savingProgress: 100
			}));
		},

		// Mark save as failed
		markError: (errorMessage: string) => {
			update((state) => ({
				...state,
				status: 'error',
				errorMessage,
				savingProgress: undefined
			}));
		},

		// Reset to idle state
		reset: () => {
			clearTimeout(saveTimeout);
			savePromise = null;
			set({
				status: 'idle',
				lastSaved: null,
				hasUnsavedChanges: false
			});
		},

		// Auto-save with debounce
		autoSave: async (saveFunction: () => Promise<void>, delay: number = 2000) => {
			// Clear existing timeout
			clearTimeout(saveTimeout);

			// Mark as changed immediately
			update((state) => ({
				...state,
				hasUnsavedChanges: true,
				status: state.status === 'error' ? 'idle' : state.status
			}));

			// Set new timeout for auto-save
			saveTimeout = setTimeout(async () => {
				// Don't start new save if one is already in progress
				if (savePromise) {
					return;
				}

				try {
					update((state) => ({
						...state,
						status: 'saving',
						errorMessage: undefined,
						savingProgress: 0
					}));

					savePromise = saveFunction();
					await savePromise;

					update((state) => ({
						...state,
						status: 'saved',
						lastSaved: new Date(),
						hasUnsavedChanges: false,
						savingProgress: 100
					}));
				} catch (error) {
					update((state) => ({
						...state,
						status: 'error',
						errorMessage: error instanceof Error ? error.message : 'Save failed',
						savingProgress: undefined
					}));
				} finally {
					savePromise = null;

					// Reset to idle after showing saved status briefly
					if (get(autoSaveStore).status === 'saved') {
						setTimeout(() => {
							update((state) =>
								state.status === 'saved'
									? { ...state, status: 'idle', savingProgress: undefined }
									: state
							);
						}, 2000);
					}
				}
			}, delay);
		},

		// Manual save (immediate)
		save: async (saveFunction: () => Promise<void>) => {
			clearTimeout(saveTimeout);

			if (savePromise) {
				return savePromise;
			}

			try {
				update((state) => ({
					...state,
					status: 'saving',
					errorMessage: undefined,
					savingProgress: 0
				}));

				savePromise = saveFunction();
				await savePromise;

				update((state) => ({
					...state,
					status: 'saved',
					lastSaved: new Date(),
					hasUnsavedChanges: false,
					savingProgress: 100
				}));
			} catch (error) {
				update((state) => ({
					...state,
					status: 'error',
					errorMessage: error instanceof Error ? error.message : 'Save failed',
					savingProgress: undefined
				}));
				throw error;
			} finally {
				savePromise = null;

				// Reset to idle after showing saved status briefly
				setTimeout(() => {
					update((state) =>
						state.status === 'saved'
							? { ...state, status: 'idle', savingProgress: undefined }
							: state
					);
				}, 2000);
			}
		}
	};
}

// Helper function to get current store value
function get<T>(store: { subscribe: (fn: (value: T) => void) => () => void }): T {
	let value: T;
	const unsubscribe = store.subscribe((v) => (value = v));
	unsubscribe();
	return value!;
}

export const autoSaveStore = createAutoSaveStore();

// Derived store for display status text
export const autoSaveStatusText = derived(autoSaveStore, ($autoSave) => {
	switch ($autoSave.status) {
		case 'saving':
			return 'Saving...';
		case 'saved':
			return 'All changes saved';
		case 'error':
			return $autoSave.errorMessage || 'Save failed';
		case 'idle':
			if ($autoSave.hasUnsavedChanges) {
				return 'Unsaved changes';
			}
			if ($autoSave.lastSaved) {
				const now = new Date();
				const diff = now.getTime() - $autoSave.lastSaved.getTime();
				const minutes = Math.floor(diff / (1000 * 60));

				if (minutes < 1) return 'Saved just now';
				if (minutes < 60) return `Saved ${minutes}m ago`;

				const hours = Math.floor(minutes / 60);
				if (hours < 24) return `Saved ${hours}h ago`;

				return 'Saved';
			}
			return '';
		default:
			return '';
	}
});
