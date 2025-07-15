/**
 * SvelteKit server hooks with Socket.IO integration
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Socket.IO will be handled by the Vite dev server integration
	return resolve(event);
};