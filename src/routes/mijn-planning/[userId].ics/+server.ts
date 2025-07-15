import type { RequestHandler } from '@sveltejs/kit';
import { Client, Databases, Query } from 'node-appwrite';
import ical from 'ical-generator';
import dotenv from 'dotenv';
dotenv.config();

// Define types
interface PlanningEvent {
	$id: string;
	start: string;
	end: string;
	lesson?: string;
	description?: string;
	school?: string;
	group?: string;
	sessions?: string; // JSON string
	title?: string;
}

interface Session {
	type: 'session' | 'break';
	title: string;
	start: string;
	end: string;
	duration?: number;
	lesson?: string;
	group?: string;
}

function formatTime(dateString: string): string {
	return new Date(dateString).toLocaleTimeString('nl-NL', { 
		hour: '2-digit', 
		minute: '2-digit' 
	});
}

async function generateSessionSummary(sessions: Session[], databases: Databases): Promise<string> {
	if (!sessions || sessions.length === 0) return '';
	
	const summaryLines = ['', 'WORKSHOP PROGRAMMA:'];
	
	for (const session of sessions) {
		const icon = session.type === 'session' ? '📚' : '☕';
		const timeRange = `${formatTime(session.start)}-${formatTime(session.end)}`;
		
		let sessionLine = `${icon} ${timeRange}`;
		
		if (session.type === 'session') {
			// Fetch lesson name
			let lessonName = 'Workshop';
			if (session.lesson) {
				try {
					const lessonDoc = await databases.getDocument('lessen', 'les', session.lesson);
					lessonName = lessonDoc.onderwerp || lessonDoc.lesnummer || 'Workshop';
				} catch (err) {
					console.error(`Failed to fetch lesson ${session.lesson}:`, err);
				}
			}
			
			sessionLine += ` ${lessonName}`;
			
			if (session.group) {
				sessionLine += ` (${session.group})`;
			}
		} else {
			sessionLine += ` ${session.title}`;
		}
		
		summaryLines.push(sessionLine);
	}
	
	return summaryLines.join('\n');
}

export const GET: RequestHandler = async ({ params }) => {
	const { userId } = params;
	
	if (!userId) {
		return new Response('User ID is required', { status: 400 });
	}

	if (
		!process.env.APPWRITE_ENDPOINT ||
		!process.env.APPWRITE_PROJECT ||
		!process.env.APPWRITE_API_KEY
	) {
		console.error('[MIJN PLANNING ICS] Missing Appwrite environment variables');
		return new Response('Server misconfigured: missing Appwrite environment variables', {
			status: 500
		});
	}

	console.log(`[MIJN PLANNING ICS] Generating calendar for user: ${userId}`);
	const client = new Client();
	client
		.setEndpoint(process.env.APPWRITE_ENDPOINT!)
		.setProject(process.env.APPWRITE_PROJECT!)
		.setKey(process.env.APPWRITE_API_KEY!);

	const databases = new Databases(client);
	const databaseId = 'lessen';
	const collectionId = 'planning';

	let events: PlanningEvent[] = [];
	try {
		console.log('[MIJN PLANNING ICS] Fetching user events...');
		const queries = [
			Query.equal('teacher', userId),
			Query.notEqual('status', 'concept') // Always filter concept for personal feeds
		];

		const res = await databases.listDocuments(databaseId, collectionId, queries);
		console.log(`[MIJN PLANNING ICS] Fetched ${res.documents.length} user events.`);
		
		events = res.documents.map((doc: Record<string, unknown>) => ({
			$id: doc.$id as string,
			start: doc.start as string,
			end: doc.end as string,
			lesson: doc.lesson as string | undefined,
			description: doc.description as string | undefined,
			school: doc.school as string | undefined,
			group: doc.group as string | undefined,
			sessions: doc.sessions as string | undefined,
			title: doc.title as string | undefined
		}));
	} catch (err) {
		console.error('[MIJN PLANNING ICS] Failed to fetch events:', err);
		return new Response('Failed to fetch events', { status: 500 });
	}

	const cal = ical({
		name: 'Mijn Planning - Toekomst.school',
		timezone: 'Europe/Amsterdam',
		prodId: '//toekomst.school//mijn-planning//NL'
	});

	for (const event of events) {
		// Fetch school info for this event
		let schoolName = '-';
		let schoolAddress = '';
		if (event.school) {
			try {
				const schoolDoc = await databases.getDocument('scholen', 'school', event.school);
				schoolName = schoolDoc.NAAM || schoolDoc.$id;
				schoolAddress = schoolDoc.ADRES || '';
			} catch (err) {
				console.error(`[MIJN PLANNING ICS] Failed to fetch school for event ${event.$id}:`, err);
			}
		}

		// Fetch lesson info for this event
		let lessonName = '-';
		if (event.lesson) {
			try {
				const lessonDoc = await databases.getDocument('lessen', 'les', event.lesson);
				lessonName = lessonDoc.onderwerp || lessonDoc.lesnummer || lessonDoc.$id;
			} catch (err) {
				console.error(`[MIJN PLANNING ICS] Failed to fetch lesson for event ${event.$id}:`, err);
			}
		}

		// Parse sessions and generate summary
		let sessionSummary = '';
		if (event.sessions) {
			try {
				const parsedSessions: Session[] = JSON.parse(event.sessions);
				sessionSummary = await generateSessionSummary(parsedSessions, databases);
			} catch (err) {
				console.error(`[MIJN PLANNING ICS] Failed to parse sessions for event ${event.$id}:`, err);
			}
		}

		const group = event.group || '-';
		const summary = event.title || schoolName || 'Workshop';
		const eventUrl = `https://toekomst.school/planning?id=${event.$id}`;
		const description = `${eventUrl}${sessionSummary}\n\n${event.description || ''}`;
		
		const start = event.start ? new Date(event.start) : new Date();
		const end = event.end ? new Date(event.end) : new Date(Date.now() + 60 * 60 * 1000);
		
		cal.createEvent({
			id: event.$id,
			start,
			end,
			summary,
			description,
			location: schoolAddress,
			url: eventUrl,
			timezone: 'Europe/Amsterdam'
		});
	}

	console.log(`[MIJN PLANNING ICS] Calendar generated with ${events.length} events.`);
	return new Response(cal.toString(), {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': `inline; filename="mijn-planning-${userId}.ics"`
		}
	});
};