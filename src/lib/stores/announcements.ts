import { writable, derived, get } from 'svelte/store';
import type { 
	Announcement, 
	AnnouncementFilters, 
	AnnouncementTarget,
	AnnouncementStats,
	AnnouncementCreateRequest 
} from '$lib/types/announcements';
import { user } from '$lib/stores/auth.js';

// Core announcement stores
export const announcements = writable<Announcement[]>([]);
export const announcementTargets = writable<AnnouncementTarget[]>([]);
export const announcementStats = writable<AnnouncementStats>({
	total: 0,
	unread: 0,
	highPriority: 0,
	urgent: 0,
	expiringSoon: 0
});

// UI state stores
export const isLoading = writable(false);
export const error = writable<string | null>(null);
export const currentFilters = writable<AnnouncementFilters>({});

// Derived stores
export const unreadAnnouncements = derived(
	announcements,
	($announcements) => $announcements.filter(a => !a.readBy.includes(getCurrentUserId()))
);

export const priorityAnnouncements = derived(
	announcements,
	($announcements) => $announcements.filter(a => a.priority === 'high' || a.priority === 'urgent')
);

export const filteredAnnouncements = derived(
	[announcements, currentFilters],
	([$announcements, $filters]) => {
		let filtered = [...$announcements];

		if ($filters.targetType) {
			filtered = filtered.filter(a => a.targetType === $filters.targetType);
		}

		if ($filters.priority) {
			filtered = filtered.filter(a => a.priority === $filters.priority);
		}

		if ($filters.status) {
			filtered = filtered.filter(a => a.status === $filters.status);
		}

		if ($filters.authorId) {
			filtered = filtered.filter(a => a.authorId === $filters.authorId);
		}

		if ($filters.unreadOnly) {
			filtered = filtered.filter(a => !a.readBy.includes(getCurrentUserId()));
		}

		if ($filters.search) {
			const searchLower = $filters.search.toLowerCase();
			filtered = filtered.filter(a => 
				a.title.toLowerCase().includes(searchLower) ||
				a.content.toLowerCase().includes(searchLower) ||
				a.authorName.toLowerCase().includes(searchLower) ||
				a.targetName.toLowerCase().includes(searchLower)
			);
		}

		return filtered;
	}
);

// Notification badge counts
export const notificationCounts = derived(
	announcementStats,
	($stats) => ({
		total: $stats.unread,
		hasHigh: $stats.highPriority > 0,
		hasUrgent: $stats.urgent > 0,
		expiring: $stats.expiringSoon
	})
);

// Actions
export const announcementActions = {
	// Fetch announcements with optional filters
	async fetchAnnouncements(filters: AnnouncementFilters = {}, includeStats = true) {
		isLoading.set(true);
		error.set(null);

		try {
			const params = new URLSearchParams();
			
			// Add userId parameter
			const userId = getCurrentUserId();
			if (!userId) {
				throw new Error('User not authenticated');
			}
			params.append('userId', userId);
			
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					params.append(key, String(value));
				}
			});

			if (includeStats) {
				params.append('stats', 'true');
			}

			const response = await fetch(`/api/announcements?${params}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to fetch announcements');
			}

			announcements.set(data.announcements || []);
			
			if (data.stats) {
				announcementStats.set(data.stats);
			}

			return data;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to fetch announcements';
			error.set(message);
			throw err;
		} finally {
			isLoading.set(false);
		}
	},

	// Fetch available targets
	async fetchTargets() {
		try {
			const userId = getCurrentUserId();
			if (!userId) {
				throw new Error('User not authenticated');
			}
			
			const response = await fetch(`/api/announcements/targets?userId=${userId}`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to fetch targets');
			}

			announcementTargets.set(data.targets || []);
			return data.targets;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to fetch targets';
			error.set(message);
			throw err;
		}
	},

	// Create new announcement
	async createAnnouncement(data: AnnouncementCreateRequest) {
		try {
			const userId = getCurrentUserId();
			if (!userId) {
				throw new Error('User not authenticated');
			}

			const response = await fetch('/api/announcements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...data,
					userId: userId
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create announcement');
			}

			// Add to local store
			announcements.update(items => [result, ...items]);
			
			// Refresh stats
			this.fetchAnnouncements({}, true);

			return result;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to create announcement';
			error.set(message);
			throw err;
		}
	},

	// Update announcement
	async updateAnnouncement(id: string, data: Partial<Announcement>) {
		try {
			const userId = getCurrentUserId();
			if (!userId) {
				throw new Error('User not authenticated');
			}

			const response = await fetch(`/api/announcements/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...data,
					userId: userId
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to update announcement');
			}

			// Update local store
			announcements.update(items => 
				items.map(item => item.$id === id ? { ...item, ...result } : item)
			);

			return result;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update announcement';
			error.set(message);
			throw err;
		}
	},

	// Delete announcement
	async deleteAnnouncement(id: string) {
		try {
			const userId = getCurrentUserId();
			if (!userId) {
				throw new Error('User not authenticated');
			}

			const response = await fetch(`/api/announcements/${id}?userId=${userId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete announcement');
			}

			// Remove from local store
			announcements.update(items => items.filter(item => item.$id !== id));
			
			// Refresh stats
			this.fetchAnnouncements({}, true);

		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to delete announcement';
			error.set(message);
			throw err;
		}
	},

	// Mark announcement as read
	async markAsRead(id: string) {
		try {
			const userId = getCurrentUserId();
			if (!userId) {
				throw new Error('User not authenticated');
			}

			const response = await fetch(`/api/announcements/${id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					action: 'mark_read',
					userId: userId
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to mark as read');
			}

			// Update local store
			announcements.update(items => 
				items.map(item => {
					if (item.$id === id && !item.readBy.includes(userId)) {
						return { ...item, readBy: [...item.readBy, userId] };
					}
					return item;
				})
			);

			// Update stats
			announcementStats.update(stats => ({
				...stats,
				unread: Math.max(0, stats.unread - 1)
			}));

		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to mark as read';
			error.set(message);
			throw err;
		}
	},

	// Update filters
	setFilters(filters: AnnouncementFilters) {
		currentFilters.set(filters);
	},

	// Clear error
	clearError() {
		error.set(null);
	},

	// Refresh data
	async refresh() {
		const filters = get(currentFilters);
		await this.fetchAnnouncements(filters, true);
	}
};

// Helper function to get current user ID
function getCurrentUserId(): string {
	// Get user ID from the auth store
	try {
		const currentUser = get(user);
		if (currentUser && currentUser.$id) {
			return currentUser.$id;
		}
		
		// Fallback: try to get from localStorage where auth might store it
		if (typeof window !== 'undefined') {
			const authData = localStorage.getItem('auth') || localStorage.getItem('user');
			if (authData) {
				const parsed = JSON.parse(authData);
				return parsed.id || parsed.$id || parsed.userId || '';
			}
		}
	} catch (error) {
		console.warn('Failed to get current user ID:', error);
	}
	return '';
}

// Real-time updates and periodic refresh
if (typeof window !== 'undefined') {
	// Set up real-time updates via server-sent events or WebSocket
	let eventSource: EventSource | null = null;
	
	const setupRealTimeUpdates = () => {
		try {
			// Try to establish SSE connection for announcement updates
			eventSource = new EventSource('/api/announcements/stream');
			
			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.type === 'announcement_update') {
						// Refresh announcements when updates occur
						announcementActions.refresh();
					}
				} catch (error) {
					console.warn('Failed to parse SSE data:', error);
				}
			};
			
			eventSource.onerror = (error) => {
				console.warn('SSE connection error:', error);
				eventSource?.close();
				eventSource = null;
				// Fallback to periodic polling
				setTimeout(() => {
					if (!eventSource) {
						setupPeriodicRefresh();
					}
				}, 5000);
			};
		} catch (error) {
			console.warn('Failed to setup real-time updates:', error);
			setupPeriodicRefresh();
		}
	};
	
	const setupPeriodicRefresh = () => {
		setInterval(() => {
			announcementActions.refresh();
		}, 30000); // Refresh every 30 seconds
	};
	
	// Try real-time first, fallback to periodic
	setupRealTimeUpdates();
	
	// Cleanup on page unload
	window.addEventListener('beforeunload', () => {
		eventSource?.close();
	});
}