import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const { userId } = params;
	const viewerId = url.searchParams.get('viewerId');
	
	try {
		// Fetch profile data from our API
		const profileUrl = `/api/users/${userId}/profile${viewerId ? `?viewerId=${viewerId}` : ''}`;
		const response = await fetch(profileUrl);
		const data = await response.json();
		
		if (data.success) {
			return {
				profile: data.profile,
				userId
			};
		} else {
			return {
				error: data.error || 'Failed to load profile',
				userId
			};
		}
	} catch (error) {
		console.error('Error loading profile:', error);
		return {
			error: 'Failed to load profile',
			userId
		};
	}
};