import type { RequestHandler } from './$types';
import { addConnection, removeConnection } from '$lib/server/announcements-broadcast';

// GET - Server-Sent Events stream for real-time announcement updates
export const GET: RequestHandler = async ({ request }) => {
	// Check if client supports SSE
	const headers = new Headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Cache-Control'
	});

	const stream = new ReadableStream({
		start(controller) {
			// Add this connection to our set
			addConnection(controller);
			
			// Send initial connection message
			const welcomeMessage = `data: ${JSON.stringify({ 
				type: 'connected', 
				message: 'Real-time announcement updates connected',
				timestamp: Date.now() 
			})}\n\n`;
			
			controller.enqueue(new TextEncoder().encode(welcomeMessage));
			
			// Send periodic heartbeat to keep connection alive
			const heartbeat = setInterval(() => {
				try {
					const heartbeatMessage = `data: ${JSON.stringify({ 
						type: 'heartbeat', 
						timestamp: Date.now() 
					})}\n\n`;
					
					controller.enqueue(new TextEncoder().encode(heartbeatMessage));
				} catch (error) {
					// Client disconnected
					clearInterval(heartbeat);
					removeConnection(controller);
				}
			}, 30000); // Send heartbeat every 30 seconds
			
			// Clean up when client disconnects
			request.signal.addEventListener('abort', () => {
				clearInterval(heartbeat);
				removeConnection(controller);
				try {
					controller.close();
				} catch (error) {
					// Already closed
				}
			});
		},
		
		cancel() {
			// Client closed connection
			removeConnection(this as any);
		}
	});

	return new Response(stream, { headers });
};

// Note: broadcastAnnouncementUpdate function is available for import directly from this module
// in server-side contexts, but should not be exported as a SvelteKit endpoint