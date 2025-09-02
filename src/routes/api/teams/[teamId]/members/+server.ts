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
		
		const memberships = await freshTeams.listMemberships(teamId);
		console.log('[TEAM MEMBERS API] Memberships fetched successfully:', memberships.memberships?.length || 0);
		
		// Fetch user details for each membership
		const membersWithDetails = await Promise.all(
			memberships.memberships.map(async (membership) => {
				try {
					const userDetails = await users.get(membership.userId);
					return {
						$id: membership.$id,
						userId: membership.userId,
						userName: userDetails.name,
						userEmail: userDetails.email,
						roles: membership.roles,
						status: membership.status,
						joined: membership.joined
					};
				} catch (userError) {
					console.warn('[TEAM MEMBERS API] Failed to fetch user details for:', membership.userId);
					return {
						$id: membership.$id,
						userId: membership.userId,
						userName: 'Unknown User',
						userEmail: 'unknown@example.com',
						roles: membership.roles,
						status: membership.status,
						joined: membership.joined
					};
				}
			})
		);
		
		console.log('[TEAM MEMBERS API] Members with details processed:', membersWithDetails.length);
		
		return json({ 
			success: true, 
			members: membersWithDetails 
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
		const { userId, email, roles = ['member'], name, role } = await request.json();

		if (!userId && !email) {
			return json({ success: false, error: 'Either userId or email is required' }, { status: 400 });
		}

		let membership;
		let createdUser;

		if (userId) {
			// Add existing user to team
			membership = await teams.createMembership(
				teamId,
				roles,
				userId
			);
		} else if (email && name && role) {
			// Create new user and add to team
			try {
				console.log('[TEAM MEMBERS API] Creating new user:', name, email, role);
				
				// Create the user
				createdUser = await users.create(
					'unique()', // Let Appwrite generate unique ID
					email,
					undefined, // No phone
					'defaultPassword123', // Default password - user should change this
					name
				);
				
				// Set user labels based on role
				const userLabels = role === 'teacher' ? ['docent'] : ['student'];
				await users.updateLabels(createdUser.$id, userLabels);
				
				// Set membership roles based on role
				const membershipRoles = role === 'teacher' 
					? ['teacher', 'owner'] 
					: ['member', 'student'];
				
				// Add user to team
				membership = await teams.createMembership(
					teamId,
					membershipRoles,
					createdUser.$id
				);
				
				console.log('[TEAM MEMBERS API] User created and added to team:', createdUser.$id);
				
			} catch (userError) {
				console.error('[TEAM MEMBERS API] Failed to create user:', userError);
				return json({ 
					success: false, 
					error: `Failed to create user: ${userError instanceof Error ? userError.message : 'Unknown error'}` 
				}, { status: 500 });
			}
		} else {
			// Invite user by email (existing functionality)
			membership = await teams.createMembership(
				teamId,
				roles,
				undefined, // userId
				email
			);
		}
		
		return json({ 
			success: true, 
			membership,
			createdUser
		});
	} catch (error) {
		console.error('Error adding team member:', error);
		return json({ success: false, error: 'Failed to add team member' }, { status: 500 });
	}
};