import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple test endpoint to check if the API is accessible
export const GET: RequestHandler = async () => {
	try {
		return json({ 
			success: true, 
			message: 'Teams API is accessible',
			timestamp: new Date().toISOString(),
			env: {
				hasApiKey: !!process.env.APPWRITE_API_KEY,
				endpoint: process.env.APPWRITE_ENDPOINT || 'not set',
				project: process.env.APPWRITE_PROJECT || 'not set'
			}
		});
	} catch (error) {
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Unknown error' 
		}, { status: 500 });
	}
};