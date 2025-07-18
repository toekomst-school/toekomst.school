import { json } from '@sveltejs/kit';
import { Client, Databases, Users, Query } from 'node-appwrite';
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

		// Get user's teams
		const teamsResponse = await databases.listDocuments('main', 'teams', [
			Query.equal('members', userId),
			Query.limit(100)
		]);

		for (const team of teamsResponse.documents) {
			targets.push({
				id: team.$id,
				name: team.name || 'Team',
				type: 'team',
				memberCount: team.members?.length || 0,
				description: team.description
			});
		}

		// Get user's classes (if teacher or has planning role)
		if (userLabels.includes('teacher') || userLabels.includes('planning') || userLabels.includes('admin')) {
			let classQueries = [Query.limit(100)];
			
			// If not admin, filter by user's classes
			if (!userLabels.includes('admin')) {
				classQueries.push(Query.equal('teacherId', userId));
			}

			const classesResponse = await databases.listDocuments('main', 'classes', classQueries);

			for (const classDoc of classesResponse.documents) {
				// Get student count from associated team
				let memberCount = 0;
				try {
					if (classDoc.teamId) {
						const classTeam = await databases.getDocument('main', 'teams', classDoc.teamId);
						memberCount = classTeam.members?.length || 0;
					}
				} catch (error) {
					// Team might not exist
				}

				targets.push({
					id: classDoc.$id,
					name: classDoc.name || 'Class',
					type: 'class',
					memberCount,
					description: `${classDoc.schoolName || 'School'} - ${classDoc.name || 'Class'}`
				});
			}
		}

		// Get schools (if admin or planning)
		if (userLabels.includes('admin') || userLabels.includes('planning')) {
			const schoolsResponse = await databases.listDocuments('scholen', 'school', [
				Query.equal('KLANT', true),
				Query.limit(100)
			]);

			for (const school of schoolsResponse.documents) {
				// Get total member count across all teams in school
				let memberCount = 0;
				try {
					const schoolTeams = await databases.listDocuments('main', 'teams', [
						Query.equal('schoolId', school.$id),
						Query.limit(100)
					]);
					
					memberCount = schoolTeams.documents.reduce((total, team) => {
						return total + (team.members?.length || 0);
					}, 0);
				} catch (error) {
					// School teams might not exist
				}

				targets.push({
					id: school.$id,
					name: school.NAAM || school.name || 'School',
					type: 'school',
					memberCount,
					description: `School-wide announcements`
				});
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