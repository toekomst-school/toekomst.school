import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	console.log('OAuth callback received');
	console.log('Full URL:', url.href);
	console.log('Search params:', Object.fromEntries(url.searchParams.entries()));

	// Get the intended redirect URL from the callback
	const redirectTo = url.searchParams.get('redirect') || '/dashboard';
	console.log('Redirecting to:', redirectTo);

	// Redirect to the original intended destination or dashboard as fallback
	throw redirect(307, redirectTo);
};
