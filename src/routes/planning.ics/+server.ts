import type { RequestHandler } from '@sveltejs/kit';
import { Client, Databases } from 'node-appwrite';
import ical from 'ical-generator';
import dotenv from 'dotenv';
dotenv.config();

// Define a type for planning events
interface PlanningEvent {
  $id: string;
  start: string;
  end: string;
  lesson?: string;
  description?: string;
  school?: string;
  group?: string;
}

export const GET: RequestHandler = async () => {
  if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT || !process.env.APPWRITE_API_KEY) {
    console.error('[ICS] Missing Appwrite environment variables');
    return new Response('Server misconfigured: missing Appwrite environment variables', { status: 500 });
  }

  console.log('[ICS] Connecting to Appwrite...');
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
    console.log('[ICS] Fetching documents from Appwrite...');
    const res = await databases.listDocuments(databaseId, collectionId);
    console.log(`[ICS] Fetched ${res.documents.length} documents.`);
    events = res.documents.map((doc: Record<string, unknown>) => ({
      $id: doc.$id as string,
      start: doc.start as string,
      end: doc.end as string,
      lesson: doc.lesson as string | undefined,
      description: doc.description as string | undefined,
      school: doc.school as string | undefined
    }));
    console.log('[ICS] Events mapped:', events);
  } catch (err) {
    console.error('[ICS] Failed to fetch events:', err);
    return new Response('Failed to fetch events', { status: 500 });
  }

  const cal = ical({
    name: 'Toekomst.school Planning',
    timezone: 'Europe/Amsterdam',
    prodId: '//toekomst.school//planning//NL'
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
        console.error(`[ICS] Failed to fetch school for event ${event.$id}:`, err);
      }
    }
    // Fetch lesson info for this event
    let lessonName = '-';
    if (event.lesson) {
      try {
        const lessonDoc = await databases.getDocument('lessen', 'les', event.lesson);
        lessonName = lessonDoc.onderwerp || lessonDoc.lesnummer || lessonDoc.$id;
      } catch (err) {
        console.error(`[ICS] Failed to fetch lesson for event ${event.$id}:`, err);
      }
    }
    const group = event.group || '-';
    const summary = `${schoolName} - ${group} - ${lessonName}`;
    const eventUrl = `https://toekomst.school/planning?id=${event.$id}`;
    const description = `${eventUrl}\n\n${event.description || ''}`;
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
      timezone: 'Europe/Amsterdam',
    });
  }

  console.log('[ICS] Calendar generated. Returning response.');
  return new Response(cal.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="planning.ics"'
    }
  });
}; 