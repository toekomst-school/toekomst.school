/**
 * Connection Manager for Presentation System
 * Handles WebSocket connections with intelligent HTTP fallback
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

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

export interface ConnectionManagerConfig {
	sessionCode: string;
	isPresenter?: boolean;
	onSlideUpdate?: (current: number, total: number) => void;
	onCommand?: (command: string, commandId: string) => void;
	onLessonUpdate?: (slides: string, totalSlides: number, workshopData?: any) => void;
	onControllerCount?: (count: number) => void;
	onSessionState?: (state: SessionData) => void;
}

class ConnectionManager {
	private config: ConnectionManagerConfig;
	private ws: WebSocket | null = null;
	private wsUrl: string;
	private httpUrl: string;
	private commandsUrl: string;
	
	// Connection state
	private connectionState = writable<ConnectionState>('disconnected');
	private connectionError = writable<string>('');
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000; // Start with 1 second
	private maxReconnectDelay = 30000; // Max 30 seconds
	
	// HTTP fallback
	private httpPollInterval: NodeJS.Timeout | null = null;
	private commandPollInterval: NodeJS.Timeout | null = null;
	private lastCommandCheck = 0;
	private usingHttpFallback = false;
	
	// Message queue for offline commands
	private messageQueue: Array<{message: any; timestamp: number}> = [];
	
	// Public reactive stores
	public state = derived(this.connectionState, $state => $state);
	public error = derived(this.connectionError, $error => $error);
	public isConnected = derived(this.connectionState, $state => $state === 'connected');
	public isConnecting = derived(this.connectionState, $state => $state === 'connecting' || $state === 'reconnecting');

	constructor(config: ConnectionManagerConfig) {
		this.config = config;
		
		if (!browser) return;
		
		// Build URLs
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const httpProtocol = window.location.protocol;
		const host = window.location.host;
		
		this.wsUrl = `${protocol}//${host}/api/ws/${config.sessionCode}`;
		this.httpUrl = `${httpProtocol}//${host}/api/presentation/${config.sessionCode}`;
		this.commandsUrl = `${httpProtocol}//${host}/api/presentation/${config.sessionCode}/commands`;
	}

	/**
	 * Connect to the session
	 */
	async connect(): Promise<void> {
		if (!browser) return;
		
		this.connectionState.set('connecting');
		this.connectionError.set('');
		
		// Try WebSocket first
		try {
			await this.connectWebSocket();
		} catch (error) {
			console.warn('WebSocket connection failed, falling back to HTTP polling:', error);
			this.fallbackToHttp();
		}
	}

	/**
	 * Attempt WebSocket connection
	 */
	private async connectWebSocket(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(this.wsUrl);
				
				const connectionTimeout = setTimeout(() => {
					if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
						this.ws.close();
						reject(new Error('WebSocket connection timeout'));
					}
				}, 5000);

				this.ws.onopen = () => {
					clearTimeout(connectionTimeout);
					console.log('🔌 WebSocket connected to session:', this.config.sessionCode);
					
					this.connectionState.set('connected');
					this.reconnectAttempts = 0;
					this.usingHttpFallback = false;
					
					// Stop HTTP polling if it was running
					this.stopHttpPolling();
					
					// Register with the server
					this.registerWithServer();
					
					// Process queued messages
					this.processMessageQueue();
					
					resolve();
				};

				this.ws.onmessage = (event) => {
					try {
						const data = JSON.parse(event.data);
						this.handleWebSocketMessage(data);
					} catch (error) {
						console.error('Error parsing WebSocket message:', error);
					}
				};

				this.ws.onclose = (event) => {
					clearTimeout(connectionTimeout);
					console.log('🔌 WebSocket disconnected:', event.code, event.reason);
					
					if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
						this.reconnect();
					} else {
						this.fallbackToHttp();
					}
				};

				this.ws.onerror = (error) => {
					clearTimeout(connectionTimeout);
					console.error('🔌 WebSocket error:', error);
					reject(error);
				};

			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Handle incoming WebSocket messages
	 */
	private handleWebSocketMessage(data: any): void {
		switch (data.type) {
			case 'slide-update':
				this.config.onSlideUpdate?.(data.current, data.total);
				break;
				
			case 'remote-command':
				this.config.onCommand?.(data.command, data.commandId);
				break;
				
			case 'lesson-update':
				this.config.onLessonUpdate?.(data.slides, data.totalSlides, data.workshopData);
				break;
				
			case 'controller-count':
				this.config.onControllerCount?.(data.count);
				break;
				
			case 'session-state':
				this.config.onSessionState?.(data);
				break;
				
			case 'pong':
				// Heartbeat response
				break;
				
			default:
				console.log('Unknown WebSocket message type:', data.type);
		}
	}

	/**
	 * Register this client with the server
	 */
	private registerWithServer(): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
		
		const message = {
			type: this.config.isPresenter ? 'register-presenter' : 'register-controller'
		};
		
		this.sendWebSocketMessage(message);
	}

	/**
	 * Send message via WebSocket
	 */
	private sendWebSocketMessage(message: any): boolean {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			// Queue message for later
			this.messageQueue.push({ message, timestamp: Date.now() });
			return false;
		}
		
		try {
			this.ws.send(JSON.stringify(message));
			return true;
		} catch (error) {
			console.error('Error sending WebSocket message:', error);
			this.messageQueue.push({ message, timestamp: Date.now() });
			return false;
		}
	}

	/**
	 * Process queued messages
	 */
	private processMessageQueue(): void {
		const now = Date.now();
		const maxAge = 30000; // 30 seconds
		
		// Filter out old messages
		this.messageQueue = this.messageQueue.filter(item => now - item.timestamp < maxAge);
		
		// Send remaining messages
		this.messageQueue.forEach(item => {
			this.sendWebSocketMessage(item.message);
		});
		
		this.messageQueue = [];
	}

	/**
	 * Reconnect with exponential backoff
	 */
	private async reconnect(): Promise<void> {
		this.reconnectAttempts++;
		this.connectionState.set('reconnecting');
		
		const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
		
		console.log(`🔄 Reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
		
		setTimeout(async () => {
			try {
				await this.connectWebSocket();
			} catch (error) {
				console.error('Reconnection failed:', error);
				if (this.reconnectAttempts >= this.maxReconnectAttempts) {
					this.fallbackToHttp();
				}
			}
		}, delay);
	}

	/**
	 * Fallback to HTTP polling
	 */
	private fallbackToHttp(): void {
		console.log('📡 Falling back to HTTP polling');
		
		this.usingHttpFallback = true;
		this.connectionState.set('connected'); // Still consider it "connected" via HTTP
		this.connectionError.set('Using HTTP fallback (WebSocket unavailable)');
		
		// Start HTTP polling
		this.startHttpPolling();
	}

	/**
	 * Start HTTP polling for session updates
	 */
	private startHttpPolling(): void {
		// Poll for session updates every 1 second
		this.httpPollInterval = setInterval(async () => {
			try {
				const response = await fetch(this.httpUrl);
				if (response.ok) {
					const data = await response.json();
					
					// Trigger callbacks based on data changes
					this.config.onSlideUpdate?.(data.currentSlide, data.totalSlides);
					this.config.onSessionState?.(data);
				} else if (response.status === 404) {
					this.connectionError.set('Session not found');
					this.disconnect();
				}
			} catch (error) {
				console.error('HTTP polling error:', error);
			}
		}, 1000);
		
		// Poll for commands if this is a presenter
		if (this.config.isPresenter) {
			this.commandPollInterval = setInterval(async () => {
				try {
					const response = await fetch(`${this.commandsUrl}?since=${this.lastCommandCheck}`);
					if (response.ok) {
						const data = await response.json();
						
						data.commands.forEach((cmd: any) => {
							this.config.onCommand?.(cmd.command, cmd.id);
						});
						
						if (data.lastUpdate > this.lastCommandCheck) {
							this.lastCommandCheck = data.lastUpdate;
						}
					}
				} catch (error) {
					console.error('Command polling error:', error);
				}
			}, 250); // Check for commands more frequently
		}
	}

	/**
	 * Stop HTTP polling
	 */
	private stopHttpPolling(): void {
		if (this.httpPollInterval) {
			clearInterval(this.httpPollInterval);
			this.httpPollInterval = null;
		}
		
		if (this.commandPollInterval) {
			clearInterval(this.commandPollInterval);
			this.commandPollInterval = null;
		}
	}

	/**
	 * Send a command (works with both WebSocket and HTTP)
	 */
	async sendCommand(command: string): Promise<void> {
		if (!this.usingHttpFallback) {
			// Try WebSocket first
			const sent = this.sendWebSocketMessage({
				type: 'command',
				command
			});
			
			if (sent) return; // Successfully sent via WebSocket
		}
		
		// Fallback to HTTP
		try {
			await fetch(this.commandsUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command })
			});
		} catch (error) {
			console.error('Error sending command via HTTP:', error);
			throw error;
		}
	}

	/**
	 * Send slide change update (presenter only)
	 */
	async sendSlideChange(current: number, total: number): Promise<void> {
		if (!this.config.isPresenter) return;
		
		if (!this.usingHttpFallback) {
			// Try WebSocket first
			const sent = this.sendWebSocketMessage({
				type: 'slide-change',
				current,
				total
			});
			
			if (sent) return;
		}
		
		// Fallback to HTTP
		try {
			await fetch(this.httpUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'slide-change',
					current,
					total
				})
			});
		} catch (error) {
			console.error('Error sending slide change via HTTP:', error);
		}
	}

	/**
	 * Initialize presenter with slides data
	 */
	async initPresenter(slides: string, totalSlides: number): Promise<void> {
		if (!this.config.isPresenter) return;
		
		if (!this.usingHttpFallback) {
			// Try WebSocket first
			const sent = this.sendWebSocketMessage({
				type: 'register-presenter',
				slides,
				totalSlides
			});
			
			if (sent) return;
		}
		
		// Fallback to HTTP
		try {
			await fetch(this.httpUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'init-presenter',
					slides,
					totalSlides
				})
			});
		} catch (error) {
			console.error('Error initializing presenter via HTTP:', error);
		}
	}

	/**
	 * Connect as controller device
	 */
	async connectDevice(slides?: string, totalSlides?: number): Promise<void> {
		if (this.config.isPresenter) return;
		
		if (!this.usingHttpFallback) {
			// WebSocket registration happens automatically
			return;
		}
		
		// HTTP fallback
		try {
			await fetch(this.httpUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'connect-device',
					slides,
					totalSlides
				})
			});
		} catch (error) {
			console.error('Error connecting device via HTTP:', error);
		}
	}

	/**
	 * Send lesson/workshop update
	 */
	async sendLessonUpdate(slides: string, totalSlides: number, workshopData?: any, workshopStartTime?: string, workshopEndTime?: string): Promise<void> {
		const data = {
			type: 'update-slides',
			slides,
			totalSlides,
			workshopData,
			workshopStartTime,
			workshopEndTime
		};
		
		// Always use HTTP for lesson updates to ensure persistence
		try {
			await fetch(this.httpUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
		} catch (error) {
			console.error('Error sending lesson update:', error);
			throw error;
		}
	}

	/**
	 * Get current connection info
	 */
	getConnectionInfo(): { isWebSocket: boolean; state: ConnectionState; error: string } {
		return {
			isWebSocket: !this.usingHttpFallback,
			state: this.connectionState,
			error: this.connectionError
		};
	}

	/**
	 * Disconnect and cleanup
	 */
	disconnect(): void {
		this.connectionState.set('disconnected');
		
		// Close WebSocket
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		
		// Stop HTTP polling
		this.stopHttpPolling();
		
		// Clear message queue
		this.messageQueue = [];
		
		// Send disconnect notification via HTTP if we were connected
		if (this.usingHttpFallback) {
			fetch(this.httpUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type: 'disconnect-device' })
			}).catch(() => {}); // Ignore errors on disconnect
		}
	}

	/**
	 * Force reconnection
	 */
	async forceReconnect(): Promise<void> {
		this.disconnect();
		this.reconnectAttempts = 0;
		await this.connect();
	}
}

/**
 * Factory function to create connection manager
 */
export function createConnectionManager(config: ConnectionManagerConfig): ConnectionManager {
	return new ConnectionManager(config);
}

/**
 * Connection health checker
 */
export class ConnectionHealthChecker {
	private manager: ConnectionManager;
	private healthInterval: NodeJS.Timeout | null = null;
	
	constructor(manager: ConnectionManager) {
		this.manager = manager;
	}
	
	start(): void {
		this.healthInterval = setInterval(() => {
			// Send ping to check connection health
			if (this.manager.getConnectionInfo().isWebSocket) {
				(this.manager as any).sendWebSocketMessage({ type: 'ping' });
			}
		}, 30000); // Ping every 30 seconds
	}
	
	stop(): void {
		if (this.healthInterval) {
			clearInterval(this.healthInterval);
			this.healthInterval = null;
		}
	}
}