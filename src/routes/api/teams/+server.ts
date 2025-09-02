import { json } from '@sveltejs/kit';
import { Client, Teams, Users } from 'node-appwrite';
import type { RequestHandler } from './$types';
import type { TeamCreateRequest } from '$lib/types/teams';
import dotenv from 'dotenv';
dotenv.config();

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const teams = new Teams(serverClient);
const users = new Users(serverClient);

// Helper function to check if user can access teams
async function canAccessTeams(userId: string): Promise<boolean> {
	try {
		const user = await users.get(userId);
		const userLabels = user.labels || [];
		
		// Only admin, planning, and vakdocent can access teams
		return userLabels.includes('admin') || userLabels.includes('planning') || userLabels.includes('vakdocent');
	} catch (error) {
		console.error('[TEAMS API] Error checking user permissions:', error);
		return false;
	}
}

// Helper function to check if user is super admin
async function isSuperAdmin(userId: string): Promise<boolean> {
	try {
		const user = await users.get(userId);
		const userLabels = user.labels || [];
		return userLabels.includes('admin');
	} catch (error) {
		console.error('[TEAMS API] Error checking super admin permissions:', error);
		return false;
	}
}

// GET: List all teams
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		// Check if API key is configured
		if (!process.env.APPWRITE_API_KEY) {
			console.error('[TEAMS API] APPWRITE_API_KEY environment variable is not set');
			return json({ 
				success: false, 
				error: 'Server configuration error: API key not configured' 
			}, { status: 500 });
		}

		const userId = url.searchParams.get('userId');
		if (!userId) {
			return json({ success: false, error: 'Missing userId parameter' }, { status: 400 });
		}

		// Check if user has permission to access teams
		const hasPermission = await canAccessTeams(userId);
		if (!hasPermission) {
			return json({ success: false, error: 'Only admin, planning, and vakdocent can access teams' }, { status: 403 });
		}

		console.log('[TEAMS API] Attempting to list teams...');
		const result = await teams.list();
		
		// Filter out class teams (teams with specific naming pattern for classes)
		const regularTeams = result.teams.filter(team => 
			!team.name.includes(' - 202') && // Filter out year-based class teams
			!team.name.endsWith('klas') // Filter out teams ending with 'klas'
		);
		
		console.log('[TEAMS API] Teams fetched successfully:', regularTeams.length);
		
		return json({ 
			success: true, 
			teams: regularTeams 
		});
	} catch (error) {
		console.error('[TEAMS API] Error fetching teams:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to fetch teams' 
		}, { status: 500 });
	}
};

// POST: Create new team
export const POST: RequestHandler = async ({ request }) => {
	try {
		const teamData: TeamCreateRequest = await request.json();
		const { name, adminUserId, description, location, phoneNumber, emailAddress, type, capacity, isPublic } = teamData;

		if (!name || !adminUserId) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		// Check if user has permission to create teams
		const hasPermission = await canAccessTeams(adminUserId);
		if (!hasPermission) {
			return json({ success: false, error: 'Only admin, planning, and vakdocent can create teams' }, { status: 403 });
		}

		// Check if user is super admin for enhanced features
		const isUserSuperAdmin = await isSuperAdmin(adminUserId);

		// Create team
		const team = await teams.create(
			'unique()', // Let Appwrite generate unique ID
			name,
			['owner'] // Default roles
		);

		// Prepare team preferences with enhanced data
		const teamPrefs: any = {
			type: type || 'workforce',
			description: description || ''
		};

		// Add enhanced fields only if user is super admin
		if (isUserSuperAdmin) {
			if (location) teamPrefs.location = location;
			if (phoneNumber) teamPrefs.phoneNumber = phoneNumber;
			if (emailAddress) teamPrefs.emailAddress = emailAddress;
			if (capacity) teamPrefs.capacity = capacity;
			if (typeof isPublic === 'boolean') teamPrefs.isPublic = isPublic;
		}

		// Set team preferences with enhanced data
		await teams.updatePrefs(team.$id, teamPrefs);

		// Add the admin user as team owner
		await teams.createMembership(
			team.$id,
			['owner'],
			adminUserId
		);

		return json({ 
			success: true, 
			team: {
				...team,
				prefs: teamPrefs
			}
		});
	} catch (error) {
		console.error('Error creating team:', error);
		return json({ success: false, error: 'Failed to create team' }, { status: 500 });
	}
};