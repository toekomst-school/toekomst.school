import { json } from '@sveltejs/kit';
import { Client, Teams, Users } from 'node-appwrite';
import type { RequestHandler } from './$types';
import dotenv from 'dotenv';
dotenv.config();

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const teams = new Teams(serverClient);
const users = new Users(serverClient);

// GET: List team members
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { teamId } = params;
		
		console.log('[TEAM MEMBERS API] Fetching members for team:', teamId);
		console.log('[TEAM MEMBERS API] API Key present:', !!process.env.APPWRITE_API_KEY);
		console.log('[TEAM MEMBERS API] API Key length:', process.env.APPWRITE_API_KEY?.length || 0);
		console.log('[TEAM MEMBERS API] API Key first 10 chars:', process.env.APPWRITE_API_KEY?.substring(0, 10) || 'N/A');
		
		// Create a fresh client instance to avoid any caching issues
		const freshClient = new Client()
			.setEndpoint('https://write.toekomst.school/v1')
			.setProject('toekomstschool')
			.setKey(process.env.APPWRITE_API_KEY || '');
		
		const freshTeams = new Teams(freshClient);
		
		const members = await freshTeams.listMemberships(teamId);
		console.log('[TEAM MEMBERS API] Members fetched successfully:', members.memberships?.length || 0);
		
		return json({ 
			success: true, 
			members: members.memberships || [] 
		});
	} catch (error) {
		console.error('[TEAM MEMBERS API] Error fetching team members:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to fetch team members' 
		}, { status: 500 });
	}
};

// POST: Add member to team
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { teamId } = params;
		const { userId, email, roles = ['member'] } = await request.json();

		if (!userId && !email) {
			return json({ success: false, error: 'Either userId or email is required' }, { status: 400 });
		}

		let membership;
		if (userId) {
			// Add existing user to team
			membership = await teams.createMembership(
				teamId,
				roles,
				userId
			);
		} else {
			// Invite user by email
			membership = await teams.createMembership(
				teamId,
				roles,
				undefined, // userId
				email
			);
		}
		
		return json({ 
			success: true, 
			membership 
		});
	} catch (error) {
		console.error('Error adding team member:', error);
		return json({ success: false, error: 'Failed to add team member' }, { status: 500 });
	}
};