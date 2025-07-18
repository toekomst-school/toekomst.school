import { json } from '@sveltejs/kit';
import { Client, Databases, Teams, Users, Query } from 'node-appwrite';
import type { RequestHandler } from './$types';
import dotenv from 'dotenv';
dotenv.config();

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(serverClient);
const teams = new Teams(serverClient);
const users = new Users(serverClient);
const CLASSES_DB = 'scholen'; // Use existing schools database
const CLASSES_COLLECTION = 'klassen'; // New collection for classes

// GET: List all classes with optional filtering
export const GET: RequestHandler = async ({ url }) => {
	try {
		const schoolId = url.searchParams.get('schoolId');
		const teacherId = url.searchParams.get('teacherId');
		
		console.log('[CLASSES API] Fetching classes with filters:', { schoolId, teacherId });

		let queries = [Query.limit(100)];
		
		if (schoolId) {
			queries.push(Query.equal('schoolId', schoolId));
		}
		
		if (teacherId) {
			queries.push(Query.contains('docenten', teacherId));
		}

		const result = await databases.listDocuments(CLASSES_DB, CLASSES_COLLECTION, queries);
		console.log('[CLASSES API] Classes fetched successfully:', result.documents.length);
		
		return json({ 
			success: true, 
			classes: result.documents 
		});
	} catch (error) {
		console.error('[CLASSES API] Error fetching classes:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to fetch classes' 
		}, { status: 500 });
	}
};

// Helper function to check if user has permission to create classes
async function canCreateClass(userId: string): Promise<boolean> {
	try {
		const user = await users.get(userId);
		const userLabels = user.labels || [];
		
		// Only docent and vakdocent can create classes
		return userLabels.includes('docent') || userLabels.includes('vakdocent');
	} catch (error) {
		console.error('[CLASSES API] Error checking user permissions:', error);
		return false;
	}
}

// POST: Create new class
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { schoolId, klasnaam, jaar, docenten, description, creatorId } = await request.json();
		
		console.log('[CLASSES API] Creating class with data:', { schoolId, klasnaam, jaar, docenten, creatorId });

		if (!schoolId || !klasnaam || !creatorId) {
			return json({ success: false, error: 'Missing required fields: schoolId, klasnaam, and creatorId' }, { status: 400 });
		}

		// Check if creator has permission to create classes
		const hasPermission = await canCreateClass(creatorId);
		if (!hasPermission) {
			return json({ success: false, error: 'Only docent and vakdocent can create classes' }, { status: 403 });
		}

		// Check if class already exists for this school and year
		const existingClasses = await databases.listDocuments(CLASSES_DB, CLASSES_COLLECTION, [
			Query.equal('schoolId', schoolId),
			Query.equal('klasnaam', klasnaam),
			Query.equal('jaar', jaar || new Date().getFullYear())
		]);

		if (existingClasses.documents.length > 0) {
			return json({ success: false, error: 'Class already exists for this school and year' }, { status: 400 });
		}

		// Create Appwrite team for this class
		const teamName = `${klasnaam} - ${jaar || new Date().getFullYear()}`;
		const team = await teams.create(
			'unique()',
			teamName,
			['docent', 'student'] // Available roles in the class
		);

		// Add creator as class docent
		await teams.createMembership(
			team.$id,
			['docent'],
			creatorId
		);

		const classData = {
			schoolId,
			klasnaam,
			jaar: jaar || new Date().getFullYear(),
			docenten: [creatorId, ...(docenten || [])], // Include creator as docent
			leerlingen: [], // Start with empty students array
			description: description || '',
			teamId: team.$id, // Link to Appwrite team
			createdAt: new Date().toISOString(),
			createdBy: creatorId
		};

		const newClass = await databases.createDocument(CLASSES_DB, CLASSES_COLLECTION, 'unique()', classData);
		console.log('[CLASSES API] Class created successfully:', newClass.$id);
		
		return json({ 
			success: true, 
			class: newClass,
			team: team
		});
	} catch (error) {
		console.error('[CLASSES API] Error creating class:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to create class' 
		}, { status: 500 });
	}
};