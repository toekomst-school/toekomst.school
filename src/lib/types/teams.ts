export type UserRole = 'admin' | 'planning' | 'vakdocent' | 'docent' | 'teacher' | 'student';
export type TeamType = 'workforce' | 'classroom' | 'project' | 'administrative';

export interface TeamSettings {
	location?: string;
	phoneNumber?: string;
	emailAddress?: string;
	description?: string;
	type: TeamType;
	capacity?: number;
	isPublic?: boolean;
}

export interface Team {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	name: string;
	total: number;
	prefs: TeamSettings;
}

export interface TeamMember {
	$id: string;
	userId: string;
	userName: string;
	userEmail: string;
	roles: string[];
	status: 'pending' | 'accepted' | 'declined' | 'disabled';
	joined: string;
}

export interface TeamCreateRequest {
	name: string;
	description?: string;
	location?: string;
	phoneNumber?: string;
	emailAddress?: string;
	type: TeamType;
	capacity?: number;
	isPublic?: boolean;
	adminUserId: string;
}

export interface TeamUpdateRequest extends Partial<Omit<TeamCreateRequest, 'adminUserId'>> {
	// All fields from TeamCreateRequest except adminUserId are optional
}

// Permission helper functions
export function canManageWorkforceTeams(userRole?: string): boolean {
	return userRole === 'admin';
}

export function canCreateClasses(userRole?: string): boolean {
	return ['admin', 'vakdocent', 'docent'].includes(userRole || '');
}

export function isSuperAdmin(userRole?: string): boolean {
	return userRole === 'admin';
}

export function canManageTeamSettings(userRole?: string, team?: Team): boolean {
	if (userRole === 'admin') return true;
	if (team?.prefs?.type === 'workforce') {
		return ['admin', 'planning', 'vakdocent'].includes(userRole || '');
	}
	return false;
}