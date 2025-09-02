import { writable, derived, get } from 'svelte/store';
import type { Announcement } from '$lib/types/announcements';

export interface DashboardData {
	workshops: any[];
	announcements: Announcement[];
	schools: any[];
	lastUpdated: string;
	userId: string;
}

export interface OfflineState {
	isOnline: boolean;
	hasLocalData: boolean;
	lastSyncTime: string | null;
	pendingActions: OfflineAction[];
}

export interface OfflineAction {
	id: string;
	type: 'mark_read' | 'create_announcement' | 'update_announcement' | 'delete_announcement';
	data: any;
	timestamp: string;
	retryCount: number;
}

// Core offline stores
export const offlineState = writable<OfflineState>({
	isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
	hasLocalData: false,
	lastSyncTime: null,
	pendingActions: []
});

// Local storage utilities
class OfflineStorage {
	private static readonly KEYS = {
		DASHBOARD_DATA: 'toekomst_dashboard_data',
		OFFLINE_STATE: 'toekomst_offline_state',
		PENDING_ACTIONS: 'toekomst_pending_actions'
	};

	static saveDashboardData(data: DashboardData): void {
		if (typeof window === 'undefined') return;
		
		try {
			const dataToSave = {
				...data,
				lastUpdated: new Date().toISOString()
			};
			
			console.log('Saving dashboard data to localStorage:', {
				workshopsCount: data.workshops?.length || 0,
				announcementsCount: data.announcements?.length || 0,
				schoolsCount: data.schools?.length || 0,
				userId: data.userId
			});
			
			const serialized = JSON.stringify(dataToSave);
			localStorage.setItem(this.KEYS.DASHBOARD_DATA, serialized);
			
			// Update offline state
			offlineState.update(state => ({
				...state,
				hasLocalData: true,
				lastSyncTime: new Date().toISOString()
			}));
			
			this.saveOfflineState();
			console.log('Dashboard data saved successfully');
		} catch (error) {
			console.error('Failed to save dashboard data:', error);
		}
	}

	static loadDashboardData(): DashboardData | null {
		if (typeof window === 'undefined') return null;
		
		try {
			const stored = localStorage.getItem(this.KEYS.DASHBOARD_DATA);
			if (!stored) {
				console.log('No dashboard data found in localStorage');
				return null;
			}
			
			const data = JSON.parse(stored);
			console.log('Loaded dashboard data from localStorage:', {
				workshopsCount: data.workshops?.length || 0,
				announcementsCount: data.announcements?.length || 0,
				schoolsCount: data.schools?.length || 0,
				userId: data.userId,
				lastUpdated: data.lastUpdated
			});
			
			// Check if data is stale (older than 24 hours)
			const lastUpdated = new Date(data.lastUpdated);
			const now = new Date();
			const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
			
			if (hoursDiff > 24) {
				console.log('Local dashboard data is stale, will refresh when online');
			}
			
			return data;
		} catch (error) {
			console.error('Failed to load dashboard data:', error);
			return null;
		}
	}

	static addPendingAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): void {
		if (typeof window === 'undefined') return;
		
		const fullAction: OfflineAction = {
			...action,
			id: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			retryCount: 0
		};

		offlineState.update(state => ({
			...state,
			pendingActions: [...state.pendingActions, fullAction]
		}));

		this.savePendingActions();
	}

	static removePendingAction(actionId: string): void {
		offlineState.update(state => ({
			...state,
			pendingActions: state.pendingActions.filter(action => action.id !== actionId)
		}));

		this.savePendingActions();
	}

	static incrementRetryCount(actionId: string): void {
		offlineState.update(state => ({
			...state,
			pendingActions: state.pendingActions.map(action => 
				action.id === actionId 
					? { ...action, retryCount: action.retryCount + 1 }
					: action
			)
		}));

		this.savePendingActions();
	}

	private static savePendingActions(): void {
		if (typeof window === 'undefined') return;
		
		try {
			const state = get(offlineState);
			localStorage.setItem(this.KEYS.PENDING_ACTIONS, JSON.stringify(state.pendingActions));
		} catch (error) {
			console.error('Failed to save pending actions:', error);
		}
	}

	private static saveOfflineState(): void {
		if (typeof window === 'undefined') return;
		
		try {
			const state = get(offlineState);
			const stateToSave = {
				hasLocalData: state.hasLocalData,
				lastSyncTime: state.lastSyncTime
			};
			localStorage.setItem(this.KEYS.OFFLINE_STATE, JSON.stringify(stateToSave));
		} catch (error) {
			console.error('Failed to save offline state:', error);
		}
	}

	static loadOfflineState(): void {
		if (typeof window === 'undefined') return;
		
		try {
			const stored = localStorage.getItem(this.KEYS.OFFLINE_STATE);
			const pendingActions = localStorage.getItem(this.KEYS.PENDING_ACTIONS);
			
			if (stored) {
				const savedState = JSON.parse(stored);
				const actions = pendingActions ? JSON.parse(pendingActions) : [];
				
				offlineState.update(state => ({
					...state,
					hasLocalData: savedState.hasLocalData || false,
					lastSyncTime: savedState.lastSyncTime || null,
					pendingActions: actions
				}));
			}
		} catch (error) {
			console.error('Failed to load offline state:', error);
		}
	}

	static clearAll(): void {
		if (typeof window === 'undefined') return;
		
		Object.values(this.KEYS).forEach(key => {
			localStorage.removeItem(key);
		});
		
		offlineState.set({
			isOnline: navigator.onLine,
			hasLocalData: false,
			lastSyncTime: null,
			pendingActions: []
		});
	}
}

// Derived stores
export const isOffline = derived(offlineState, ($state) => !$state.isOnline);
export const hasPendingActions = derived(offlineState, ($state) => $state.pendingActions.length > 0);
export const syncStatus = derived(offlineState, ($state) => {
	if (!$state.isOnline) return 'offline';
	if ($state.pendingActions.length > 0) return 'syncing';
	if ($state.hasLocalData) return 'synced';
	return 'unknown';
});

// Actions
export const offlineActions = {
	// Initialize offline functionality
	initialize() {
		if (typeof window === 'undefined') return;
		
		// Load saved state
		OfflineStorage.loadOfflineState();
		
		// Set up online/offline listeners
		const updateOnlineStatus = () => {
			offlineState.update(state => ({
				...state,
				isOnline: navigator.onLine
			}));
			
			// When coming back online, try to sync pending actions
			if (navigator.onLine) {
				this.syncPendingActions();
			}
		};
		
		window.addEventListener('online', updateOnlineStatus);
		window.addEventListener('offline', updateOnlineStatus);
		
		// Initial status
		updateOnlineStatus();
	},

	// Save dashboard data for offline use
	saveDashboardData(workshops: any[], announcements: Announcement[], schools: any[], userId: string) {
		const data: DashboardData = {
			workshops,
			announcements,
			schools,
			lastUpdated: new Date().toISOString(),
			userId
		};
		
		OfflineStorage.saveDashboardData(data);
	},

	// Load dashboard data from local storage
	loadDashboardData(): DashboardData | null {
		return OfflineStorage.loadDashboardData();
	},

	// Add action to be synced when online
	addPendingAction(type: OfflineAction['type'], data: any) {
		OfflineStorage.addPendingAction({ type, data });
	},

	// Sync pending actions when online
	async syncPendingActions() {
		const state = get(offlineState);
		if (!state.isOnline || state.pendingActions.length === 0) return;

		const actionsToSync = [...state.pendingActions];
		
		for (const action of actionsToSync) {
			try {
				await this.executePendingAction(action);
				OfflineStorage.removePendingAction(action.id);
			} catch (error) {
				console.error('Failed to sync action:', action, error);
				
				// If retry count is less than 3, increment it
				if (action.retryCount < 3) {
					OfflineStorage.incrementRetryCount(action.id);
				} else {
					// Remove action after 3 failed attempts
					console.warn('Removing action after 3 failed attempts:', action);
					OfflineStorage.removePendingAction(action.id);
				}
			}
		}
	},

	// Execute a pending action
	async executePendingAction(action: OfflineAction) {
		switch (action.type) {
			case 'mark_read':
				await this.syncMarkAsRead(action.data.announcementId, action.data.userId);
				break;
			case 'create_announcement':
				await this.syncCreateAnnouncement(action.data);
				break;
			case 'update_announcement':
				await this.syncUpdateAnnouncement(action.data.id, action.data.updates);
				break;
			case 'delete_announcement':
				await this.syncDeleteAnnouncement(action.data.id, action.data.userId);
				break;
			default:
				console.warn('Unknown action type:', action.type);
		}
	},

	// Sync helper methods
	async syncMarkAsRead(announcementId: string, userId: string) {
		const response = await fetch(`/api/announcements/${announcementId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				action: 'mark_read',
				userId: userId
			})
		});

		if (!response.ok) {
			throw new Error('Failed to sync mark as read');
		}
	},

	async syncCreateAnnouncement(data: any) {
		const response = await fetch('/api/announcements', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			throw new Error('Failed to sync create announcement');
		}
	},

	async syncUpdateAnnouncement(id: string, updates: any) {
		const response = await fetch(`/api/announcements/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updates)
		});

		if (!response.ok) {
			throw new Error('Failed to sync update announcement');
		}
	},

	async syncDeleteAnnouncement(id: string, userId: string) {
		const response = await fetch(`/api/announcements/${id}?userId=${userId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			throw new Error('Failed to sync delete announcement');
		}
	},

	// Clear all local data
	clearLocalData() {
		OfflineStorage.clearAll();
	},

	// Get sync status information
	getSyncInfo() {
		const state = get(offlineState);
		return {
			isOnline: state.isOnline,
			hasLocalData: state.hasLocalData,
			lastSyncTime: state.lastSyncTime,
			pendingActionsCount: state.pendingActions.length,
			syncStatus: get(syncStatus)
		};
	}
};

// Auto-initialize when in browser
if (typeof window !== 'undefined') {
	offlineActions.initialize();
}

export { OfflineStorage };