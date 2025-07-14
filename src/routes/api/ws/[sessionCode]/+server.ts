import type { RequestHandler } from './$types';
import { sessionStore } from '$lib/server/sessionStore.js';

export const GET: RequestHandler = async ({ params, request }) => {
	const { sessionCode } = params;
	const upgradeHeader = request.headers.get('upgrade');

	if (upgradeHeader !== 'websocket') {
		return new Response('Expected websocket', { status: 426 });
	}

	// For Node.js environments, we need to handle WebSocket upgrade differently
	// This would work with adapters that support WebSocket like @sveltejs/adapter-node
	const webSocketPair = new WebSocketPair();
	const [client, server] = Object.values(webSocketPair);
	
	const socket = server;

	// Get or create session using shared store
	const session = sessionStore.getSession(sessionCode);

	socket.onopen = () => {
		console.log(`WebSocket connected to session: ${sessionCode}`);
	};

	socket.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);
			console.log(`WebSocket message from ${sessionCode}:`, data);

			switch (data.type) {
				case 'register-presenter':
					sessionStore.registerPresenter(sessionCode, socket);
					if (data.totalSlides) {
						sessionStore.updateSlideState(sessionCode, session.currentSlide, data.totalSlides);
					}
					
					// Send current session state to presenter
					socket.send(JSON.stringify({
						type: 'session-state',
						currentSlide: session.currentSlide,
						totalSlides: session.totalSlides,
						connectedDevices: session.connectedDevices,
						slides: session.slides,
						workshopData: session.workshopData
					}));
					
					// Broadcast to controllers
					sessionStore.broadcastToControllers(sessionCode, {
						type: 'slide-update',
						current: session.currentSlide,
						total: session.totalSlides
					});
					break;

				case 'register-controller':
					sessionStore.registerController(sessionCode, socket);
					
					// Send current slide info to new controller
					socket.send(JSON.stringify({
						type: 'slide-update',
						current: session.currentSlide,
						total: session.totalSlides
					}));
					
					// Notify presenter about new connection
					sessionStore.sendToPresenter(sessionCode, {
						type: 'controller-count',
						count: session.controllers.size
					});
					break;

				case 'slide-change':
					sessionStore.updateSlideState(sessionCode, data.current, data.total);
					
					// Broadcast to all controllers
					sessionStore.broadcastToControllers(sessionCode, {
						type: 'slide-update',
						current: data.current,
						total: data.total
					});
					break;

				case 'command':
					// Add command to store
					const commandId = sessionStore.addCommand(sessionCode, data.command);
					
					// Forward directly to presenter
					const sent = sessionStore.sendToPresenter(sessionCode, {
						type: 'remote-command',
						command: data.command,
						commandId
					});
					
					console.log('🎮 WebSocket command forwarded:', {
						sessionCode,
						command: data.command,
						commandId,
						sent
					});
					break;

				case 'ping':
					// Respond to ping with pong
					socket.send(JSON.stringify({ type: 'pong' }));
					break;
			}
		} catch (error) {
			console.error('Error parsing WebSocket message:', error);
		}
	};

	socket.onclose = () => {
		console.log(`WebSocket disconnected from session: ${sessionCode}`);
		
		sessionStore.removeConnection(sessionCode, socket);
		
		// Update controller count for presenter if still connected
		const session = sessionStore.getSession(sessionCode);
		sessionStore.sendToPresenter(sessionCode, {
			type: 'controller-count',
			count: session.controllers.size
		});
	};

	socket.onerror = (error) => {
		console.error(`WebSocket error for session ${sessionCode}:`, error);
	};

	return new Response(null, {
		status: 101,
		webSocket: client
	});
};