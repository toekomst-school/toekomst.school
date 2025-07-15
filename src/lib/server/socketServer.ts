/**
 * Socket.IO Server for Presentation System
 * Handles real-time communication between presenters and controllers
 */

import { Server as SocketIOServer } from 'socket.io';
import { sessionStore } from './sessionStore.js';
import type { Server } from 'http';

export interface SocketSession {
	sessionCode: string;
	isPresenter: boolean;
	socketId: string;
}

let io: SocketIOServer | null = null;
const socketSessions = new Map<string, SocketSession>();

export function initializeSocketIO(server: Server): SocketIOServer {
	io = new SocketIOServer(server, {
		cors: {
			origin: "*",
			methods: ["GET", "POST"]
		},
		path: '/socket.io/',
		transports: ['websocket', 'polling']
	});

	io.on('connection', (socket) => {
		console.log(`Socket.IO client connected: ${socket.id}`);

		// Handle joining a session
		socket.on('join-session', (data: { sessionCode: string; isPresenter: boolean }) => {
			const { sessionCode, isPresenter } = data;
			console.log(`Socket ${socket.id} joining session ${sessionCode} as ${isPresenter ? 'presenter' : 'controller'}`);

			// Store session info
			socketSessions.set(socket.id, {
				sessionCode,
				isPresenter,
				socketId: socket.id
			});

			// Join the session room
			socket.join(sessionCode);

			// Get or create session
			const session = sessionStore.getSession(sessionCode);

			if (isPresenter) {
				// Register presenter
				sessionStore.registerPresenter(sessionCode, socket as any);
				
				// Send current session state to presenter
				socket.emit('session-state', {
					currentSlide: session.currentSlide,
					totalSlides: session.totalSlides,
					connectedDevices: session.connectedDevices,
					slides: session.slides,
					workshopData: session.workshopData,
					workshopStartTime: session.workshopStartTime,
					workshopEndTime: session.workshopEndTime
				});
			} else {
				// Register controller
				sessionStore.registerController(sessionCode, socket as any);
				
				// Send current session state to controller (including slides and workshop data)
				socket.emit('session-state', {
					currentSlide: session.currentSlide,
					totalSlides: session.totalSlides,
					connectedDevices: session.connectedDevices,
					slides: session.slides,
					workshopData: session.workshopData,
					workshopStartTime: session.workshopStartTime,
					workshopEndTime: session.workshopEndTime
				});
			}

			// Broadcast updated controller count to all clients in session
			const updatedSession = sessionStore.getSession(sessionCode);
			io?.to(sessionCode).emit('controller-count', {
				count: updatedSession.connectedDevices
			});
		});

		// Handle commands from controllers
		socket.on('command', (data: { command: string; commandId: string; sessionCode: string }) => {
			const { command, commandId, sessionCode } = data;
			console.log(`Command received: ${command} for session ${sessionCode}`);

			// Store command in session
			sessionStore.addCommand(sessionCode, command);

			// Send command to presenter
			socket.to(sessionCode).emit('remote-command', {
				command,
				commandId
			});
		});

		// Handle slide changes from presenter
		socket.on('slide-change', (data: { current: number; total: number; sessionCode: string }) => {
			const { current, total, sessionCode } = data;
			console.log(`Slide change: ${current}/${total} for session ${sessionCode}`);

			// Update session state
			sessionStore.updateSlideState(sessionCode, current, total);

			// Broadcast to all controllers in session
			socket.to(sessionCode).emit('slide-update', {
				current,
				total
			});
		});

		// Handle presenter initialization
		socket.on('init-presenter', (data: { slides: string; totalSlides: number; sessionCode: string }) => {
			const { slides, totalSlides, sessionCode } = data;
			console.log(`Presenter initialized for session ${sessionCode} with ${totalSlides} slides`);

			// Update session with slides
			sessionStore.updateSlides(sessionCode, slides, totalSlides);

			// Broadcast to all controllers in session
			socket.to(sessionCode).emit('lesson-update', {
				slides,
				totalSlides
			});
		});

		// Handle device connection
		socket.on('connect-device', (data: { slides?: string; totalSlides?: number; sessionCode: string }) => {
			const { slides, totalSlides, sessionCode } = data;
			console.log(`Device connected to session ${sessionCode}`);

			if (slides && totalSlides) {
				// Update session with slides from device
				sessionStore.updateSlides(sessionCode, slides, totalSlides);

				// Broadcast to presenter and other controllers
				socket.to(sessionCode).emit('lesson-update', {
					slides,
					totalSlides
				});
			}
		});

		// Handle lesson updates
		socket.on('lesson-update', (data: { 
			slides: string; 
			totalSlides: number; 
			workshopData?: any; 
			workshopStartTime?: string; 
			workshopEndTime?: string; 
			sessionCode: string 
		}) => {
			const { slides, totalSlides, workshopData, workshopStartTime, workshopEndTime, sessionCode } = data;
			console.log(`Lesson update for session ${sessionCode}`);

			// Update session with lesson data
			sessionStore.updateSlides(sessionCode, slides, totalSlides);
			if (workshopData || workshopStartTime || workshopEndTime) {
				sessionStore.updateWorkshopData(sessionCode, workshopData, workshopStartTime, workshopEndTime);
			}

			// Broadcast to all clients in session
			io?.to(sessionCode).emit('lesson-update', {
				slides,
				totalSlides,
				workshopData
			});
		});

		// Handle disconnection
		socket.on('disconnect', (reason) => {
			console.log(`Socket ${socket.id} disconnected: ${reason}`);
			
			const sessionInfo = socketSessions.get(socket.id);
			if (sessionInfo) {
				const { sessionCode, isPresenter } = sessionInfo;
				
				// Remove the connection using the generic method
				sessionStore.removeConnection(sessionCode, socket as any);

				// Broadcast updated controller count
				const session = sessionStore.getSession(sessionCode);
				io?.to(sessionCode).emit('controller-count', {
					count: session.connectedDevices
				});

				// Clean up session info
				socketSessions.delete(socket.id);
			}
		});

		// Handle errors
		socket.on('error', (error) => {
			console.error(`Socket ${socket.id} error:`, error);
		});
	});

	return io;
}

export function getSocketIO(): SocketIOServer | null {
	return io;
}