import { json } from '@sveltejs/kit';
import { Client, Users } from 'node-appwrite';
import type { RequestHandler } from './$types';

// Server-side Appwrite client for admin operations
const serverClient = new Client()
	.setEndpoint('https://write.toekomst.school/v1')
	.setProject('toekomstschool')
	.setKey(process.env.APPWRITE_API_KEY || ''); // You'll need to set this environment variable

const users = new Users(serverClient);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { userId, label } = await request.json();

		if (!userId || !label) {
			return json({ success: false, error: 'Missing userId or label' }, { status: 400 });
		}

		// Validate label is one of the allowed roles
		const allowedLabels = ['teacher', 'student', 'vakdocent'];
		if (!allowedLabels.includes(label)) {
			return json({ success: false, error: 'Invalid label' }, { status: 400 });
		}

		// Update user labels in Appwrite
		await users.updateLabels(userId, [label]);

		return json({ success: true });
	} catch (error) {
		console.error('Error setting user label:', error);
		return json({ success: false, error: 'Failed to update user label' }, { status: 500 });
	}
};