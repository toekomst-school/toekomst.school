import { json } from '@sveltejs/kit';
import { Client, Databases, Users, Query } from 'node-appwrite';
import type { RequestHandler } from './$types';
import type { 
	Announcement, 
	AnnouncementCreateRequest, 
	AnnouncementFilters,
	AnnouncementStats 
} from '$lib/types/announcements';
import { broadcastAnnouncementUpdate } from './stream/+server.js';
import dotenv from 'dotenv';
dotenv.config();

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(serverClient);
const users = new Users(serverClient);

const DATABASE_ID = 'main';
const COLLECTION_ID = 'announcements';

// GET - List announcements with filtering
export const GET: RequestHandler = async ({ request, url }) => {
	try {
		// Check if API key is configured
		if (!process.env.APPWRITE_API_KEY) {
			console.error('[ANNOUNCEMENTS API] APPWRITE_API_KEY environment variable is not set');
			return json({ 
				error: 'Server configuration error: API key not configured' 
			}, { status: 500 });
		}

		// Get userId from URL parameters (similar to teams API)
		const searchParams = url.searchParams;
		const userId = searchParams.get('userId');
		if (!userId) {
			return json({ error: 'Missing userId parameter' }, { status: 400 });
		}

		// Check if user has permission to access announcements
		const hasPermission = await canAccessAnnouncements(userId);
		if (!hasPermission) {
			return json({ error: 'Je hebt geen toestemming om mededelingen te beheren.' }, { status: 403 });
		}

		// Parse other query parameters
		const targetType = searchParams.get('targetType');
		const priority = searchParams.get('priority');
		const status = searchParams.get('status') || 'published';
		const unreadOnly = searchParams.get('unreadOnly') === 'true';
		const search = searchParams.get('search');
		const limit = parseInt(searchParams.get('limit') || '50');
		const offset = parseInt(searchParams.get('offset') || '0');
		const getStats = searchParams.get('stats') === 'true';

		// Check if announcements collection exists
		try {
			// Try to get collection info first
			await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [Query.limit(1)]);
		} catch (error) {
			console.error('[ANNOUNCEMENTS API] Collection not found:', error);
			return json({ 
				announcements: [], 
				total: 0,
				error: 'Announcements collection not found. Please create the database structure first.'
			});
		}

		// Build queries based on user permissions and filters
		const queries = [
			Query.equal('status', status),
			Query.orderDesc('$createdAt'),
			Query.limit(limit),
			Query.offset(offset)
		];

		// Add filters
		if (targetType) queries.push(Query.equal('targetType', targetType));
		if (priority) queries.push(Query.equal('priority', priority));
		if (search) queries.push(Query.search('title', search));

		// Get user's accessible targets (teams, classes they belong to)
		const userTargets = await getUserAccessibleTargets(userId);
		if (userTargets.length > 0) {
			queries.push(Query.equal('targetId', userTargets));
		}

		const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);
		
		let announcements = response.documents as Announcement[];

		// Filter unread if requested
		if (unreadOnly) {
			announcements = announcements.filter(a => !a.readBy.includes(userId));
		}

		// Get stats if requested
		let stats: AnnouncementStats | undefined;
		if (getStats) {
			stats = await getAnnouncementStats(userId, userTargets);
		}

		return json({
			announcements,
			total: response.total,
			stats
		});

	} catch (error) {
		console.error('Error fetching announcements:', error);
		return json({ error: 'Failed to fetch announcements' }, { status: 500 });
	}
};

// POST - Create new announcement
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const userId = body.userId;
		
		if (!userId) {
			return json({ error: 'Missing userId in request body' }, { status: 400 });
		}

		// Check if user has permission to create announcements
		const hasPermission = await canAccessAnnouncements(userId);
		if (!hasPermission) {
			return json({ error: 'Je hebt geen toestemming om mededelingen te beheren.' }, { status: 403 });
		}

		// Get user name
		const userName = await getUserName(userId);

		const data: AnnouncementCreateRequest = body;

		// Validate user has permission to send to target
		const hasTargetPermission = await validateUserTargetPermission(userId, data.targetType, data.targetId);
		if (!hasTargetPermission) {
			return json({ error: 'Insufficient permissions for target' }, { status: 403 });
		}

		// Get target name for display
		const targetName = await getTargetName(data.targetType, data.targetId);

		const announcementData = {
			...data,
			authorId: userId,
			authorName: userName,
			targetName,
			status: 'published',
			readBy: []
		};

		const announcement = await databases.createDocument(
			DATABASE_ID,
			COLLECTION_ID,
			'unique()',
			announcementData
		);

		// Broadcast real-time update
		try {
			broadcastAnnouncementUpdate('announcement_created', { 
				id: announcement.$id,
				targetType: announcement.targetType,
				targetId: announcement.targetId,
				priority: announcement.priority
			});
		} catch (error) {
			console.warn('Failed to broadcast announcement update:', error);
		}

		return json(announcement, { status: 201 });

	} catch (error) {
		console.error('Error creating announcement:', error);
		return json({ error: 'Failed to create announcement' }, { status: 500 });
	}
};

// Helper functions
async function canAccessAnnouncements(userId: string): Promise<boolean> {
	try {
		const userLabels = await getUserLabels(userId);
		
		// Only admin, planning, and teacher can access announcements
		return userLabels.includes('admin') || userLabels.includes('planning') || userLabels.includes('teacher');
	} catch (error) {
		console.error('[ANNOUNCEMENTS API] Error checking user permissions:', error);
		return false;
	}
}

async function getUserAccessibleTargets(userId: string): Promise<string[]> {
	const targets: string[] = [];

	try {
		// Get user's teams (with error handling for missing collection)
		try {
			const teamsResponse = await databases.listDocuments('main', 'teams', [
				Query.equal('members', userId),
				Query.limit(100)
			]);
			targets.push(...teamsResponse.documents.map(t => t.$id));
		} catch (error) {
			console.warn('[ANNOUNCEMENTS API] Teams collection not found, skipping teams targets');
		}

		// Get user's classes (through team assignments)
		try {
			const classesResponse = await databases.listDocuments('main', 'classes', [
				Query.equal('teamId', targets),
				Query.limit(100)
			]);
			targets.push(...classesResponse.documents.map(c => c.$id));
		} catch (error) {
			console.warn('[ANNOUNCEMENTS API] Classes collection not found, skipping classes targets');
		}

		// Add schools if user is admin
		const userLabels = await getUserLabels(userId);
		if (userLabels.includes('admin')) {
			try {
				const schoolsResponse = await databases.listDocuments('scholen', 'school', [
					Query.limit(100)
				]);
				targets.push(...schoolsResponse.documents.map(s => s.$id));
			} catch (error) {
				console.warn('[ANNOUNCEMENTS API] Schools collection not found, skipping schools targets');
			}
		}

	} catch (error) {
		console.error('Error getting user targets:', error);
	}

	return targets;
}

async function validateUserTargetPermission(userId: string, targetType: string, targetId: string): Promise<boolean> {
	try {
		const userLabels = await getUserLabels(userId);
		
		// Admins can send to anyone
		if (userLabels.includes('admin')) return true;

		// Check specific permissions based on target type
		switch (targetType) {
			case 'team':
				// User must be member of the team
				const team = await databases.getDocument('main', 'teams', targetId);
				return team.members.includes(userId);
				
			case 'class':
				// User must be teacher of the class or team member
				const classDoc = await databases.getDocument('main', 'classes', targetId);
				if (classDoc.teacherId === userId) return true;
				
				// Check if user is in the class's team
				const classTeam = await databases.getDocument('main', 'teams', classDoc.teamId);
				return classTeam.members.includes(userId);
				
			case 'school':
				// Only admins and planning role can send school-wide
				return userLabels.includes('admin') || userLabels.includes('planning');
				
			default:
				return false;
		}
	} catch (error) {
		console.error('Error validating permission:', error);
		return false;
	}
}

async function getTargetName(targetType: string, targetId: string): Promise<string> {
	try {
		switch (targetType) {
			case 'team':
				const team = await databases.getDocument('main', 'teams', targetId);
				return team.name || 'Team';
				
			case 'class':
				const classDoc = await databases.getDocument('main', 'classes', targetId);
				return classDoc.name || 'Class';
				
			case 'school':
				const school = await databases.getDocument('scholen', 'school', targetId);
				return school.NAAM || school.name || 'School';
				
			default:
				return 'Unknown';
		}
	} catch (error) {
		console.error('Error getting target name:', error);
		return 'Unknown';
	}
}

async function getUserLabels(userId: string): Promise<string[]> {
	try {
		const user = await users.get(userId);
		return user.labels || [];
	} catch (error) {
		console.error('Error getting user labels:', error);
		return [];
	}
}

async function getUserName(userId: string): Promise<string> {
	try {
		const user = await users.get(userId);
		return user.name || user.email || 'Anonymous User';
	} catch (error) {
		console.error('Error getting user name:', error);
		return 'Anonymous User';
	}
}

async function getAnnouncementStats(userId: string, userTargets: string[]): Promise<AnnouncementStats> {
	try {
		// Get all user's announcements
		const allResponse = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
			Query.equal('targetId', userTargets),
			Query.equal('status', 'published'),
			Query.limit(1000)
		]);

		const announcements = allResponse.documents as Announcement[];
		const now = new Date();
		const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

		return {
			total: announcements.length,
			unread: announcements.filter(a => !a.readBy.includes(userId)).length,
			highPriority: announcements.filter(a => a.priority === 'high').length,
			urgent: announcements.filter(a => a.priority === 'urgent').length,
			expiringSoon: announcements.filter(a => 
				a.expiresAt && new Date(a.expiresAt) <= threeDaysFromNow
			).length
		};
	} catch (error) {
		console.error('Error getting announcement stats:', error);
		return { total: 0, unread: 0, highPriority: 0, urgent: 0, expiringSoon: 0 };
	}
}