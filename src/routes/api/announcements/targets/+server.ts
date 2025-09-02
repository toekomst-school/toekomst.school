import { json } from '@sveltejs/kit';
import { Client, Databases, Users, Teams, Query } from 'node-appwrite';
import type { RequestHandler } from './$types';
import type { AnnouncementTarget } from '$lib/types/announcements';
import dotenv from 'dotenv';
dotenv.config();

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(serverClient);
const users = new Users(serverClient);
const teams = new Teams(serverClient);

// GET - Get available targets for user
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		// Check if API key is configured
		if (!process.env.APPWRITE_API_KEY) {
			console.error('[ANNOUNCEMENTS TARGETS API] APPWRITE_API_KEY environment variable is not set');
			return json({ 
				error: 'Server configuration error: API key not configured' 
			}, { status: 500 });
		}

		// Get userId from URL parameters
		const userId = url.searchParams.get('userId');
		if (!userId) {
			return json({ error: 'Missing userId parameter' }, { status: 400 });
		}

		const targets: AnnouncementTarget[] = [];
		const userLabels = await getUserLabels(userId);

		// Get user's teams using Appwrite Teams API
		try {
			const teamsResponse = await teams.list();
			
			for (const team of teamsResponse.teams) {
				// Check if user is a member of this team
				try {
					const memberships = await teams.listMemberships(team.$id);
					const isMember = memberships.memberships.some(membership => membership.userId === userId);
					
					if (isMember) {
						targets.push({
							id: team.$id,
							name: team.name || 'Team',
							type: 'team',
							memberCount: team.total || 0,
							description: `Team: ${team.name}`
						});
					}
				} catch (membershipError) {
					console.warn(`Could not check membership for team ${team.$id}:`, membershipError);
					// Continue to next team
				}
			}
		} catch (error) {
			console.error('Error fetching teams:', error);
			// Continue without teams - don't fail the entire request
		}

		// Get user's classes (classes are also teams but with different purpose)
		// For now, we'll treat all teams as potential classes - could be refined later with metadata
		if (userLabels.includes('teacher') || userLabels.includes('planning') || userLabels.includes('admin')) {
			try {
				const allTeamsResponse = await teams.list();
				
				for (const team of allTeamsResponse.teams) {
					// Check if user has access to this team (either as member or if admin)
					let hasAccess = userLabels.includes('admin');
					
					if (!hasAccess) {
						try {
							const memberships = await teams.listMemberships(team.$id);
							hasAccess = memberships.memberships.some(membership => membership.userId === userId);
						} catch (membershipError) {
							// Continue to next team if can't check membership
							continue;
						}
					}
					
					if (hasAccess) {
						// Only add as class if it's not already added as a team
						const alreadyAdded = targets.some(target => target.id === team.$id);
						if (!alreadyAdded) {
							targets.push({
								id: team.$id,
								name: team.name || 'Class',
								type: 'class',
								memberCount: team.total || 0,
								description: `Class: ${team.name}`
							});
						}
					}
				}
			} catch (error) {
				console.error('Error fetching classes (teams):', error);
				// Continue without classes - don't fail the entire request
			}
		}

		// Get schools (if admin or planning)
		if (userLabels.includes('admin') || userLabels.includes('planning')) {
			try {
				const schoolsResponse = await databases.listDocuments('scholen', 'school', [
					Query.equal('KLANT', true),
					Query.limit(100)
				]);

				for (const school of schoolsResponse.documents) {
					// Get total member count across all teams associated with school
					let memberCount = 0;
					try {
						// Since teams are now in Appwrite Teams, we can't easily filter by schoolId
						// For now, just use 0 or estimate based on school size
						memberCount = 0; // Could be enhanced later with team metadata
					} catch (error) {
						// Continue without member count
					}

					targets.push({
						id: school.$id,
						name: school.NAAM || school.name || 'School',
						type: 'school',
						memberCount,
						description: `School-wide announcements`
					});
				}
			} catch (error) {
				console.error('Error fetching schools:', error);
				// Continue without schools - don't fail the entire request
			}
		}

		// Sort targets by type and name
		targets.sort((a, b) => {
			if (a.type !== b.type) {
				const typeOrder = ['team', 'class', 'school'];
				return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
			}
			return a.name.localeCompare(b.name);
		});

		return json({ targets });

	} catch (error) {
		console.error('Error fetching targets:', error);
		return json({ error: 'Failed to fetch targets' }, { status: 500 });
	}
};

async function getUserLabels(userId: string): Promise<string[]> {
	try {
		const user = await users.get(userId);
		return user.labels || [];
	} catch (error) {
		console.error('Error getting user labels:', error);
		return [];
	}
}