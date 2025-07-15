import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessionStore } from '$lib/server/sessionStore.js';

export const GET: RequestHandler = async ({ params, url }) => {
	const { sessionCode } = params;
	const since = parseInt(url.searchParams.get('since') || '0');
	
	const commands = sessionStore.getCommandsSince(sessionCode, since);
	
	return json({
		commands: commands,
		lastUpdate: commands.length > 0 ? Math.max(...commands.map(c => c.timestamp)) : Date.now()
	});
};

export const POST: RequestHandler = async ({ params, request }) => {
	const { sessionCode } = params;
	const { command } = await request.json();
	
	// Add command to shared store
	const commandId = sessionStore.addCommand(sessionCode, command);
	
	// Socket.IO will handle command forwarding via the server automatically
	console.log('🎮 Command API - Command processed:', {
		sessionCode,
		command,
		commandId
	});
	
	return json({ success: true, commandId });
};