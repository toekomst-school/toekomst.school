import type { LayoutLoad } from './$types';
import { account } from '$lib/appwrite';

export const ssr = false;

export const load: LayoutLoad = async () => {
	try {
		const user = await account.get();
		return { user };
	} catch {
		return { user: null };
	}
};
