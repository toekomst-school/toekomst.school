import { json } from '@sveltejs/kit';
import { Client, Users, Teams, Databases, Query } from 'node-appwrite';
import type { RequestHandler } from './$types';
import dotenv from 'dotenv';
dotenv.config();

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const users = new Users(serverClient);
const teams = new Teams(serverClient);
const databases = new Databases(serverClient);

// POST: Create new user with team assignment
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, phone, name, role, teamId, teamRoles, schoolId, classId, klasnaam } = await request.json();
		
		console.log('[USER API] Creating user with data:', { email, phone, name, role, teamId, teamRoles, schoolId, classId, klasnaam });
		console.log('[USER API] Email type:', typeof email);
		console.log('[USER API] Email value:', JSON.stringify(email));
		console.log('[USER API] Email length:', email?.length);

		if (!email || !phone || !name) {
			return json({ success: false, error: 'Missing required fields' }, { status: 400 });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			console.log('[USER API] Invalid email format:', email);
			return json({ success: false, error: 'Invalid email format' }, { status: 400 });
		}

		// Validate and format phone number
		let formattedPhone = phone.trim();
		if (!formattedPhone.startsWith('+')) {
			// If it starts with 0, replace with +31 (Netherlands)
			if (formattedPhone.startsWith('0')) {
				formattedPhone = '+31' + formattedPhone.substring(1);
			} else {
				// Otherwise, assume it's a Dutch number and add +31
				formattedPhone = '+31' + formattedPhone;
			}
		}

		// Validate phone number format (max 15 digits after +)
		if (formattedPhone.length > 16 || !/^\+\d{1,15}$/.test(formattedPhone)) {
			return json({ success: false, error: 'Invalid phone number format' }, { status: 400 });
		}

		// Validate role
		const allowedRoles = ['teacher', 'student', 'vakdocent', 'admin'];
		if (role && !allowedRoles.includes(role)) {
			return json({ success: false, error: 'Invalid role' }, { status: 400 });
		}

		// Create user with custom ID that doesn't start with underscore and is max 36 chars
		console.log('[USER API] Creating user in Appwrite...');
		const timestamp = Date.now().toString(36); // Shorter timestamp
		const random = Math.random().toString(36).substr(2, 6); // Shorter random string
		const customUserId = `u${timestamp}${random}`; // Max 36 chars, starts with 'u'
		console.log('[USER API] Generated userId:', customUserId, 'Length:', customUserId.length);
		
		const user = await users.create(
			customUserId, // Custom ID that won't start with underscore
			email,
			formattedPhone,
			undefined, // password - will be set later
			name
		);
		console.log('[USER API] User created successfully:', user.$id);

		// Set user role if provided
		if (role) {
			console.log('[USER API] Setting user role:', role);
			await users.updateLabels(user.$id, [role]);
		}

		// Add user to team if teamId provided
		if (teamId) {
			try {
				console.log('[USER API] Adding user to team:', teamId);
				console.log('[USER API] Team roles:', teamRoles);
				
				// Use provided team roles or default to member (Appwrite default role)
				const rolesToAssign = teamRoles && teamRoles.length > 0 ? teamRoles : ['member'];
				console.log('[USER API] Roles to assign:', rolesToAssign);
				console.log('[USER API] User ID:', user.$id);
				console.log('[USER API] User ID length:', user.$id.length);
				console.log('[USER API] User ID valid chars:', /^[a-zA-Z0-9_]+$/.test(user.$id));
				
				await teams.createMembership(
					teamId,
					rolesToAssign,
					email  // email - use email for team invitation
				);
				console.log('[USER API] User added to team successfully with roles:', rolesToAssign);
			} catch (teamError) {
				// If team assignment fails, still return success for user creation
				console.warn('[USER API] Failed to add user to team:', teamError);
				console.error('[USER API] Team error details:', teamError);
			}
		}

		// Handle school and class assignment for students
		if (role === 'student' && (schoolId || classId)) {
			try {
				console.log('[USER API] Assigning student to school/class:', { schoolId, classId, klasnaam });
				
				// If classId is provided, add student to the class
				if (classId) {
					try {
						const classDoc = await databases.getDocument('scholen', 'klassen', classId);
						const currentStudents = classDoc.leerlingen || [];
						
						if (!currentStudents.includes(user.$id)) {
							const updatedStudents = [...currentStudents, user.$id];
							await databases.updateDocument('scholen', 'klassen', classId, {
								leerlingen: updatedStudents
							});
							console.log('[USER API] Student added to class successfully');
						}
					} catch (classError) {
						console.warn('[USER API] Failed to add student to class:', classError);
					}
				}
				
				// If school and class name are provided, try to create/find class team
				if (schoolId && klasnaam) {
					console.log('[USER API] Creating/finding class team for school-class combination');
					
					try {
						// Get school info for team naming
						const school = await databases.getDocument('scholen', 'school', schoolId);
						const teamName = `${school.NAAM} ${klasnaam}`;
						console.log('[USER API] Creating team with name:', teamName);
						
						// Try to find existing team first
						const existingTeams = await teams.list();
						let classTeam = existingTeams.teams.find(team => team.name === teamName);
						
						if (!classTeam) {
							// Create new team if it doesn't exist
							classTeam = await teams.create('unique()', teamName, []);
							console.log('[USER API] Created new class team:', classTeam.$id);
							
							// Store team preferences for classroom metadata
							try {
								const teamPrefs = {
									schoolId: schoolId,
									klasnaam: klasnaam,
									jaar: new Date().getFullYear(),
									type: 'classroom',
									schoolName: school.NAAM,
									createdAt: new Date().toISOString()
								};
								
								await teams.updatePrefs(classTeam.$id, teamPrefs);
								console.log('[USER API] Team preferences set successfully');
							} catch (prefsError) {
								console.warn('[USER API] Failed to set team preferences:', prefsError);
							}
						}
						
						// Add student to the class team
						await teams.createMembership(
							classTeam.$id,
							['member'], // Default role for students
							email
						);
						console.log('[USER API] Student added to class team successfully');
						
					} catch (teamError) {
						console.warn('[USER API] Team creation/assignment failed:', teamError);
					}
				}
			} catch (schoolClassError) {
				console.warn('[USER API] School/class assignment failed:', schoolClassError);
			}
		}

		return json({ 
			success: true, 
			user: {
				$id: user.$id,
				email: user.email,
				name: user.name,
				labels: role ? [role] : [],
				teamId: teamId || null,
				schoolId: schoolId || null,
				classId: classId || null
			}
		});
	} catch (error) {
		console.error('[USER API] Error creating user:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to create user' 
		}, { status: 500 });
	}
};