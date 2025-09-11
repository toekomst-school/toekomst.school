import { json } from '@sveltejs/kit';
import { databases } from '$lib/appwrite';
import { Query } from 'appwrite';
import type { RequestHandler } from './$types';

const DATABASE_ID = 'lessen';
const COLLECTION_ID = 'aanvragen';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const searchParams = url.searchParams;
		const status = searchParams.get('status');
		const priority = searchParams.get('priority');
		const search = searchParams.get('search');
		const limit = parseInt(searchParams.get('limit') || '50');
		const offset = parseInt(searchParams.get('offset') || '0');

		// Build queries
		const queries = [
			Query.orderDesc('$createdAt'),
			Query.limit(limit),
			Query.offset(offset)
		];

		if (status && status !== 'all') {
			queries.push(Query.equal('status', [status]));
		}

		if (priority && priority !== 'all') {
			queries.push(Query.equal('prioriteit', [priority]));
		}

		if (search) {
			// Note: Appwrite doesn't support OR queries directly, so we'll filter on the client side
			// or use multiple queries and merge results
		}

		const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, queries);

		return json({
			success: true,
			data: response.documents,
			total: response.total
		});
	} catch (error) {
		console.error('Error fetching requests:', error);
		return json({
			success: false,
			error: 'Failed to fetch requests'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		
		// Validate required fields
		if (!data.naam || !data.email || !data.onderwerp) {
			return json({
				success: false,
				error: 'Naam, email en onderwerp zijn verplicht'
			}, { status: 400 });
		}

		// Set default values
		const requestData = {
			naam: data.naam,
			email: data.email,
			telefoon: data.telefoon || null,
			organisatie: data.organisatie || null,
			onderwerp: data.onderwerp,
			datum_voorkeur: data.datum_voorkeur || null,
			aantal_deelnemers: data.aantal_deelnemers || null,
			opmerkingen: data.opmerkingen || null,
			status: data.status || 'nieuw',
			prioriteit: data.prioriteit || 'normaal'
		};

		const response = await databases.createDocument(
			DATABASE_ID,
			COLLECTION_ID,
			'unique()',
			requestData
		);

		return json({
			success: true,
			data: response
		});
	} catch (error) {
		console.error('Error creating request:', error);
		return json({
			success: false,
			error: 'Failed to create request'
		}, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const { id, ...updateData } = data;

		if (!id) {
			return json({
				success: false,
				error: 'Request ID is required'
			}, { status: 400 });
		}

		const response = await databases.updateDocument(
			DATABASE_ID,
			COLLECTION_ID,
			id,
			updateData
		);

		return json({
			success: true,
			data: response
		});
	} catch (error) {
		console.error('Error updating request:', error);
		return json({
			success: false,
			error: 'Failed to update request'
		}, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = await request.json();

		if (!id) {
			return json({
				success: false,
				error: 'Request ID is required'
			}, { status: 400 });
		}

		await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);

		return json({
			success: true,
			message: 'Request deleted successfully'
		});
	} catch (error) {
		console.error('Error deleting request:', error);
		return json({
			success: false,
			error: 'Failed to delete request'
		}, { status: 500 });
	}
};