import type { LayoutServerLoad } from './$types';
import { account } from '$lib/appwrite';
import { redirect } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/', '/game', '/tabcontrol'];

export const load: LayoutServerLoad = async ({ url, cookies }) => {
  console.log('Server cookies:', cookies.getAll());
  try {
    const user = await account.get();
    if (url.pathname === '/') {
      throw redirect(307, '/dashboard');
    }
    return { user };
  } catch {
    if (PUBLIC_ROUTES.includes(url.pathname)) {
      return {};
    }
    // Not logged in, redirect to login
    const APPWRITE_OPENID_PROVIDER = 'oidc';
    const APP_URL = 'http://localhost:5173'; // Change for production
    const loginUrl = `https://write.toekomst.school/v1/account/sessions/oauth2/${APPWRITE_OPENID_PROVIDER}?project=toekomstschool&success=${encodeURIComponent(APP_URL)}&failure=${encodeURIComponent(APP_URL)}`;
    throw redirect(307, loginUrl);
  }
}; 