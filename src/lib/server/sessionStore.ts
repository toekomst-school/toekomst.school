/**
 * Unified session store for both Socket.IO and HTTP APIs
 * Provides thread-safe operations and session management
 */

import type { Socket } from 'socket.io';

export interface SessionData {
	// Slide state
	currentSlide: number;
	totalSlides: number;
	slides?: string;
	
	// Connection state
	connectedDevices: number;
	presenter: Socket | null;
	controllers: Set<Socket>;
	
	// Workshop data
	workshopStartTime?: string;
	workshopEndTime?: string;
	workshopData?: any;
	
	// Commands and timing
	lastUpdate: number;
	pendingCommands: Array<{
		command: string;
		timestamp: number;
		id: string;
	}>;
	
	// Session metadata
	createdAt: number;
	lastActivity: number;
}

class SessionStore {
	private sessions = new Map<string, SessionData>();
	private cleanupInterval: NodeJS.Timeout;
	
	constructor() {
		// Clean up inactive sessions every 5 minutes
		this.cleanupInterval = setInterval(() => {
			this.cleanupInactiveSessions();
		}, 5 * 60 * 1000);
	}

	/**
	 * Get a session, creating it if it doesn't exist
	 */
	getSession(sessionCode: string): SessionData {
		if (!this.sessions.has(sessionCode)) {
			this.sessions.set(sessionCode, this.createSession());
		}
		
		const session = this.sessions.get(sessionCode)!;
		session.lastActivity = Date.now();
		return session;
	}

	/**
	 * Create a new session with default values
	 */
	private createSession(): SessionData {
		const now = Date.now();
		return {
			currentSlide: 0,
			totalSlides: 0,
			connectedDevices: 0,
			presenter: null,
			controllers: new Set(),
			lastUpdate: now,
			pendingCommands: [],
			createdAt: now,
			lastActivity: now
		};
	}

	/**
	 * Update slide state
	 */
	updateSlideState(sessionCode: string, current: number, total?: number): void {
		const session = this.getSession(sessionCode);
		session.currentSlide = current;
		if (total !== undefined) {
			session.totalSlides = total;
		}
		session.lastUpdate = Date.now();
		session.lastActivity = Date.now();
	}

	/**
	 * Update slides content
	 */
	updateSlides(sessionCode: string, slides: string, totalSlides?: number): void {
		const session = this.getSession(sessionCode);
		session.slides = slides;
		if (totalSlides !== undefined) {
			session.totalSlides = totalSlides;
		}
		session.lastUpdate = Date.now();
		session.lastActivity = Date.now();
	}

	/**
	 * Update workshop data
	 */
	updateWorkshopData(sessionCode: string, workshopData: any, startTime?: string, endTime?: string): void {
		const session = this.getSession(sessionCode);
		session.workshopData = workshopData;
		if (startTime) session.workshopStartTime = startTime;
		if (endTime) session.workshopEndTime = endTime;
		session.lastUpdate = Date.now();
		session.lastActivity = Date.now();
	}

	/**
	 * Add a command to the session
	 */
	addCommand(sessionCode: string, command: string): string {
		const session = this.getSession(sessionCode);
		const commandId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		session.pendingCommands.push({
			command,
			timestamp: Date.now(),
			id: commandId
		});

		// Keep only last 20 commands to prevent memory leak
		if (session.pendingCommands.length > 20) {
			session.pendingCommands.splice(0, session.pendingCommands.length - 20);
		}

		session.lastUpdate = Date.now();
		session.lastActivity = Date.now();
		return commandId;
	}

	/**
	 * Get commands since a specific timestamp
	 */
	getCommandsSince(sessionCode: string, since: number): Array<{command: string; timestamp: number; id: string}> {
		const session = this.getSession(sessionCode);
		return session.pendingCommands.filter(cmd => cmd.timestamp > since);
	}

	/**
	 * Register a Socket.IO socket as presenter
	 */
	registerPresenter(sessionCode: string, socket: Socket): void {
		const session = this.getSession(sessionCode);
		
		// Disconnect existing presenter if any
		if (session.presenter && session.presenter.connected) {
			session.presenter.disconnect();
		}
		
		session.presenter = socket;
		session.lastActivity = Date.now();
	}

	/**
	 * Register a Socket.IO socket as controller
	 */
	registerController(sessionCode: string, socket: Socket): void {
		const session = this.getSession(sessionCode);
		session.controllers.add(socket);
		session.connectedDevices = session.controllers.size;
		session.lastActivity = Date.now();
	}

	/**
	 * Remove a Socket.IO connection
	 */
	removeConnection(sessionCode: string, socket: Socket): void {
		const session = this.sessions.get(sessionCode);
		if (!session) return;

		// Remove from controllers
		session.controllers.delete(socket);
		session.connectedDevices = session.controllers.size;

		// Clear presenter if it was the presenter
		if (session.presenter === socket) {
			session.presenter = null;
		}

		session.lastActivity = Date.now();

		// Clean up empty sessions
		if (!session.presenter && session.controllers.size === 0) {
			this.sessions.delete(sessionCode);
		}
	}

	/**
	 * Increment connected devices count (for HTTP clients)
	 */
	incrementDeviceCount(sessionCode: string): void {
		const session = this.getSession(sessionCode);
		session.connectedDevices++;
		session.lastActivity = Date.now();
	}

	/**
	 * Decrement connected devices count (for HTTP clients)
	 */
	decrementDeviceCount(sessionCode: string): void {
		const session = this.getSession(sessionCode);
		session.connectedDevices = Math.max(0, session.connectedDevices - 1);
		session.lastActivity = Date.now();
	}

	/**
	 * Broadcast message to all controllers via Socket.IO
	 */
	broadcastToControllers(sessionCode: string, eventName: string, data: any): void {
		const session = this.sessions.get(sessionCode);
		if (!session) return;

		session.controllers.forEach((controller) => {
			if (controller.connected) {
				try {
					controller.emit(eventName, data);
				} catch (error) {
					console.error('Error sending message to controller:', error);
					// Remove broken connection
					session.controllers.delete(controller);
				}
			} else {
				// Remove disconnected connections
				session.controllers.delete(controller);
			}
		});

		// Update device count after cleanup
		session.connectedDevices = session.controllers.size;
	}

	/**
	 * Send message to presenter via Socket.IO
	 */
	sendToPresenter(sessionCode: string, eventName: string, data: any): boolean {
		const session = this.sessions.get(sessionCode);
		if (!session || !session.presenter) return false;

		if (session.presenter.connected) {
			try {
				session.presenter.emit(eventName, data);
				return true;
			} catch (error) {
				console.error('Error sending message to presenter:', error);
				session.presenter = null;
				return false;
			}
		} else {
			session.presenter = null;
			return false;
		}
	}

	/**
	 * Check if session exists
	 */
	hasSession(sessionCode: string): boolean {
		return this.sessions.has(sessionCode);
	}

	/**
	 * Delete a session
	 */
	deleteSession(sessionCode: string): void {
		const session = this.sessions.get(sessionCode);
		if (session) {
			// Disconnect all Socket.IO connections
			if (session.presenter && session.presenter.connected) {
				session.presenter.disconnect();
			}
			session.controllers.forEach(controller => {
				if (controller.connected) {
					controller.disconnect();
				}
			});
		}
		this.sessions.delete(sessionCode);
	}

	/**
	 * Clean up sessions that have been inactive for more than 2 hours
	 */
	private cleanupInactiveSessions(): void {
		const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
		
		for (const [sessionCode, session] of this.sessions.entries()) {
			if (session.lastActivity < twoHoursAgo) {
				console.log(`Cleaning up inactive session: ${sessionCode}`);
				this.deleteSession(sessionCode);
			}
		}
	}

	/**
	 * Get session statistics
	 */
	getStats(): {totalSessions: number; activeSessions: number} {
		const now = Date.now();
		const oneHourAgo = now - (60 * 60 * 1000);
		
		let activeSessions = 0;
		for (const session of this.sessions.values()) {
			if (session.lastActivity > oneHourAgo) {
				activeSessions++;
			}
		}

		return {
			totalSessions: this.sessions.size,
			activeSessions
		};
	}

	/**
	 * Cleanup method for graceful shutdown
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		
		// Close all sessions
		for (const sessionCode of this.sessions.keys()) {
			this.deleteSession(sessionCode);
		}
	}
}

// Export singleton instance
export const sessionStore = new SessionStore();