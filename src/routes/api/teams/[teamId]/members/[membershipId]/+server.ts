import { json } from '@sveltejs/kit';
import { Client, Teams, Users } from 'node-appwrite';
import type { RequestHandler } from './$types';

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const teams = new Teams(serverClient);
const users = new Users(serverClient);

// GET: Get membership details
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { teamId, membershipId } = params;
		
		const membership = await teams.getMembership(teamId, membershipId);
		
		return json({ 
			success: true, 
			membership 
		});
	} catch (error) {
		console.error('Error fetching membership:', error);
		return json({ success: false, error: 'Failed to fetch membership' }, { status: 500 });
	}
};

// PUT: Update membership (roles or status)
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { teamId, membershipId } = params;
		const { roles, status } = await request.json();

		let membership;
		if (roles) {
			// Update member roles
			membership = await teams.updateMembership(teamId, membershipId, roles);
		}

		if (status === 'disabled') {
			// Disable user account
			const membershipData = await teams.getMembership(teamId, membershipId);
			if (membershipData.userId) {
				await users.updateStatus(membershipData.userId, false);
			}
		} else if (status === 'enabled') {
			// Enable user account
			const membershipData = await teams.getMembership(teamId, membershipId);
			if (membershipData.userId) {
				await users.updateStatus(membershipData.userId, true);
			}
		}
		
		return json({ 
			success: true, 
			membership: membership || { status: 'updated' }
		});
	} catch (error) {
		console.error('Error updating membership:', error);
		return json({ success: false, error: 'Failed to update membership' }, { status: 500 });
	}
};

// DELETE: Remove member from team
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { teamId, membershipId } = params;
		
		await teams.deleteMembership(teamId, membershipId);
		
		return json({ 
			success: true, 
			message: 'Member removed from team successfully' 
		});
	} catch (error) {
		console.error('Error removing team member:', error);
		return json({ success: false, error: 'Failed to remove team member' }, { status: 500 });
	}
};