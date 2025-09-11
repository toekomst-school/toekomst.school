import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface RecentItem {
	id: string;
	type: 'course' | 'lesson' | 'presentation';
	title: string;
	url: string;
	lastAccessed: Date;
	thumbnail?: string;
	metadata?: {
		status?: 'draft' | 'published' | 'archived';
		progress?: number;
		duration?: string;
	};
}

const STORAGE_KEY = 'recent-items';
const MAX_RECENT_ITEMS = 10;

function createRecentItemsStore() {
	// Initialize with data from localStorage
	const initialData: RecentItem[] = browser
		? (() => {
				try {
					const stored = localStorage.getItem(STORAGE_KEY);
					if (stored) {
						const parsed = JSON.parse(stored);
						return parsed.map((item: any) => ({
							...item,
							lastAccessed: new Date(item.lastAccessed)
						}));
					}
				} catch (e) {
					console.warn('Failed to load recent items:', e);
				}
				return [];
			})()
		: [];

	const { subscribe, set, update } = writable<RecentItem[]>(initialData);

	// Save to localStorage whenever the store updates
	function persistToStorage(items: RecentItem[]) {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
			} catch (e) {
				console.warn('Failed to save recent items:', e);
			}
		}
	}

	return {
		subscribe,
		addItem: (item: Omit<RecentItem, 'lastAccessed'>) => {
			update((items) => {
				// Remove existing item if it exists
				const filtered = items.filter(
					(existing) => !(existing.id === item.id && existing.type === item.type)
				);

				// Add new item at the beginning
				const newItem: RecentItem = {
					...item,
					lastAccessed: new Date()
				};

				const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
				persistToStorage(updated);
				return updated;
			});
		},
		removeItem: (id: string, type: RecentItem['type']) => {
			update((items) => {
				const filtered = items.filter((item) => !(item.id === id && item.type === type));
				persistToStorage(filtered);
				return filtered;
			});
		},
		clear: () => {
			set([]);
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
			}
		},
		updateMetadata: (id: string, type: RecentItem['type'], metadata: RecentItem['metadata']) => {
			update((items) => {
				const updated = items.map((item) =>
					item.id === id && item.type === type
						? { ...item, metadata: { ...item.metadata, ...metadata } }
						: item
				);
				persistToStorage(updated);
				return updated;
			});
		}
	};
}

export const recentItemsStore = createRecentItemsStore();
