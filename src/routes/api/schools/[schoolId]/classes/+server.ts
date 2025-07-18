import { json } from '@sveltejs/kit';
import { Client, Databases, Teams, Query } from 'node-appwrite';
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
const SCHOOLS_DB = 'scholen';
const SCHOOL_COLLECTION = 'school';

// GET: List classes for a specific school
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { schoolId } = params;
		const jaar = url.searchParams.get('jaar') || new Date().getFullYear().toString();
		
		console.log('[SCHOOL CLASSES API] Fetching classes for school:', schoolId, 'year:', jaar);

		// First verify school exists
		const school = await databases.getDocument(SCHOOLS_DB, SCHOOL_COLLECTION, schoolId);
		
		// Use team list with name-based query for efficient filtering
		console.log('[SCHOOL CLASSES API] Fetching teams with school name filter');
		
		// Get teams that potentially match this school (name-based pre-filtering)
		const teamsResult = await teams.list(
			[], // No specific queries for now
			school.NAAM // Search by school name
		);
		
		console.log('[SCHOOL CLASSES API] Teams fetched with name filter:', teamsResult.teams.length);
		
		// Filter teams by preferences and get class details
		const classesWithDetails = await Promise.all(
			teamsResult.teams.map(async (team) => {
				try {
					// Get team preferences to check if it's a classroom for this school
					const prefs = await teams.getPrefs(team.$id);
					
					// Filter: must be classroom type, matching school and year
					if (prefs.type !== 'classroom' || 
						prefs.schoolId !== schoolId || 
						prefs.jaar !== parseInt(jaar)) {
						return null; // Skip this team
					}
					
					// Get team memberships for member counts
					const memberships = await teams.listMemberships(team.$id);
					
					// Count students and teachers
					const students = memberships.memberships.filter(m => 
						m.roles.includes('member') || m.roles.includes('student')
					);
					const teachers = memberships.memberships.filter(m => 
						m.roles.includes('teacher') || m.roles.includes('owner')
					);
					
					return {
						$id: team.$id, // Use teamId as the class ID
						teamId: team.$id,
						klasnaam: prefs.klasnaam,
						jaar: prefs.jaar,
						description: prefs.description || '',
						schoolId: prefs.schoolId,
						schoolNaam: prefs.schoolName,
						leerlingen: students.map(s => s.userId),
						docenten: teachers.map(t => t.userId),
						studentCount: students.length,
						teacherCount: teachers.length,
						createdAt: prefs.createdAt,
						teamName: team.name
					};
				} catch (prefsError) {
					console.warn('[SCHOOL CLASSES API] Failed to fetch preferences for team:', team.$id);
					return null; // Skip teams without preferences
				}
			})
		);
		
		// Filter out null results
		const validClasses = classesWithDetails.filter(cls => cls !== null);
		
		console.log('[SCHOOL CLASSES API] Valid classes processed:', validClasses.length);
		
		return json({ 
			success: true, 
			school: {
				$id: school.$id,
				NAAM: school.NAAM,
				PLAATSNAAM: school.PLAATSNAAM
			},
			classes: validClasses,
			jaar: parseInt(jaar)
		});
	} catch (error) {
		console.error('[SCHOOL CLASSES API] Error fetching school classes:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to fetch school classes' 
		}, { status: 500 });
	}
};

// POST: Create new class for a school
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { schoolId } = params;
		const { klasnaam, jaar, docenten, description } = await request.json();
		
		console.log('[SCHOOL CLASSES API] Creating class for school:', schoolId, 'class:', klasnaam);

		if (!klasnaam) {
			return json({ success: false, error: 'Missing required field: klasnaam' }, { status: 400 });
		}

		// Verify school exists
		const school = await databases.getDocument(SCHOOLS_DB, SCHOOL_COLLECTION, schoolId);

		const currentYear = new Date().getFullYear();
		const classYear = jaar || currentYear;

		// Check if class already exists by checking existing teams for this school
		const existingTeamsResult = await teams.list([], school.NAAM);
		
		for (const team of existingTeamsResult.teams) {
			try {
				const prefs = await teams.getPrefs(team.$id);
				if (prefs.type === 'classroom' && 
					prefs.schoolId === schoolId && 
					prefs.klasnaam === klasnaam && 
					prefs.jaar === classYear) {
					return json({ 
						success: false, 
						error: `Klas "${klasnaam}" bestaat al voor ${school.NAAM} in jaar ${classYear}` 
					}, { status: 400 });
				}
			} catch (prefsError) {
				// Skip teams without preferences
				continue;
			}
		}

		// Create team for the classroom
		const teamName = `${school.NAAM} ${klasnaam}`;
		const classTeam = await teams.create('unique()', teamName, ['teacher']);
		console.log('[SCHOOL CLASSES API] Team created:', classTeam.$id);

		// Store team preferences for classroom metadata
		try {
			const teamPrefs = {
				schoolId: schoolId,
				klasnaam: klasnaam,
				jaar: classYear,
				type: 'classroom',
				schoolName: school.NAAM,
				description: description || '',
				createdAt: new Date().toISOString()
			};
			
			await teams.updatePrefs(classTeam.$id, teamPrefs);
			console.log('[SCHOOL CLASSES API] Team preferences set successfully');
		} catch (prefsError) {
			console.warn('[SCHOOL CLASSES API] Failed to set team preferences:', prefsError);
		}

		// Add teachers to the team if provided
		if (docenten && docenten.length > 0) {
			for (const teacherId of docenten) {
				try {
					await teams.createMembership(classTeam.$id, ['teacher'], teacherId);
					console.log('[SCHOOL CLASSES API] Teacher added to team:', teacherId);
				} catch (membershipError) {
					console.warn('[SCHOOL CLASSES API] Failed to add teacher to team:', teacherId, membershipError);
				}
			}
		}

		// Return the combined class data
		const newClass = {
			$id: classTeam.$id, // Use team ID as class ID
			teamId: classTeam.$id,
			klasnaam: klasnaam,
			jaar: classYear,
			description: description || '',
			schoolId: schoolId,
			schoolNaam: school.NAAM,
			leerlingen: [],
			docenten: docenten || [],
			studentCount: 0,
			teacherCount: docenten?.length || 0,
			createdAt: new Date().toISOString(),
			teamName: teamName
		};
		
		console.log('[SCHOOL CLASSES API] Class created successfully:', newClass.$id);
		
		return json({ 
			success: true, 
			class: newClass 
		});
	} catch (error) {
		console.error('[SCHOOL CLASSES API] Error creating class:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to create class' 
		}, { status: 500 });
	}
};