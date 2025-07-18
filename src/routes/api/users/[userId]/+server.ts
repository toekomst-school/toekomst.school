import { json } from '@sveltejs/kit';
import { Client, Users, Teams } from 'node-appwrite';
import type { RequestHandler } from './$types';

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const users = new Users(serverClient);
const teams = new Teams(serverClient);

// GET: Get user details with team info
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { userId } = params;
		
		const user = await users.get(userId);
		
		// Get user's team memberships
		let userTeams = [];
		try {
			const teamsList = await teams.list();
			for (const team of teamsList.teams) {
				try {
					const memberships = await teams.listMemberships(team.$id);
					const userMembership = memberships.memberships.find(m => m.userId === userId);
					if (userMembership) {
						userTeams.push({
							teamId: team.$id,
							teamName: team.name,
							roles: userMembership.roles,
							membershipId: userMembership.$id
						});
					}
				} catch (err) {
					// Skip teams where user has no access
					continue;
				}
			}
		} catch (err) {
			console.warn('Failed to fetch user teams:', err);
		}
		
		return json({ 
			success: true, 
			user: {
				...user,
				teams: userTeams
			}
		});
	} catch (error) {
		console.error('Error fetching user:', error);
		return json({ success: false, error: 'Failed to fetch user' }, { status: 500 });
	}
};

// PUT: Update user status or details
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { userId } = params;
		const { status, name, email, labels } = await request.json();

		let updatedUser;

		// Update user status
		if (status !== undefined) {
			const isEnabled = status === 'enabled';
			updatedUser = await users.updateStatus(userId, isEnabled);
		}

		// Update user name
		if (name) {
			updatedUser = await users.updateName(userId, name);
		}

		// Update user email
		if (email) {
			updatedUser = await users.updateEmail(userId, email);
		}

		// Update user labels/roles
		if (labels) {
			await users.updateLabels(userId, labels);
		}

		// Get updated user info
		const user = await users.get(userId);
		
		return json({ 
			success: true, 
			user 
		});
	} catch (error) {
		console.error('Error updating user:', error);
		return json({ success: false, error: 'Failed to update user' }, { status: 500 });
	}
};

// DELETE: Delete user
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { userId } = params;
		
		await users.delete(userId);
		
		return json({ 
			success: true, 
			message: 'User deleted successfully' 
		});
	} catch (error) {
		console.error('Error deleting user:', error);
		return json({ success: false, error: 'Failed to delete user' }, { status: 500 });
	}
};