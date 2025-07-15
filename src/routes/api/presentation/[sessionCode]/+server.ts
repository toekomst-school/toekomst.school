import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessionStore } from '$lib/server/sessionStore.js';

export const GET: RequestHandler = async ({ params }) => {
	const { sessionCode } = params;
	
	if (!sessionStore.hasSession(sessionCode)) {
		return json({ error: 'Session not found' }, { status: 404 });
	}
	
	const session = sessionStore.getSession(sessionCode);
	
	const responseData = {
		currentSlide: session.currentSlide,
		totalSlides: session.totalSlides,
		connectedDevices: session.connectedDevices,
		lastUpdate: session.lastUpdate,
		slides: session.slides,
		workshopStartTime: session.workshopStartTime,
		workshopEndTime: session.workshopEndTime,
		workshopData: session.workshopData
	};
	
	return json(responseData);
};

export const POST: RequestHandler = async ({ params, request }) => {
	const { sessionCode } = params;
	const data = await request.json();
	
	console.log('📥 API SERVER - Received POST data:', {
		sessionCode,
		type: data.type,
		hasSlides: !!data.slides,
		hasWorkshopData: !!data.workshopData,
		hasWorkshopStart: !!data.workshopStartTime,
		hasWorkshopEnd: !!data.workshopEndTime,
		allKeys: Object.keys(data),
		workshopTitle: data.workshopData?.title
	});
	
	const session = sessionStore.getSession(sessionCode);
	
	switch (data.type) {
		case 'init-presenter':
			sessionStore.updateSlides(sessionCode, data.slides || '', data.totalSlides || 0);
			break;
			
		case 'slide-change':
			sessionStore.updateSlideState(sessionCode, data.current, data.total);
			// Socket.IO will handle broadcasting via the server
			break;
			
		case 'connect-device':
			sessionStore.incrementDeviceCount(sessionCode);
			
			// If slides data is provided, update the session
			if (data.slides) {
				sessionStore.updateSlides(sessionCode, data.slides, data.totalSlides || 0);
			}
			break;
			
		case 'disconnect-device':
			sessionStore.decrementDeviceCount(sessionCode);
			break;
			
		case 'update-slides':
			// Update slides from connect page lesson selection
			sessionStore.updateSlides(sessionCode, data.slides || '', data.totalSlides || 0);
			
			// Include full workshop data if provided
			if (data.workshopData) {
				sessionStore.updateWorkshopData(
					sessionCode, 
					data.workshopData, 
					data.workshopStartTime, 
					data.workshopEndTime
				);
				console.log('🔄 API SERVER - Storing full workshop data in session:', {
					sessionCode,
					workshopId: data.workshopData.$id,
					title: data.workshopData.title,
					start: data.workshopStartTime,
					end: data.workshopEndTime
				});
				
				// Socket.IO will handle broadcasting via the server automatically
			} else {
				console.log('❌ API SERVER - No workshop data in request:', {
					sessionCode,
					hasWorkshopData: !!data.workshopData,
					hasStart: !!data.workshopStartTime,
					hasEnd: !!data.workshopEndTime,
					dataKeys: Object.keys(data)
				});
			}
			
			// Debug: Show what's now stored in the session
			console.log('💾 API SERVER - Session contents after update:', {
				sessionCode,
				hasSlides: !!session.slides,
				hasWorkshopData: !!session.workshopData,
				hasWorkshopStart: !!session.workshopStartTime,
				hasWorkshopEnd: !!session.workshopEndTime,
				workshopTitle: session.workshopData?.title
			});
			break;
			
		case 'command':
			// Add command to session store
			const commandId = sessionStore.addCommand(sessionCode, data.command);
			
			// Socket.IO will handle command forwarding via the server automatically
			console.log('🎮 Command processed:', {
				sessionCode,
				command: data.command,
				commandId
			});
			break;
	}
	
	return json({ success: true, session });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const { sessionCode } = params;
	sessionStore.deleteSession(sessionCode);
	return json({ success: true });
};