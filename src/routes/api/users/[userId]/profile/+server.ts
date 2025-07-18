import { json } from '@sveltejs/kit';
import { Client, Users, Databases, Teams, Query } from 'node-appwrite';
import type { RequestHandler } from './$types';
import dotenv from 'dotenv';
dotenv.config();

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || '');

const users = new Users(serverClient);
const databases = new Databases(serverClient);
const teams = new Teams(serverClient);

// GET: Fetch user profile with role-based data
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { userId } = params;
		const viewerId = url.searchParams.get('viewerId'); // Who is viewing the profile
		
		console.log('[PROFILE API] Fetching profile for userId:', userId);
		console.log('[PROFILE API] Viewer ID:', viewerId);

		// Get basic user info from Appwrite Users
		const user = await users.get(userId);
		console.log('[PROFILE API] User found:', user.name, user.email);

		// Determine user role
		const userRole = user.labels?.[0] || 'student';
		console.log('[PROFILE API] User role:', userRole);

		// Base profile data
		let profileData = {
			$id: user.$id,
			name: user.name,
			email: user.email,
			phone: user.phone,
			role: userRole,
			createdAt: user.$createdAt,
			// Extended data will be added based on role
			schoolInfo: null,
			teamMemberships: [],
			vakdocentProfile: null,
			classInfo: null
		};

		// Get team memberships for user
		try {
			const teamsList = await teams.list();
			const userTeams = [];
			
			for (const team of teamsList.teams) {
				try {
					const memberships = await teams.listMemberships(team.$id);
					const userMembership = memberships.memberships?.find(m => m.userId === userId);
					if (userMembership) {
						userTeams.push({
							teamId: team.$id,
							teamName: team.name,
							roles: userMembership.roles,
							status: userMembership.status
						});
					}
				} catch (teamError) {
					console.warn('[PROFILE API] Could not fetch memberships for team:', team.$id);
				}
			}
			profileData.teamMemberships = userTeams;
		} catch (teamsError) {
			console.warn('[PROFILE API] Could not fetch team memberships:', teamsError);
		}

		// Role-specific data fetching
		if (userRole === 'vakdocent') {
			try {
				// Fetch vakdocent profile from database
				const vakdocentProfiles = await databases.listDocuments('lessen', 'vakdocent');
				const vakdocentProfile = vakdocentProfiles.documents.find(doc => doc.email === user.email);
				
				if (vakdocentProfile) {
					profileData.vakdocentProfile = {
						bio: vakdocentProfile.bio,
						qualifications: vakdocentProfile.qualifications,
						address: vakdocentProfile.address,
						photo: vakdocentProfile.photo
					};
				}
			} catch (vakdocentError) {
				console.warn('[PROFILE API] Could not fetch vakdocent profile:', vakdocentError);
			}
		}

		// Fetch school and class information for teachers and students
		if (userRole === 'teacher' || userRole === 'student') {
			try {
				await fetchSchoolAndClassInfo(profileData, userId, userRole);
			} catch (schoolError) {
				console.warn('[PROFILE API] Could not fetch school/class info:', schoolError);
			}
		}

		// Apply permission-based filtering based on viewer
		if (viewerId && viewerId !== userId) {
			profileData = await applyPermissionFiltering(profileData, viewerId);
		}

		return json({ 
			success: true, 
			profile: profileData 
		});
	} catch (error) {
		console.error('[PROFILE API] Error fetching profile:', error);
		return json({ 
			success: false, 
			error: error instanceof Error ? error.message : 'Failed to fetch profile' 
		}, { status: 500 });
	}
};

// Fetch school and class information for teachers and students
async function fetchSchoolAndClassInfo(profileData: any, userId: string, userRole: string) {
	const SCHOOLS_DB = 'scholen';
	const SCHOOL_COLLECTION = 'school';
	const CLASSES_COLLECTION = 'klassen';

	if (userRole === 'teacher') {
		// For teachers, find classes they teach
		try {
			const teacherClasses = await databases.listDocuments(SCHOOLS_DB, CLASSES_COLLECTION, [
				Query.contains('docenten', userId),
				Query.limit(50)
			]);

			if (teacherClasses.documents.length > 0) {
				profileData.classes = teacherClasses.documents;
				
				// Get school info from the first class (assuming teacher works at one school)
				const firstClass = teacherClasses.documents[0];
				if (firstClass.schoolId) {
					try {
						const school = await databases.getDocument(SCHOOLS_DB, SCHOOL_COLLECTION, firstClass.schoolId);
						profileData.schoolInfo = {
							schoolId: school.$id,
							schoolName: school.NAAM,
							address: school.ADRES_VOLLEDIG || `${school.STRAATNAAM || ''} ${school.HUISNUMMER || ''}, ${school.PLAATSNAAM || ''}`.trim()
						};
					} catch (schoolError) {
						console.warn('[PROFILE API] Could not fetch school info for teacher:', schoolError);
					}
				}
			}
		} catch (classError) {
			console.warn('[PROFILE API] Could not fetch teacher classes:', classError);
		}
	} else if (userRole === 'student') {
		// For students, find their class(es)
		try {
			const studentClasses = await databases.listDocuments(SCHOOLS_DB, CLASSES_COLLECTION, [
				Query.contains('leerlingen', userId),
				Query.limit(10)
			]);

			if (studentClasses.documents.length > 0) {
				const studentClass = studentClasses.documents[0]; // Students typically in one class
				profileData.classInfo = studentClass;
				
				// Get school info
				if (studentClass.schoolId) {
					try {
						const school = await databases.getDocument(SCHOOLS_DB, SCHOOL_COLLECTION, studentClass.schoolId);
						profileData.schoolInfo = {
							schoolId: school.$id,
							schoolName: school.NAAM,
							className: studentClass.klasnaam,
							jaar: studentClass.jaar
						};
					} catch (schoolError) {
						console.warn('[PROFILE API] Could not fetch school info for student:', schoolError);
					}
				}
				
				// Get classmates (other students in the same class)
				if (studentClass.leerlingen && studentClass.leerlingen.length > 1) {
					try {
						const classmates = [];
						for (const classmateId of studentClass.leerlingen) {
							if (classmateId !== userId) { // Don't include the student themselves
								try {
									const classmate = await users.get(classmateId);
									classmates.push({
										$id: classmate.$id,
										name: classmate.name
									});
								} catch (classmateError) {
									console.warn('[PROFILE API] Could not fetch classmate:', classmateId);
								}
							}
						}
						profileData.classmates = classmates;
					} catch (classmatesError) {
						console.warn('[PROFILE API] Could not fetch classmates:', classmatesError);
					}
				}
			}
		} catch (classError) {
			console.warn('[PROFILE API] Could not fetch student class:', classError);
		}
	}
}

// Apply permission-based filtering based on viewer relationship
async function applyPermissionFiltering(profileData: any, viewerId: string) {
	try {
		// Get viewer info to determine relationship
		const viewer = await users.get(viewerId);
		const viewerRole = viewer.labels?.[0] || 'student';
		
		// Basic permission matrix
		const isAdmin = viewerRole === 'admin';
		const isVakdocent = viewerRole === 'vakdocent';
		const isTeacher = viewerRole === 'teacher' || viewerRole === 'vakdocent';
		
		// Apply filtering based on viewer role
		if (isAdmin || isVakdocent) {
			// Admins and vakdocenten can see most information
			return profileData;
		} else if (isTeacher) {
			// Teachers can see basic professional info
			delete profileData.vakdocentProfile?.address; // Remove sensitive info
			return profileData;
		} else {
			// Students get minimal info
			const filteredProfile = {
				...profileData,
				phone: null,
				vakdocentProfile: null,
				teamMemberships: [] // Hide team details
			};
			
			// Students can see basic school info but not detailed class info
			if (profileData.schoolInfo) {
				filteredProfile.schoolInfo = {
					schoolName: profileData.schoolInfo.schoolName,
					className: profileData.schoolInfo.className,
					jaar: profileData.schoolInfo.jaar
				};
			}
			
			// Students can see classmates if they're in the same class
			if (profileData.classmates) {
				filteredProfile.classmates = profileData.classmates;
			}
			
			return filteredProfile;
		}
	} catch (error) {
		console.warn('[PROFILE API] Permission filtering failed:', error);
		// Return limited data on error
		return {
			$id: profileData.$id,
			name: profileData.name,
			role: profileData.role
		};
	}
}