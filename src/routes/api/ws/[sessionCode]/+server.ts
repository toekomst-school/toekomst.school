import type { RequestHandler } from './$types';

// Store active sessions and their connections
const sessions = new Map<string, {
	presenter: WebSocket | null;
	controllers: Set<WebSocket>;
	currentSlide: number;
	totalSlides: number;
}>();

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

	// Initialize session if it doesn't exist
	if (!sessions.has(sessionCode)) {
		sessions.set(sessionCode, {
			presenter: null,
			controllers: new Set(),
			currentSlide: 0,
			totalSlides: 0
		});
	}

	const session = sessions.get(sessionCode)!;

	socket.onopen = () => {
		console.log(`WebSocket connected to session: ${sessionCode}`);
	};

	socket.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);
			console.log(`Message from ${sessionCode}:`, data);

			switch (data.type) {
				case 'register-presenter':
					session.presenter = socket;
					session.totalSlides = data.totalSlides || 0;
					broadcastToControllers(sessionCode, {
						type: 'slide-update',
						current: session.currentSlide,
						total: session.totalSlides
					});
					break;

				case 'register-controller':
					session.controllers.add(socket);
					// Send current slide info to new controller
					socket.send(JSON.stringify({
						type: 'slide-update',
						current: session.currentSlide,
						total: session.totalSlides
					}));
					// Notify presenter about new connection
					if (session.presenter) {
						session.presenter.send(JSON.stringify({
							type: 'controller-count',
							count: session.controllers.size
						}));
					}
					break;

				case 'slide-change':
					session.currentSlide = data.current;
					session.totalSlides = data.total;
					broadcastToControllers(sessionCode, {
						type: 'slide-update',
						current: data.current,
						total: data.total
					});
					break;

				case 'command':
					// Forward command from controller to presenter
					if (session.presenter && session.presenter.readyState === WebSocket.OPEN) {
						session.presenter.send(JSON.stringify({
							type: 'remote-command',
							command: data.command
						}));
					}
					break;
			}
		} catch (error) {
			console.error('Error parsing WebSocket message:', error);
		}
	};

	socket.onclose = () => {
		console.log(`WebSocket disconnected from session: ${sessionCode}`);
		
		const session = sessions.get(sessionCode);
		if (session) {
			// Remove from controllers if it was a controller
			session.controllers.delete(socket);
			
			// Clear presenter if it was the presenter
			if (session.presenter === socket) {
				session.presenter = null;
			}

			// Update controller count for presenter
			if (session.presenter) {
				session.presenter.send(JSON.stringify({
					type: 'controller-count',
					count: session.controllers.size
				}));
			}

			// Clean up empty sessions
			if (!session.presenter && session.controllers.size === 0) {
				sessions.delete(sessionCode);
			}
		}
	};

	socket.onerror = (error) => {
		console.error(`WebSocket error for session ${sessionCode}:`, error);
	};

	return response;
};

function broadcastToControllers(sessionCode: string, message: any) {
	const session = sessions.get(sessionCode);
	if (!session) return;

	const messageStr = JSON.stringify(message);
	session.controllers.forEach((controller) => {
		if (controller.readyState === WebSocket.OPEN) {
			controller.send(messageStr);
		}
	});
}