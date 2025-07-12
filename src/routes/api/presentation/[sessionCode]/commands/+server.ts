import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple in-memory store - in production you'd use a proper database/cache
const sessionCommands = new Map<string, {
	command: string;
	timestamp: number;
}[]>();

export const GET: RequestHandler = async ({ params, url }) => {
	const { sessionCode } = params;
	const since = parseInt(url.searchParams.get('since') || '0');
	
	const commands = sessionCommands.get(sessionCode) || [];
	const newCommands = commands.filter(cmd => cmd.timestamp > since);
	
	return json({
		commands: newCommands,
		lastUpdate: commands.length > 0 ? Math.max(...commands.map(c => c.timestamp)) : Date.now()
	});
};

export const POST: RequestHandler = async ({ params, request }) => {
	const { sessionCode } = params;
	const { command } = await request.json();
	
	if (!sessionCommands.has(sessionCode)) {
		sessionCommands.set(sessionCode, []);
	}
	
	const commands = sessionCommands.get(sessionCode)!;
	commands.push({
		command,
		timestamp: Date.now()
	});
	
	// Keep only last 10 commands to prevent memory leak
	if (commands.length > 10) {
		commands.splice(0, commands.length - 10);
	}
	
	return json({ success: true });
};