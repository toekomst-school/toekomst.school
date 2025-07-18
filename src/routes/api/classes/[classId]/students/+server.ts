import { json } from '@sveltejs/kit';
import { Client, Databases, Teams } from 'node-appwrite';
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
const CLASSES_DB = 'scholen';
const CLASSES_COLLECTION = 'klassen';

// GET: List students in a class
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { classId } = params;
		
		console.log('[CLASS STUDENTS API] Fetching students for class:', classId);

		const classDoc = await databases.getDocument(CLASSES_DB, CLASSES_COLLECTION, classId);
		
		return json({ 
			success: true, 
			students: classDoc.leerlingen || [],
			class: {
				$id: classDoc.$id,
				klasnaam: classDoc.klasnaam,
				schoolId: classDoc.schoolId,
				jaar: classDoc.jaar
			}
		});
	} catch (error) {
		console.error('[CLASS STUDENTS API] Error fetching students:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to fetch students' 
		}, { status: 500 });
	}
};

// POST: Add student to class
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { classId } = params;
		const { studentId } = await request.json();
		
		console.log('[CLASS STUDENTS API] Adding student to class:', { classId, studentId });

		if (!studentId) {
			return json({ success: false, error: 'Missing studentId' }, { status: 400 });
		}

		// Get current class data
		const classDoc = await databases.getDocument(CLASSES_DB, CLASSES_COLLECTION, classId);
		const currentStudents = classDoc.leerlingen || [];

		// Check if student is already in class
		if (currentStudents.includes(studentId)) {
			return json({ success: false, error: 'Student already in class' }, { status: 400 });
		}

		// Add student to class database
		const updatedStudents = [...currentStudents, studentId];
		
		await databases.updateDocument(CLASSES_DB, CLASSES_COLLECTION, classId, {
			leerlingen: updatedStudents
		});

		// Add student to Appwrite team if teamId exists
		if (classDoc.teamId) {
			try {
				await teams.createMembership(
					classDoc.teamId,
					['student'],
					studentId
				);
				console.log('[CLASS STUDENTS API] Student added to Appwrite team:', classDoc.teamId);
			} catch (teamError) {
				console.error('[CLASS STUDENTS API] Error adding student to team:', teamError);
				// Continue even if team membership fails
			}
		}

		console.log('[CLASS STUDENTS API] Student added successfully to class');
		
		return json({ 
			success: true, 
			students: updatedStudents 
		});
	} catch (error) {
		console.error('[CLASS STUDENTS API] Error adding student:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to add student' 
		}, { status: 500 });
	}
};

// DELETE: Remove student from class
export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const { classId } = params;
		const { studentId } = await request.json();
		
		console.log('[CLASS STUDENTS API] Removing student from class:', { classId, studentId });

		if (!studentId) {
			return json({ success: false, error: 'Missing studentId' }, { status: 400 });
		}

		// Get current class data
		const classDoc = await databases.getDocument(CLASSES_DB, CLASSES_COLLECTION, classId);
		const currentStudents = classDoc.leerlingen || [];

		// Remove student from class database
		const updatedStudents = currentStudents.filter(id => id !== studentId);
		
		await databases.updateDocument(CLASSES_DB, CLASSES_COLLECTION, classId, {
			leerlingen: updatedStudents
		});

		// Remove student from Appwrite team if teamId exists
		if (classDoc.teamId) {
			try {
				// Get team memberships to find the membership ID
				const memberships = await teams.listMemberships(classDoc.teamId);
				const studentMembership = memberships.memberships.find(m => m.userId === studentId);
				
				if (studentMembership) {
					await teams.deleteMembership(classDoc.teamId, studentMembership.$id);
					console.log('[CLASS STUDENTS API] Student removed from Appwrite team:', classDoc.teamId);
				}
			} catch (teamError) {
				console.error('[CLASS STUDENTS API] Error removing student from team:', teamError);
				// Continue even if team membership removal fails
			}
		}

		console.log('[CLASS STUDENTS API] Student removed successfully from class');
		
		return json({ 
			success: true, 
			students: updatedStudents 
		});
	} catch (error) {
		console.error('[CLASS STUDENTS API] Error removing student:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to remove student' 
		}, { status: 500 });
	}
};