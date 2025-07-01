import type { RequestHandler } from '@sveltejs/kit';
import { Databases } from 'appwrite';
import { appwrite } from '$lib/appwrite';
import ical from 'ical-generator';

export const GET: RequestHandler = async ({ url }) => {
  const databases = new Databases(appwrite);
  // Adjust these IDs as needed
  const databaseId = 'lessen';
  const collectionId = 'planning';

  let events: any[] = [];
  try {
    const res = await databases.listDocuments(databaseId, collectionId);
    events = res.documents;
  } catch (e) {
    return new Response('Failed to fetch events', { status: 500 });
  }

  const cal = ical({
    name: 'Toekomst.school Planning',
    timezone: 'Europe/Amsterdam',
    prodId: '//toekomst.school//planning//NL'
  });

  for (const event of events) {
    cal.createEvent({
      id: event.$id,
      start: event.start,
      end: event.end,
      summary: event.lesson || 'Workshop',
      description: event.description || '',
      location: event.school || '',
      url: `https://toekomst.school/planning`,
    });
  }

  return new Response(cal.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="planning.ics"'
    }
  });
}; 