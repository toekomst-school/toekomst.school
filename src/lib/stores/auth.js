import { writable } from 'svelte/store';
import { account } from '$lib/appwrite';

// Create auth store
export const user = writable(null);
export const isLoading = writable(true);

// Initialize auth state
export async function initAuth() {
	isLoading.set(true);
	try {
		const userAccount = await account.get();
		user.set(userAccount);
	} catch (error) {
		user.set(null);
	} finally {
		isLoading.set(false);
	}
}

// Login function
export async function login(email, password) {
	try {
		await account.createEmailPasswordSession(email, password);
		const userAccount = await account.get();
		user.set(userAccount);
		return { success: true };
	} catch (error) {
		return { success: false, error: error.message };
	}
}

// OAuth login function  
export async function loginWithOAuth(provider = 'oidc') {
	try {
		const currentUrl = window.location.origin;
		const successUrl = `${currentUrl}/auth/callback`;
		const failureUrl = currentUrl;
		
		account.createOAuth2Session(
			provider,
			successUrl,
			failureUrl
		);
	} catch (error) {
		console.error('OAuth login error:', error);
	}
}

// Logout function
export async function logout() {
	try {
		await account.deleteSession('current');
		user.set(null);
		return { success: true };
	} catch (error) {
		return { success: false, error: error.message };
	}
}

// Register function
export async function register(email, password, name) {
	try {
		await account.create('unique()', email, password, name);
		await account.createEmailPasswordSession(email, password);
		const userAccount = await account.get();
		user.set(userAccount);
		return { success: true };
	} catch (error) {
		return { success: false, error: error.message };
	}
}