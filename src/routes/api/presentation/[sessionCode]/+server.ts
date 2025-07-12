import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple in-memory store for presentation sessions
const sessions = new Map<string, {
	currentSlide: number;
	totalSlides: number;
	connectedDevices: number;
	lastUpdate: number;
	slides?: string;
}>();

export const GET: RequestHandler = async ({ params }) => {
	const { sessionCode } = params;
	
	const session = sessions.get(sessionCode);
	if (!session) {
		return json({ error: 'Session not found' }, { status: 404 });
	}
	
	return json({
		currentSlide: session.currentSlide,
		totalSlides: session.totalSlides,
		connectedDevices: session.connectedDevices,
		lastUpdate: session.lastUpdate,
		slides: session.slides
	});
};

export const POST: RequestHandler = async ({ params, request }) => {
	const { sessionCode } = params;
	const data = await request.json();
	
	// Initialize session if it doesn't exist
	if (!sessions.has(sessionCode)) {
		sessions.set(sessionCode, {
			currentSlide: 0,
			totalSlides: 0,
			connectedDevices: 0,
			lastUpdate: Date.now(),
			slides: ''
		});
	}
	
	const session = sessions.get(sessionCode)!;
	
	switch (data.type) {
		case 'init-presenter':
			session.totalSlides = data.totalSlides || 0;
			session.slides = data.slides || '';
			session.lastUpdate = Date.now();
			break;
			
		case 'slide-change':
			session.currentSlide = data.current;
			session.totalSlides = data.total;
			session.lastUpdate = Date.now();
			break;
			
		case 'connect-device':
			session.connectedDevices = Math.max(0, session.connectedDevices + 1);
			session.lastUpdate = Date.now();
			
			// If slides data is provided, update the session
			if (data.slides) {
				session.slides = data.slides;
				session.totalSlides = data.totalSlides || 0;
			}
			break;
			
		case 'disconnect-device':
			session.connectedDevices = Math.max(0, session.connectedDevices - 1);
			session.lastUpdate = Date.now();
			break;
			
		case 'command':
			// Store the command for the presenter to pick up
			(session as any).lastCommand = {
				command: data.command,
				timestamp: Date.now()
			};
			session.lastUpdate = Date.now();
			break;
	}
	
	return json({ success: true, session });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const { sessionCode } = params;
	sessions.delete(sessionCode);
	return json({ success: true });
};