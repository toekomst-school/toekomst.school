import { json } from '@sveltejs/kit';
import { Client, Databases, Users } from 'node-appwrite';
import type { RequestHandler } from './$types';
import type { AnnouncementUpdateRequest } from '$lib/types/announcements';
import { broadcastAnnouncementUpdate } from '../stream/+server.js';
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

// GET - Get specific announcement
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		// Get userId from URL parameters
		const userId = url.searchParams.get('userId');
		if (!userId) {
			return json({ error: 'Missing userId parameter' }, { status: 400 });
		}

		const announcement = await databases.getDocument(DATABASE_ID, COLLECTION_ID, params.id);
		
		// Check if user has access to this announcement
		const hasAccess = await validateUserAccess(userId, announcement);
		if (!hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		return json(announcement);

	} catch (error) {
		console.error('Error fetching announcement:', error);
		return json({ error: 'Failed to fetch announcement' }, { status: 500 });
	}
};

// PATCH - Update announcement
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const userId = body.userId;
		
		if (!userId) {
			return json({ error: 'Missing userId in request body' }, { status: 400 });
		}

		const data: AnnouncementUpdateRequest = body;
		
		// Get existing announcement
		const existing = await databases.getDocument(DATABASE_ID, COLLECTION_ID, params.id);
		
		// Check if user can edit (author or admin)
		const canEdit = await validateUserCanEdit(userId, existing);
		if (!canEdit) {
			return json({ error: 'Insufficient permissions' }, { status: 403 });
		}

		// Update announcement
		const updated = await databases.updateDocument(
			DATABASE_ID,
			COLLECTION_ID,
			params.id,
			data
		);

		// Broadcast real-time update
		try {
			broadcastAnnouncementUpdate('announcement_updated', { 
				id: updated.$id,
				targetType: updated.targetType,
				targetId: updated.targetId,
				priority: updated.priority
			});
		} catch (error) {
			console.warn('Failed to broadcast announcement update:', error);
		}

		return json(updated);

	} catch (error) {
		console.error('Error updating announcement:', error);
		return json({ error: 'Failed to update announcement' }, { status: 500 });
	}
};

// DELETE - Delete announcement
export const DELETE: RequestHandler = async ({ params, url }) => {
	try {
		// Get userId from URL parameters
		const userId = url.searchParams.get('userId');
		if (!userId) {
			return json({ error: 'Missing userId parameter' }, { status: 400 });
		}

		// Get existing announcement
		const existing = await databases.getDocument(DATABASE_ID, COLLECTION_ID, params.id);
		
		// Check if user can delete (author or admin)
		const canDelete = await validateUserCanEdit(userId, existing);
		if (!canDelete) {
			return json({ error: 'Insufficient permissions' }, { status: 403 });
		}

		await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, params.id);

		// Broadcast real-time update
		try {
			broadcastAnnouncementUpdate('announcement_deleted', { 
				id: params.id,
				targetType: existing.targetType,
				targetId: existing.targetId
			});
		} catch (error) {
			console.warn('Failed to broadcast announcement update:', error);
		}

		return json({ success: true });

	} catch (error) {
		console.error('Error deleting announcement:', error);
		return json({ error: 'Failed to delete announcement' }, { status: 500 });
	}
};

// POST - Mark as read
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const userId = body.userId;
		
		if (!userId) {
			return json({ error: 'Missing userId in request body' }, { status: 400 });
		}

		const { action } = body;
		
		if (action === 'mark_read') {
			const announcement = await databases.getDocument(DATABASE_ID, COLLECTION_ID, params.id);
			
			// Add user to readBy array if not already there
			if (!announcement.readBy.includes(userId)) {
				const updatedReadBy = [...announcement.readBy, userId];
				
				await databases.updateDocument(
					DATABASE_ID,
					COLLECTION_ID,
					params.id,
					{ readBy: updatedReadBy }
				);
			}

			return json({ success: true });
		}

		return json({ error: 'Invalid action' }, { status: 400 });

	} catch (error) {
		console.error('Error marking as read:', error);
		return json({ error: 'Failed to mark as read' }, { status: 500 });
	}
};

// Helper functions
async function validateUserAccess(userId: string, announcement: any): Promise<boolean> {
	try {
		// User can always access their own announcements
		if (announcement.authorId === userId) return true;

		// Check if user has access to the target
		const userLabels = await getUserLabels(userId);
		
		// Admins have access to everything
		if (userLabels.includes('admin')) return true;

		// Check access based on target type
		switch (announcement.targetType) {
			case 'team':
				const team = await databases.getDocument('main', 'teams', announcement.targetId);
				return team.members.includes(userId);
				
			case 'class':
				const classDoc = await databases.getDocument('main', 'classes', announcement.targetId);
				if (classDoc.teacherId === userId) return true;
				
				// Check if user is in the class's team
				const classTeam = await databases.getDocument('main', 'teams', classDoc.teamId);
				return classTeam.members.includes(userId);
				
			case 'school':
				// Check if user belongs to any team in this school
				const schoolTeams = await databases.listDocuments('main', 'teams', [
					{ equal: ['schoolId', announcement.targetId] },
					{ equal: ['members', userId] },
					{ limit: 1 }
				]);
				return schoolTeams.documents.length > 0;
				
			default:
				return false;
		}
	} catch (error) {
		console.error('Error validating access:', error);
		return false;
	}
}

async function validateUserCanEdit(userId: string, announcement: any): Promise<boolean> {
	try {
		// Author can always edit
		if (announcement.authorId === userId) return true;

		// Check if user is admin
		const userLabels = await getUserLabels(userId);
		return userLabels.includes('admin');
	} catch (error) {
		console.error('Error validating edit permission:', error);
		return false;
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