import { locale } from 'svelte-i18n';
import { user } from '$lib/stores/auth.js';
import { account } from '$lib/appwrite';
import { get } from 'svelte/store';

export const supportedLocales = [
	{ code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
	{ code: 'en', name: 'English', flag: '🇺🇸' }
];

export function setLanguage(lang: string) {
	locale.set(lang);
}

export async function saveLanguageToProfile(lang: string) {
	// Save to user profile if user is logged in
	const currentUser = get(user);
	if (currentUser) {
		try {
			await account.updatePrefs({ locale: lang });
		} catch (error) {
			console.error('Failed to save locale to user profile:', error);
			throw error;
		}
	}
}

export function getLanguageFromUser(userAccount: any): string {
	// Get language from user preferences, fallback to 'nl'
	return userAccount?.prefs?.locale || 'nl';
}

export function initializeLocale(userAccount: any = null) {
	const defaultLocale = 'nl';
	let targetLocale = defaultLocale;

	if (userAccount) {
		targetLocale = getLanguageFromUser(userAccount);
	}

	locale.set(targetLocale);
	return targetLocale;
}