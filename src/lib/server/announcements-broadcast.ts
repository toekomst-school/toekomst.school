// Simple in-memory store for SSE connections
const connections = new Set<ReadableStreamDefaultController>();

// Function to broadcast updates to all connected clients
export function broadcastAnnouncementUpdate(type: string, data?: any) {
	const message = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
	
	// Send to all connected clients
	connections.forEach(controller => {
		try {
			controller.enqueue(new TextEncoder().encode(message));
		} catch (error) {
			// Remove disconnected clients
			connections.delete(controller);
		}
	});
}

// Function to add a connection
export function addConnection(controller: ReadableStreamDefaultController) {
	connections.add(controller);
}

// Function to remove a connection
export function removeConnection(controller: ReadableStreamDefaultController) {
	connections.delete(controller);
}