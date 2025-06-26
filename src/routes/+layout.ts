import type { LayoutLoad } from './$types';
import { account } from '$lib/appwrite';
import { redirect } from '@sveltejs/kit';

const APPWRITE_OPENID_PROVIDER = 'oidc'; // or your configured OpenID provider name
const APP_URL = 'http://localhost:5173'; // Change to your deployed app URL if needed

export const load: LayoutLoad = async ({ url }) => {
  try {
    const user = await account.get();
    return { user };
  } catch {
    // Not logged in
    if (url.pathname === '/') {
      return {};
    }
    // Not logged in, redirect to Appwrite OpenID login
    const loginUrl = `https://write.toekomst.school/v1/account/sessions/oauth2/${APPWRITE_OPENID_PROVIDER}?project=toekomstschool&success=${encodeURIComponent(APP_URL)}&failure=${encodeURIComponent(APP_URL)}`;
    throw redirect(307, loginUrl);
  }
}; 