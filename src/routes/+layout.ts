import type { LayoutLoad } from './$types';
import { account } from '$lib/appwrite';
import { redirect } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/', '/game', '/tabcontrol', '/connect'];

export const load: LayoutLoad = async ({ url }) => {
  if (PUBLIC_ROUTES.includes(url.pathname)) {
    // Don't try to get user for public routes
    return {};
  }
  try {
    const user = await account.get();
    console.log('User loaded:', user); // Debug
    // If user is logged in and on home page, redirect to dashboard
    if (url.pathname === '/') {
      throw redirect(307, '/dashboard');
    }
    return { user };
  } catch (e) {
    console.log('Auth error:', e, 'at', url.pathname); // Debug
    // Not logged in, trying to access a protected route
    const APPWRITE_OPENID_PROVIDER = 'oidc';
    const APP_URL = 'http://localhost:5173'; // Change to your deployed app URL if needed
    const loginUrl = `https://write.toekomst.school/v1/account/sessions/oauth2/${APPWRITE_OPENID_PROVIDER}?project=toekomstschool&success=${encodeURIComponent(APP_URL)}&failure=${encodeURIComponent(APP_URL)}`;
    throw redirect(307, loginUrl);
  }
}; 