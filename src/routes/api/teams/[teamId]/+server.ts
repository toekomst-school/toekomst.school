import { json } from '@sveltejs/kit';
import { Client, Teams } from 'node-appwrite';
import type { RequestHandler } from './$types';

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const teams = new Teams(serverClient);

// GET: Get team details
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { teamId } = params;
		
		const team = await teams.get(teamId);
		
		return json({ 
			success: true, 
			team 
		});
	} catch (error) {
		console.error('Error fetching team:', error);
		return json({ success: false, error: 'Failed to fetch team' }, { status: 500 });
	}
};

// PUT: Update team details
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { teamId } = params;
		const { name } = await request.json();

		if (!name) {
			return json({ success: false, error: 'Missing team name' }, { status: 400 });
		}

		const team = await teams.updateName(teamId, name);
		
		return json({ 
			success: true, 
			team 
		});
	} catch (error) {
		console.error('Error updating team:', error);
		return json({ success: false, error: 'Failed to update team' }, { status: 500 });
	}
};

// DELETE: Delete team
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { teamId } = params;
		
		await teams.delete(teamId);
		
		return json({ 
			success: true, 
			message: 'Team deleted successfully' 
		});
	} catch (error) {
		console.error('Error deleting team:', error);
		return json({ success: false, error: 'Failed to delete team' }, { status: 500 });
	}
};