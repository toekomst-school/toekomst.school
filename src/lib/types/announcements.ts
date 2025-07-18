export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementTargetType = 'team' | 'class' | 'school' | 'planning-session';
export type AnnouncementVisibility = 'all' | 'teachers-only' | 'students-only';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';

export interface Announcement {
	$id: string;
	$createdAt: string;
	$updatedAt: string;
	title: string;
	content: string;
	authorId: string;
	authorName: string;
	targetType: AnnouncementTargetType;
	targetId: string;
	targetName: string;
	visibility: AnnouncementVisibility;
	priority: AnnouncementPriority;
	status: AnnouncementStatus;
	expiresAt?: string;
	scheduledAt?: string;
	attachments?: string[];
	readBy: string[];
	tags?: string[];
}

export interface AnnouncementTarget {
	id: string;
	name: string;
	type: AnnouncementTargetType;
	memberCount: number;
	description?: string;
}

export interface AnnouncementCreateRequest {
	title: string;
	content: string;
	targetType: AnnouncementTargetType;
	targetId: string;
	visibility: AnnouncementVisibility;
	priority: AnnouncementPriority;
	expiresAt?: string;
	scheduledAt?: string;
	attachments?: string[];
	tags?: string[];
}

export interface AnnouncementUpdateRequest extends Partial<AnnouncementCreateRequest> {
	status?: AnnouncementStatus;
}

export interface AnnouncementFilters {
	targetType?: AnnouncementTargetType;
	priority?: AnnouncementPriority;
	status?: AnnouncementStatus;
	authorId?: string;
	unreadOnly?: boolean;
	search?: string;
}

export interface AnnouncementStats {
	total: number;
	unread: number;
	highPriority: number;
	urgent: number;
	expiringSoon: number;
}