import { json } from '@sveltejs/kit';
import { Client, Teams } from 'node-appwrite';
import type { RequestHandler } from './$types';
import dotenv from 'dotenv';
dotenv.config();

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const teams = new Teams(serverClient);

// GET: Get specific class
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { classId } = params; // classId is actually teamId
		
		console.log('[CLASS API] Fetching class:', classId);

		// Get team preferences
		let metadata;
		try {
			const prefs = await teams.getPrefs(classId);
			
			// Verify this is a classroom team
			if (prefs.type !== 'classroom') {
				return json({ 
					success: false, 
					error: 'Class not found' 
				}, { status: 404 });
			}
			
			metadata = prefs;
		} catch (prefsError) {
			return json({ 
				success: false, 
				error: 'Class not found' 
			}, { status: 404 });
		}

		// Get team details and memberships
		const team = await teams.get(classId);
		const memberships = await teams.listMemberships(classId);
		
		// Separate students and teachers
		const students = memberships.memberships.filter(m => 
			m.roles.includes('member') || m.roles.includes('student')
		);
		const teachers = memberships.memberships.filter(m => 
			m.roles.includes('teacher') || m.roles.includes('owner')
		);

		const classData = {
			$id: classId,
			teamId: classId,
			klasnaam: metadata.klasnaam,
			jaar: metadata.jaar,
			description: metadata.description || '',
			schoolId: metadata.schoolId,
			schoolNaam: metadata.schoolName,
			leerlingen: students.map(s => s.userId),
			docenten: teachers.map(t => t.userId),
			studentCount: students.length,
			teacherCount: teachers.length,
			createdAt: metadata.createdAt,
			teamName: team.name
		};

		console.log('[CLASS API] Class fetched successfully');
		
		return json({ 
			success: true, 
			class: classData 
		});
	} catch (error) {
		console.error('[CLASS API] Error fetching class:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to fetch class' 
		}, { status: 500 });
	}
};

// PUT: Update class
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { classId } = params; // classId is actually teamId
		const { klasnaam, jaar, description } = await request.json();
		
		console.log('[CLASS API] Updating class:', classId, { klasnaam, jaar, description });

		if (!klasnaam) {
			return json({ success: false, error: 'Missing required field: klasnaam' }, { status: 400 });
		}

		// Get current team preferences
		let currentMetadata;
		try {
			const prefs = await teams.getPrefs(classId);
			
			// Verify this is a classroom team
			if (prefs.type !== 'classroom') {
				return json({ 
					success: false, 
					error: 'Class not found' 
				}, { status: 404 });
			}
			
			currentMetadata = prefs;
		} catch (prefsError) {
			return json({ 
				success: false, 
				error: 'Class not found' 
			}, { status: 404 });
		}
		
		// Check if another class exists with the same name, year, and school (excluding current class)
		// Get all teams for this school to check for conflicts
		const existingTeamsResult = await teams.list([], currentMetadata.schoolName);
		
		for (const team of existingTeamsResult.teams) {
			if (team.$id === classId) continue; // Skip current team
			
			try {
				const prefs = await teams.getPrefs(team.$id);
				if (prefs.type === 'classroom' && 
					prefs.schoolId === currentMetadata.schoolId && 
					prefs.klasnaam === klasnaam && 
					prefs.jaar === (jaar || currentMetadata.jaar)) {
					return json({ 
						success: false, 
						error: 'Een klas met deze naam bestaat al voor dit schooljaar' 
					}, { status: 400 });
				}
			} catch (prefsError) {
				// Skip teams without preferences
				continue;
			}
		}

		// Update team preferences
		const updatedPrefs = {
			...currentMetadata,
			klasnaam,
			jaar: jaar || currentMetadata.jaar,
			description: description || ''
		};

		await teams.updatePrefs(classId, updatedPrefs);
		
		// Update team name if klasnaam changed
		if (klasnaam !== currentMetadata.klasnaam) {
			const newTeamName = `${currentMetadata.schoolName} ${klasnaam}`;
			await teams.updateName(classId, newTeamName);
		}

		// Get updated class data
		const team = await teams.get(classId);
		const memberships = await teams.listMemberships(classId);
		
		const students = memberships.memberships.filter(m => 
			m.roles.includes('member') || m.roles.includes('student')
		);
		const teachers = memberships.memberships.filter(m => 
			m.roles.includes('teacher') || m.roles.includes('owner')
		);

		const updatedClass = {
			$id: classId,
			teamId: classId,
			klasnaam: updatedPrefs.klasnaam,
			jaar: updatedPrefs.jaar,
			description: updatedPrefs.description || '',
			schoolId: updatedPrefs.schoolId,
			schoolNaam: updatedPrefs.schoolName,
			leerlingen: students.map(s => s.userId),
			docenten: teachers.map(t => t.userId),
			studentCount: students.length,
			teacherCount: teachers.length,
			createdAt: updatedPrefs.createdAt,
			teamName: team.name
		};

		console.log('[CLASS API] Class updated successfully');
		
		return json({ 
			success: true, 
			class: updatedClass 
		});
	} catch (error) {
		console.error('[CLASS API] Error updating class:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to update class' 
		}, { status: 500 });
	}
};

// DELETE: Delete class
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { classId } = params; // classId is actually teamId
		
		console.log('[CLASS API] Deleting class:', classId);

		// Verify this is a classroom team before deleting
		try {
			const prefs = await teams.getPrefs(classId);
			if (prefs.type !== 'classroom') {
				return json({ 
					success: false, 
					error: 'Class not found' 
				}, { status: 404 });
			}
		} catch (prefsError) {
			return json({ 
				success: false, 
				error: 'Class not found' 
			}, { status: 404 });
		}

		// Delete the team (this will also remove all memberships and preferences)
		await teams.delete(classId);
		console.log('[CLASS API] Team deleted successfully');
		
		return json({ 
			success: true 
		});
	} catch (error) {
		console.error('[CLASS API] Error deleting class:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to delete class' 
		}, { status: 500 });
	}
};