/**
 * Socket.IO Connection Manager for Presentation System
 * Handles Socket.IO connections with automatic reconnection
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface SessionData {
	currentSlide: number;
	totalSlides: number;
	connectedDevices: number;
	lastUpdate: number;
	slides?: string;
	workshopStartTime?: string;
	workshopEndTime?: string;
	workshopData?: any;
}

export interface SocketManagerConfig {
	sessionCode: string;
	isPresenter?: boolean;
	onSlideUpdate?: (current: number, total: number) => void;
	onCommand?: (command: string, commandId: string) => void;
	onLessonUpdate?: (slides: string, totalSlides: number, workshopData?: any) => void;
	onControllerCount?: (count: number) => void;
	onSessionState?: (state: SessionData) => void;
}

class SocketManager {
	private config: SocketManagerConfig;
	private socket: Socket | null = null;
	
	// Connection state
	private connectionState = writable<ConnectionState>('disconnected');
	private connectionError = writable<string>('');
	private transportType = writable<string>('polling');
	
	// Public reactive stores
	public state = derived(this.connectionState, $state => $state);
	public error = derived(this.connectionError, $error => $error);
	public isConnected = derived(this.connectionState, $state => $state === 'connected');
	public isConnecting = derived(this.connectionState, $state => $state === 'connecting' || $state === 'reconnecting');
	public transport = derived(this.transportType, $transport => $transport);

	constructor(config: SocketManagerConfig) {
		this.config = config;
	}

	/**
	 * Connect to the session using Socket.IO
	 */
	async connect(): Promise<void> {
		if (!browser) return;
		
		this.connectionState.set('connecting');
		this.connectionError.set('');
		
		try {
			// Create Socket.IO client
			this.socket = io({
				path: '/socket.io/',
				autoConnect: false,
				reconnection: true,
				reconnectionDelay: 1000,
				reconnectionDelayMax: 5000,
				reconnectionAttempts: 5,
				timeout: 10000,
			});

			// Set up event handlers
			this.setupEventHandlers();

			// Connect to the socket
			this.socket.connect();

			// Join the session room
			this.socket.emit('join-session', {
				sessionCode: this.config.sessionCode,
				isPresenter: this.config.isPresenter || false
			});

		} catch (error) {
			console.error('Socket.IO connection failed:', error);
			this.connectionState.set('failed');
			this.connectionError.set(error instanceof Error ? error.message : 'Connection failed');
		}
	}

	/**
	 * Set up Socket.IO event handlers
	 */
	private setupEventHandlers(): void {
		if (!this.socket) return;

		// Connection events
		this.socket.on('connect', () => {
			console.log('🔌 Socket.IO connected to session:', this.config.sessionCode);
			this.connectionState.set('connected');
			this.connectionError.set('');
			
			// Update transport type on connection with a small delay to ensure engine is ready
			setTimeout(() => {
				const transport = this.socket?.io?.engine?.transport?.name || 'polling';
				this.transportType.set(transport);
				console.log('🚀 Initial transport:', transport);
			}, 100);
		});

		this.socket.on('disconnect', (reason) => {
			console.log('🔌 Socket.IO disconnected:', reason);
			this.connectionState.set('disconnected');
			
			if (reason === 'io server disconnect') {
				// Server disconnected, try to reconnect
				this.connectionState.set('reconnecting');
			}
		});

		this.socket.on('reconnect', () => {
			console.log('🔌 Socket.IO reconnected');
			this.connectionState.set('connected');
			this.connectionError.set('');
			
			// Rejoin session room after reconnection
			this.socket?.emit('join-session', {
				sessionCode: this.config.sessionCode,
				isPresenter: this.config.isPresenter || false
			});
		});

		this.socket.on('reconnect_attempt', () => {
			console.log('🔄 Socket.IO reconnection attempt');
			this.connectionState.set('reconnecting');
		});

		this.socket.on('reconnect_failed', () => {
			console.error('❌ Socket.IO reconnection failed');
			this.connectionState.set('failed');
			this.connectionError.set('Connection failed after multiple attempts');
		});

		this.socket.on('connect_error', (error) => {
			console.error('🔌 Socket.IO connection error:', error);
			this.connectionState.set('failed');
			this.connectionError.set(error.message || 'Connection error');
		});

		// Presentation events
		this.socket.on('slide-update', (data: { current: number; total: number }) => {
			this.config.onSlideUpdate?.(data.current, data.total);
		});

		this.socket.on('remote-command', (data: { command: string; commandId: string }) => {
			this.config.onCommand?.(data.command, data.commandId);
		});

		this.socket.on('lesson-update', (data: { slides: string; totalSlides: number; workshopData?: any }) => {
			this.config.onLessonUpdate?.(data.slides, data.totalSlides, data.workshopData);
		});

		this.socket.on('controller-count', (data: { count: number }) => {
			this.config.onControllerCount?.(data.count);
		});

		this.socket.on('session-state', (data: SessionData) => {
			this.config.onSessionState?.(data);
		});

		// Error handling
		this.socket.on('error', (error) => {
			console.error('Socket.IO error:', error);
			this.connectionError.set(error.message || 'Socket error');
		});

		// Transport monitoring
		this.socket.io.on('upgrade', () => {
			const newTransport = this.socket?.io?.engine?.transport?.name || 'polling';
			this.transportType.set(newTransport);
			console.log('🔄 Socket.IO transport upgraded to:', newTransport);
		});

		this.socket.io.on('upgradeError', (error) => {
			console.warn('❌ Socket.IO transport upgrade failed:', error);
		});
	}

	/**
	 * Send a command to the presentation
	 */
	async sendCommand(command: string): Promise<void> {
		if (!this.socket || !this.socket.connected) {
			console.warn('Socket not connected, cannot send command:', command);
			return;
		}

		const commandId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		this.socket.emit('command', {
			command,
			commandId,
			sessionCode: this.config.sessionCode
		});
	}

	/**
	 * Send slide change update (presenter only)
	 */
	async sendSlideChange(current: number, total: number): Promise<void> {
		if (!this.config.isPresenter || !this.socket || !this.socket.connected) return;

		this.socket.emit('slide-change', {
			current,
			total,
			sessionCode: this.config.sessionCode
		});
	}

	/**
	 * Initialize presenter with slides data
	 */
	async initPresenter(slides: string, totalSlides: number): Promise<void> {
		if (!this.config.isPresenter || !this.socket || !this.socket.connected) return;

		this.socket.emit('init-presenter', {
			slides,
			totalSlides,
			sessionCode: this.config.sessionCode
		});
	}

	/**
	 * Connect as controller device
	 */
	async connectDevice(slides?: string, totalSlides?: number): Promise<void> {
		if (this.config.isPresenter || !this.socket || !this.socket.connected) return;

		this.socket.emit('connect-device', {
			slides,
			totalSlides,
			sessionCode: this.config.sessionCode
		});
	}

	/**
	 * Send lesson/workshop update
	 */
	async sendLessonUpdate(slides: string, totalSlides: number, workshopData?: any, workshopStartTime?: string, workshopEndTime?: string): Promise<void> {
		if (!this.socket || !this.socket.connected) return;

		this.socket.emit('lesson-update', {
			slides,
			totalSlides,
			workshopData,
			workshopStartTime,
			workshopEndTime,
			sessionCode: this.config.sessionCode
		});
	}

	/**
	 * Get current connection info
	 */
	getConnectionInfo(): { isWebSocket: boolean; state: ConnectionState; error: string } {
		// Check actual Socket.IO transport being used
		const isWebSocket = this.socket?.connected && this.socket?.io?.engine?.transport?.name === 'websocket';
		
		return {
			isWebSocket: isWebSocket || false,
			state: this.connectionState,
			error: this.connectionError
		};
	}

	/**
	 * Disconnect and cleanup
	 */
	disconnect(): void {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}
		this.connectionState.set('disconnected');
		this.transportType.set('polling');
	}

	/**
	 * Force reconnection
	 */
	async forceReconnect(): Promise<void> {
		if (this.socket) {
			this.socket.disconnect();
			this.socket.connect();
		}
	}
}

/**
 * Factory function to create socket manager
 */
export function createSocketManager(config: SocketManagerConfig): SocketManager {
	return new SocketManager(config);
}