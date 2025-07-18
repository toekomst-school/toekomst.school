<script context="module" lang="ts">
	declare module '@event-calendar/core';
</script>

<script>
	// import Interaction from '@event-calendar/interaction';
	// @ts-ignore
	import List from '@event-calendar/list';
	import { writable } from 'svelte/store';
	import { account, databases } from '$lib/appwrite';
	import { onMount, afterUpdate } from 'svelte';
	import { derived } from 'svelte/store';
	import { page } from '$app/stores';
	import WorkshopForm from '$lib/components/WorkshopForm.svelte';
	import { Calendar, TimeGrid, DayGrid } from '@event-calendar/core';
	import { Client, Databases, Query } from 'appwrite';
	import WorkshopView from '$lib/components/WorkshopView.svelte';
	import { appwrite } from '$lib/appwrite';
	import { goto } from '$app/navigation';
	import { teamStore } from '$lib/stores/team';
	import { onMount as onMountSvelte } from 'svelte';
	import { _ } from 'svelte-i18n';

	// Calculate Monday of this week
	const now = new Date();
	const monday = new Date(now);
	monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

	let eventIdCounter = 1;
	const exampleEvents = [
		// Available event (orange)
		{
			id: eventIdCounter++,
			title: $_('planning.workshop_robotics'),
			start: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate(),
				10,
				0
			).toISOString(),
			end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 11, 0).toISOString(),
			color: 'var(--warning)',
			status: 'geplanned',
			teacher: ''
		},
		// My event (teal)
		{
			id: eventIdCounter++,
			title: $_('planning.workshop_3d_printing'),
			start: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 1,
				9,
				30
			).toISOString(),
			end: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 1,
				11,
				0
			).toISOString(),
			color: 'var(--accent)',
			status: 'bevestigd',
			teacher: '' // Will be set to currentUserId on mount
		},
		// Available event (orange)
		{
			id: eventIdCounter++,
			title: $_('planning.children_party_games'),
			start: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 2,
				14,
				0
			).toISOString(),
			end: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 2,
				16,
				0
			).toISOString(),
			color: 'var(--warning)',
			status: 'geplanned',
			teacher: ''
		},
		// My event (teal)
		{
			id: eventIdCounter++,
			title: $_('planning.digi_scouting_code'),
			start: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 3,
				15,
				0
			).toISOString(),
			end: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 3,
				16,
				30
			).toISOString(),
			color: 'var(--accent)',
			status: 'bevestigd',
			teacher: '' // Will be set to currentUserId on mount
		},
		// Available event (orange)
		{
			id: eventIdCounter++,
			title: $_('planning.children_party_science'),
			start: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 4,
				13,
				0
			).toISOString(),
			end: new Date(
				monday.getFullYear(),
				monday.getMonth(),
				monday.getDate() + 4,
				15,
				0
			).toISOString(),
			color: 'var(--warning)',
			status: 'geplanned',
			teacher: ''
		}
	];

	// Remove static lessonOptions, replace with dynamic
	let lessonOptions: { value: string; label: string }[] = [];
	let schoolOptions: { value: string; label: string }[] = [];
	let teacherOptions: { value: string; label: string }[] = [];
	
	// Modal state for editing events
	let showEditModal: boolean = false;
	let editEvent: any = null;
	let description: string = '';
	let editEventStart: string = '';
	let editEventEnd: string = '';
	let eventSessions: any[] = [];

	let showCreateModal: boolean = false;

	let calendarKey: number = 0;
	let calendarRef: any;

	// Modal state for new fields
	import type { Option } from '$lib/components/WorkshopForm.svelte';
	let selectedSchool: Option | null = null;
	let selectedTeacher: Option | null = null;
	let lessonLength: number = 45;
	let materialen: string = '';
	let status: string = 'concept'; // default: 'concept' for admin, 'geplanned' for others
	let eventType: 'schooldag' | 'event' = 'schooldag';
	let title: string = '';
	const allStatusOptions = [
		{ value: 'concept', label: $_('planning.status_concept') },
		{ value: 'geplanned', label: $_('planning.status_planned') },
		{ value: 'gekoppeld', label: $_('planning.status_linked') },
		{ value: 'bevestigd', label: $_('planning.status_confirmed') },
		{ value: 'in_uitvoering', label: $_('planning.status_in_progress') },
		{ value: 'afgerond', label: $_('planning.status_completed') },
		{ value: 'gecanceld', label: $_('planning.status_cancelled') }
	];

	// Filter status options for non-admin users
	$: statusOptions = isAdmin ? allStatusOptions : allStatusOptions.filter(option => option.value !== 'concept');

	let currentUserId: string = '';
	let currentUserLabels: string[] = [];
	let isAdmin: boolean = false;
	
	// Team options for vakdocenten assignment
	let teamOptions: Option[] = [];
	let isVakdocent: boolean = false;
	let currentTab: string = 'beschikbaar'; // 'beschikbaar', 'mijn-planning', or 'alle-workshops'
	let currentCalendarView: string = 'dayGridMonth'; // Track current calendar view
	let currentCalendarDate: Date = new Date(); // Track current date/week being viewed
	let isUpdatingFromCallback: boolean = false; // Prevent infinite loops
	
	// Local state for filtered calendars to prevent reactive loops
	let availableCalendarView: string = 'dayGridMonth';
	let availableCalendarDate: Date = new Date();
	let myCalendarView: string = 'dayGridMonth';
	let myCalendarDate: Date = new Date();
	
	// Separate events arrays for each tab
	let availableEvents: any[] = [];
	let myEvents: any[] = [];
	let allEvents: any[] = [];

	// Update calendar view when currentCalendarView changes (but not from callbacks)
	$: if (currentCalendarView && !isUpdatingFromCallback) {
		options.update(opts => ({
			...opts,
			view: currentCalendarView
		}));
	}

	// Update calendar date when currentCalendarDate changes (but not from callbacks)
	$: if (currentCalendarDate && !isUpdatingFromCallback) {
		options.update(opts => ({
			...opts,
			date: currentCalendarDate
		}));
	}

	const databaseId = 'lessen';
	const collectionId = 'planning';

	// For fetching schools
	const SCHOOL_DB_ID = 'scholen';
	const SCHOOL_COLLECTION_ID = 'school';

	interface CalendarEvent {
		id: string;
		title?: string;
		start: string;
		end: string;
		color?: string;
		status?: string;
		teacher?: string;
		lesson?: string;
		school?: string;
		group?: string;
		materialen?: string;
		description?: string;
		length?: number;
		sessions?: Array<{
			start: string;
			end: string;
			title?: string;
			type: 'session' | 'break';
			duration?: number;
		}>;
		totalDuration?: number;
		extendedProps?: any;
	}

	interface CalendarOptions {
		view: string;
		date?: Date;
		events: CalendarEvent[];
		locale: string;
		firstDay: number;
		editable: boolean;
		headerToolbar: any;
		eventClick: (info: any) => void;
		viewDidMount?: (info: any) => void;
		datesSet?: (info: any) => void;
		slotMinTime: string;
		slotMaxTime: string;
		eventContent: (info: any) => string | HTMLElement;
	}

	const options: Writable<CalendarOptions> = writable({
		view: currentCalendarView,
		date: currentCalendarDate,
		events: [], // Start empty, will be filled from Appwrite
		locale: 'nl',
		firstDay: 1,
		editable: true,
		headerToolbar: {
			start: 'prev,next today',
			center: 'title',
			end: window.innerWidth <= 768 ? 'listWeek,timeGridWeek,dayGridMonth' : 'dayGridMonth,timeGridWeek,listWeek'
		},
		buttonText: {
			today: $_('planning.today'),
			dayGridMonth: $_('planning.month'),
			timeGridWeek: $_('planning.week'),
			listWeek: $_('planning.list')
		},
		eventClick: handleEventClick,
		viewDidMount: (info) => {
			// Update our tracked view when the calendar view changes
			currentCalendarView = info.view.type;
			
			// Fetch data for the new view if we're on alle-workshops tab
			if (currentTab === 'alle-workshops' && !isUpdatingFromCallback) {
				isUpdatingFromCallback = true;
				const dateRange = getDateRangeForView(currentCalendarDate, info.view.type);
				fetchAllEvents(dateRange).then(() => {
					options.update((current) => ({
						...current,
						events: allEvents
					}));
					setTimeout(() => { isUpdatingFromCallback = false; }, 100);
				});
			}
		},
		datesSet: (info) => {
			// Update our tracked date when the calendar date range changes (prev/next navigation)
			currentCalendarDate = new Date(info.view.currentStart);
			
			// Fetch data for the new date range if we're on alle-workshops tab
			if (currentTab === 'alle-workshops' && !isUpdatingFromCallback) {
				isUpdatingFromCallback = true;
				const dateRange = getDateRangeForView(currentCalendarDate, currentCalendarView);
				fetchAllEvents(dateRange).then(() => {
					options.update((current) => ({
						...current,
						events: allEvents
					}));
					setTimeout(() => { isUpdatingFromCallback = false; }, 100);
				});
			}
		},
		// Restrict visible hours in timeGrid views
		slotMinTime: '07:00:00',
		slotMaxTime: '22:00:00',
		// slotLabelInterval: 30,
		eventContent: (info) => {
			const event = info.event;
			const title = event.title || '';
			
			// Format start and end times
			let timeRange = '';
			if (event.start && event.end) {
				const startTime = new Date(event.start).toLocaleTimeString('nl-NL', { 
					hour: '2-digit', 
					minute: '2-digit' 
				});
				const endTime = new Date(event.end).toLocaleTimeString('nl-NL', { 
					hour: '2-digit', 
					minute: '2-digit' 
				});
				timeRange = `${startTime} - ${endTime}`;
			}
			
			const parts = [];
			if (timeRange) parts.push(`<strong>${timeRange}</strong>`);
			if (title) parts.push(`<span class="event-title">${title}</span>`);
			
			return { html: `<div class="event-content">${parts.join('<br/>')}</div>` };
		}
	});

	// Define the event click handler
	function handleEventClick(info: any) {
		console.log('=== EVENT CLICK DEBUG ===');
		console.log('handleEventClick called with:', info);
		console.log('handleEventClick: info.event:', info.event);
		console.log('handleEventClick: info.event.id:', info.event.id);
		console.log('handleEventClick: info.event.title:', info.event.title);
		console.log('handleEventClick: info.event.start:', info.event.start);
		console.log('handleEventClick: info.event.end:', info.event.end);
		console.log('handleEventClick: info.event.extendedProps:', info.event.extendedProps);
		console.log('handleEventClick: info.jsEvent:', info.jsEvent);
		console.log('handleEventClick: info.view:', info.view);
		console.log('=== END EVENT CLICK DEBUG ===');
		openViewModal(info.event);
	}
	
	// Separate callback handlers for filtered calendars to prevent reactive loops
	let isUpdatingAvailableCalendar = false;
	let isUpdatingMyCalendar = false;
	
	function handleAvailableViewDidMount(info: any) {
		if (isUpdatingAvailableCalendar) return;
		availableCalendarView = info.view.type;
		// Fetch data for the new view
		const dateRange = getDateRangeForView(availableCalendarDate, info.view.type);
		isUpdatingAvailableCalendar = true;
		fetchAvailableEvents(dateRange).then(() => {
			createAvailableOptions();
			setTimeout(() => { isUpdatingAvailableCalendar = false; }, 100);
		});
	}
	
	function handleAvailableDatesSet(info: any) {
		if (isUpdatingAvailableCalendar) return;
		availableCalendarDate = new Date(info.view.currentStart);
		// Fetch data for the new date range
		const dateRange = getDateRangeForView(availableCalendarDate, availableCalendarView);
		isUpdatingAvailableCalendar = true;
		fetchAvailableEvents(dateRange).then(() => {
			createAvailableOptions();
			setTimeout(() => { isUpdatingAvailableCalendar = false; }, 100);
		});
	}
	
	function handleMyViewDidMount(info: any) {
		if (isUpdatingMyCalendar) return;
		myCalendarView = info.view.type;
		// Fetch data for the new view
		const dateRange = getDateRangeForView(myCalendarDate, info.view.type);
		isUpdatingMyCalendar = true;
		fetchMyEvents(dateRange).then(() => {
			createMyOptions();
			setTimeout(() => { isUpdatingMyCalendar = false; }, 100);
		});
	}
	
	function handleMyDatesSet(info: any) {
		if (isUpdatingMyCalendar) return;
		myCalendarDate = new Date(info.view.currentStart);
		// Fetch data for the new date range
		const dateRange = getDateRangeForView(myCalendarDate, myCalendarView);
		isUpdatingMyCalendar = true;
		fetchMyEvents(dateRange).then(() => {
			createMyOptions();
			setTimeout(() => { isUpdatingMyCalendar = false; }, 100);
		});
	}

	// Helper function to get date range for calendar view
	function getDateRangeForView(currentDate: Date, view: string) {
		const startOfRange = new Date(currentDate);
		const endOfRange = new Date(currentDate);
		
		switch (view) {
			case 'dayGridMonth':
				// Get full month range
				startOfRange.setDate(1);
				startOfRange.setHours(0, 0, 0, 0);
				endOfRange.setMonth(endOfRange.getMonth() + 1);
				endOfRange.setDate(0);
				endOfRange.setHours(23, 59, 59, 999);
				break;
			case 'timeGridWeek':
				// Get week range (Monday to Sunday)
				const dayOfWeek = startOfRange.getDay();
				const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
				startOfRange.setDate(startOfRange.getDate() - daysFromMonday);
				startOfRange.setHours(0, 0, 0, 0);
				endOfRange.setDate(startOfRange.getDate() + 6);
				endOfRange.setHours(23, 59, 59, 999);
				break;
			case 'listWeek':
				// Same as timeGridWeek for data fetching
				const dayOfWeekList = startOfRange.getDay();
				const daysFromMondayList = dayOfWeekList === 0 ? 6 : dayOfWeekList - 1;
				startOfRange.setDate(startOfRange.getDate() - daysFromMondayList);
				startOfRange.setHours(0, 0, 0, 0);
				endOfRange.setDate(startOfRange.getDate() + 6);
				endOfRange.setHours(23, 59, 59, 999);
				break;
			default:
				// Default to month view
				startOfRange.setDate(1);
				startOfRange.setHours(0, 0, 0, 0);
				endOfRange.setMonth(endOfRange.getMonth() + 1);
				endOfRange.setDate(0);
				endOfRange.setHours(23, 59, 59, 999);
				break;
		}
		
		return {
			start: startOfRange.toISOString(),
			end: endOfRange.toISOString()
		};
	}

	// Data fetching functions with server-side filtering and date range
	async function fetchAvailableEvents(dateRange?: {start: string, end: string}) {
		try {
			const queries = [
				Query.or([
					Query.equal('teacher', ''),
					Query.isNull('teacher'),
					Query.equal('status', 'geplanned')
				])
			];
			
			// Hide concept workshops from non-admin users
			if (!isAdmin) {
				queries.push(Query.notEqual('status', 'concept'));
			}
			
			// Add team context filtering (if team is selected and user is not admin)
			if (!isAdmin && $teamStore.selectedTeam && $teamStore.selectedTeam.$id) {
				// For now, we'll filter by checking if the user is in the team
				// In the future, workshops should have a team field
				queries.push(Query.equal('teamId', $teamStore.selectedTeam.$id));
			}
			
			// Add date range filters if provided
			if (dateRange) {
				queries.push(Query.greaterThanEqual('start', dateRange.start));
				queries.push(Query.lessThanEqual('start', dateRange.end));
			}
			
			const res = await databases.listDocuments(databaseId, collectionId, queries);
			availableEvents = res.documents.map(mapDocumentToEvent);
		} catch (error) {
			console.error('Failed to fetch available events:', error);
			availableEvents = [];
		}
	}

	async function fetchMyEvents(dateRange?: {start: string, end: string}) {
		if (!currentUserId) {
			myEvents = [];
			return;
		}
		
		try {
			const queries = [
				Query.equal('teacher', currentUserId)
			];
			
			// Hide concept workshops from non-admin users
			if (!isAdmin) {
				queries.push(Query.notEqual('status', 'concept'));
			}
			
			// Add team context filtering (if team is selected and user is not admin)
			if (!isAdmin && $teamStore.selectedTeam && $teamStore.selectedTeam.$id) {
				queries.push(Query.equal('teamId', $teamStore.selectedTeam.$id));
			}
			
			// Add date range filters if provided
			if (dateRange) {
				queries.push(Query.greaterThanEqual('start', dateRange.start));
				queries.push(Query.lessThanEqual('start', dateRange.end));
			}
			
			const res = await databases.listDocuments(databaseId, collectionId, queries);
			myEvents = res.documents.map(mapDocumentToEvent);
		} catch (error) {
			console.error('Failed to fetch my events:', error);
			myEvents = [];
		}
	}

	async function fetchAllEvents(dateRange?: {start: string, end: string}) {
		try {
			const queries: any[] = [];
			
			// Hide concept workshops from non-admin users
			if (!isAdmin) {
				queries.push(Query.notEqual('status', 'concept'));
			}
			
			// Add team context filtering (if team is selected and user is not admin)
			if (!isAdmin && $teamStore.selectedTeam && $teamStore.selectedTeam.$id) {
				queries.push(Query.equal('teamId', $teamStore.selectedTeam.$id));
			}
			
			// Add date range filters if provided
			if (dateRange) {
				queries.push(Query.greaterThanEqual('start', dateRange.start));
				queries.push(Query.lessThanEqual('start', dateRange.end));
			}
			
			const res = await databases.listDocuments(databaseId, collectionId, queries);
			allEvents = res.documents.map(mapDocumentToEvent);
		} catch (error) {
			console.error('Failed to fetch all events:', error);
			allEvents = [];
		}
	}

	// Helper function to map document to event format
	function mapDocumentToEvent(doc: any) {
		// Create title: school name OR event name (without klas)
		let title = '';
		
		// Get the base name (school name or event name)
		if (doc.school) {
			const schoolOpt = schoolOptions.find(opt => opt.value === doc.school);
			title = schoolOpt ? schoolOpt.label : 'School';
		} else if (doc.description && doc.description.trim()) {
			title = doc.description;
		} else if (doc.lesson) {
			const lessonOpt = lessonOptions.find(opt => opt.value === doc.lesson);
			title = lessonOpt ? lessonOpt.label : 'Workshop';
		} else {
			title = 'Workshop';
		}
		
		return {
			id: doc.$id,
			title: title,
			start: String(doc.start),
			end: String(doc.end),
			color: doc.teacher ? 'var(--accent)' : 'var(--warning)',
			status: doc.status || '',
			teacher: doc.teacher ? String(doc.teacher) : '',
			lesson: doc.lesson ? String(doc.lesson) : '',
			school: doc.school ? String(doc.school) : '',
			group: doc.group || '',
			materialen: doc.materialen || '',
			description: doc.description || '',
			length: doc.length || 45,
			extendedProps: {
				id: doc.$id,
				lesson: doc.lesson,
				school: doc.school,
				teacher: doc.teacher,
				group: doc.group,
				materialen: doc.materialen,
				status: doc.status,
				description: doc.description,
				length: doc.length,
				color: doc.teacher ? 'var(--accent)' : 'var(--warning)',
				start: doc.start,
				end: doc.end,
				sessions: doc.sessions,
				totalDuration: doc.totalDuration,
				eventType: doc.eventType
			}
		};
	}
	
	// Create separate options for each calendar to prevent reactive loops
	let availableOptions: any = null;
	let myOptions: any = null;
	
	// Function to create calendar options for each tab
	function createAvailableOptions() {
		availableOptions = {
			view: availableCalendarView,
			date: availableCalendarDate,
			events: availableEvents,
			locale: 'nl',
			firstDay: 1,
			editable: true,
			headerToolbar: {
				start: 'prev,next today',
				center: 'title',
				end: window.innerWidth <= 768 ? 'listWeek,timeGridWeek,dayGridMonth' : 'dayGridMonth,timeGridWeek,listWeek'
			},
			buttonText: {
				today: $_('planning.today'),
				dayGridMonth: $_('planning.month'),
				timeGridWeek: $_('planning.week'),
				listWeek: $_('planning.list')
			},
			eventClick: handleEventClick,
			viewDidMount: handleAvailableViewDidMount,
			datesSet: handleAvailableDatesSet,
			slotMinTime: '07:00:00',
			slotMaxTime: '22:00:00',
			eventContent: (info) => {
				const event = info.event;
				const title = event.title || '';
				
				// Format start and end times
				let timeRange = '';
				if (event.start && event.end) {
					const startTime = new Date(event.start).toLocaleTimeString('nl-NL', { 
						hour: '2-digit', 
						minute: '2-digit' 
					});
					const endTime = new Date(event.end).toLocaleTimeString('nl-NL', { 
						hour: '2-digit', 
						minute: '2-digit' 
					});
					timeRange = `${startTime} - ${endTime}`;
				}
				
				const parts = [];
				if (timeRange) parts.push(`<strong>${timeRange}</strong>`);
				if (title) parts.push(`<span class="event-title">${title}</span>`);
				
				return { html: `<div class="event-content">${parts.join('<br/>')}</div>` };
			}
		};
	}
	
	function createMyOptions() {
		myOptions = {
			view: myCalendarView,
			date: myCalendarDate,
			events: myEvents,
			locale: 'nl',
			firstDay: 1,
			editable: true,
			headerToolbar: {
				start: 'prev,next today',
				center: 'title',
				end: window.innerWidth <= 768 ? 'listWeek,timeGridWeek,dayGridMonth' : 'dayGridMonth,timeGridWeek,listWeek'
			},
			buttonText: {
				today: $_('planning.today'),
				dayGridMonth: $_('planning.month'),
				timeGridWeek: $_('planning.week'),
				listWeek: $_('planning.list')
			},
			eventClick: handleEventClick,
			viewDidMount: handleMyViewDidMount,
			datesSet: handleMyDatesSet,
			slotMinTime: '07:00:00',
			slotMaxTime: '22:00:00',
			eventContent: (info) => {
				const event = info.event;
				const title = event.title || '';
				
				// Format start and end times
				let timeRange = '';
				if (event.start && event.end) {
					const startTime = new Date(event.start).toLocaleTimeString('nl-NL', { 
						hour: '2-digit', 
						minute: '2-digit' 
					});
					const endTime = new Date(event.end).toLocaleTimeString('nl-NL', { 
						hour: '2-digit', 
						minute: '2-digit' 
					});
					timeRange = `${startTime} - ${endTime}`;
				}
				
				const parts = [];
				if (timeRange) parts.push(`<strong>${timeRange}</strong>`);
				if (title) parts.push(`<span class="event-title">${title}</span>`);
				
				return { html: `<div class="event-content">${parts.join('<br/>')}</div>` };
			}
		};
	}

	let showViewModal: boolean = false;
	let viewEvent: any = null;
	let showIcalModal: boolean = false;




	// Set currentTab based on hash
	async function setTabFromHash() {
		const hash = window.location.hash.replace('#', '');
		if (hash === 'beschikbaar' || hash === 'mijn-planning' || hash === 'alle-workshops') {
			currentTab = hash;
		} else {
			currentTab = 'beschikbaar';
		}
		// Load data for the new tab
		await loadCurrentTabData();
	}

	onMount(() => {
		setTabFromHash();
		window.addEventListener('hashchange', setTabFromHash);
		return () => window.removeEventListener('hashchange', setTabFromHash);
	});

	// Function to load data for the current tab
	async function loadCurrentTabData() {
		switch (currentTab) {
			case 'beschikbaar':
				const availableDateRange = getDateRangeForView(availableCalendarDate, availableCalendarView);
				await fetchAvailableEvents(availableDateRange);
				createAvailableOptions();
				break;
			case 'mijn-planning':
				const myDateRange = getDateRangeForView(myCalendarDate, myCalendarView);
				await fetchMyEvents(myDateRange);
				createMyOptions();
				break;
			case 'alle-workshops':
				const allDateRange = getDateRangeForView(currentCalendarDate, currentCalendarView);
				await fetchAllEvents(allDateRange);
				// Update main options for alle-workshops tab
				options.update((current) => ({
					...current,
					events: allEvents
				}));
				break;
		}
	}

	onMount(async () => {
		try {
			// Fetch lessons for the select
			const lessonsRes = await databases.listDocuments('lessen', 'les');
			lessonOptions = lessonsRes.documents.map((lesson) => ({
				value: lesson.$id,
				label: lesson.onderwerp || lesson.lesnummer || $_('planning.lesson_no_name')
			}));

			// Fetch vakdocenten for the select
			const teachersRes = await databases.listDocuments('lessen', 'vakdocent');
			teacherOptions = teachersRes.documents.map((teacher) => ({
				value: teacher.$id,
				label: teacher.name || teacher.email || $_('planning.teacher_no_name')
			}));

			// Fetch only client schools (KLANT = true) from correct DB/collection
			const schoolsRes = await databases.listDocuments(SCHOOL_DB_ID, SCHOOL_COLLECTION_ID, [
				Query.equal('KLANT', true),
				Query.limit(1000)
			]);
			schoolOptions = schoolsRes.documents.map((school) => ({
				value: school.$id,
				label: school.NAAM || school.$id
			}));

			const user = await account.get();
			currentUserId = user.$id;
			currentUserLabels = user.labels || [];
			isAdmin = currentUserLabels.includes('admin');
			isVakdocent = currentUserLabels.includes('vakdocent');
			
			// Load teams for team selection (now that we have currentUserId)
			await loadTeams();
			
			// Load data for the current tab
			await loadCurrentTabData();
		} catch (e) {
			currentUserId = '';
			currentUserLabels = [];
			isAdmin = false;
			isVakdocent = false;
			console.error('Failed to fetch planning events, user, lessons, vakdocenten, or schools:', e);
		}
	});

	// Load teams for team selection
	async function loadTeams() {
		try {
			// Make sure we have a user ID before requesting teams
			if (!currentUserId) {
				console.warn('No current user ID available for teams request');
				return;
			}
			
			const response = await fetch(`/api/teams?userId=${encodeURIComponent(currentUserId)}`, {
				headers: {
					'Content-Type': 'application/json',
				}
			});
			
			if (!response.ok) {
				console.warn('Teams API not available, continuing without teams');
				return;
			}
			
			const data = await response.json();
			
			if (data.success && data.teams) {
				teamStore.setTeams(data.teams);
				
				// Show all teams for now - you can filter later if needed
				teamOptions = data.teams
					.filter((team: any) => team.name) // Just ensure team has a name
					.map((team: any) => ({
						value: team.$id,
						label: team.name,
						group: team.name.toLowerCase().includes('vakdocent') ? 'Vakdocenten Teams' : 'Other Teams'
					}));
				
				console.log('Loaded teams:', data.teams);
				console.log('Team options for form:', teamOptions);
				
				// If no team is selected yet and user has teams, auto-select the first one
				// This will respect any previously saved team selection from localStorage
				if (!$teamStore.selectedTeam && data.teams.length > 0) {
					teamStore.setSelectedTeam(data.teams[0]);
				}
				
				// If we have a selected team but it's not in the current teams list, 
				// find and set the actual team object
				if ($teamStore.selectedTeam && $teamStore.selectedTeam.$id && !$teamStore.selectedTeam.name) {
					const fullTeam = data.teams.find(t => t.$id === $teamStore.selectedTeam.$id);
					if (fullTeam) {
						teamStore.setSelectedTeam(fullTeam);
					}
				}
			} else {
				console.warn('No teams found or teams API error:', data.error);
			}
		} catch (error) {
			console.warn('Teams API not available, continuing without teams:', error);
		}
	}

	/**
	 * @param {any} event
	 */
	async function claimEvent(event: any) {
		if (!currentUserId) return;
		const updatedEvent = { ...event, teacher: currentUserId, status: 'bevestigd' };
		try {
			await databases.updateDocument(databaseId, collectionId, updatedEvent.id, updatedEvent);
			// @ts-ignore
			options.update((current) => ({
				...current,
				events: current.events.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev))
			}));
			if (calendarRef && typeof calendarRef.updateEvent === 'function') {
				calendarRef.updateEvent(updatedEvent);
			}
		} catch (e) {
			console.error('Failed to claim event:', e);
		}
	}

	/**
	 * @param {any} event
	 */
	function openEditModal(event: any) {
		editEvent = event;
		
		// Handle different event object structures (calendar event vs database event)
		const eventData = event.extendedProps || event;
		
		// Load only the fields we need
		description = eventData.description || '';
		let startStr = typeof event.start === 'string' ? event.start : event.start.toISOString();
		editEventStart = startStr.slice(0, 16);
		selectedSchool = schoolOptions.find((opt) => opt.value === eventData.school) || null;
		selectedTeacher = teacherOptions.find((opt) => opt.value === eventData.teacher) || null;
		lessonLength = eventData.length || 45;
		materialen = eventData.materialen || '';
		status = eventData.status || 'concept';
		
		// Load eventType and title from saved data
		// If eventType is not set, infer it from the data structure
		eventType = eventData.eventType || (eventData.school ? 'schooldag' : 'event');
		title = eventData.title || event.title || '';
		
		// Parse sessions from JSON string
		eventSessions = [];
		if (eventData.sessions) {
			try {
				eventSessions = typeof eventData.sessions === 'string' ? JSON.parse(eventData.sessions) : eventData.sessions;
			} catch (e) {
				console.error('Error parsing sessions:', e);
				eventSessions = [];
			}
		}
		
		showEditModal = true;
	}
	function closeEditModal() {
		showEditModal = false;
		editEvent = null;
		description = '';
		editEventStart = '';
		selectedSchool = null;
		selectedTeacher = null;
		lessonLength = 45;
		materialen = '';
		status = isAdmin ? 'concept' : 'geplanned';
		eventType = 'schooldag';
		title = '';
	}
	function getEndTime() {
		if (!editEventStart || !lessonLength) return '';
		const totalMinutes = Number(lessonLength);
		const end = new Date(new Date(editEventStart).getTime() + totalMinutes * 60000);
		return end.toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' });
	}
	async function submitEditEvent(e: any) {
		if (e && e.preventDefault) e.preventDefault();
		if (!editEvent) return;
		
		// Handle workshop editing
		const formData = e.detail;
		console.log('Editing workshop with data:', formData);
		
		// Use the end time of the last session
		const lastSession = formData.sessions[formData.sessions.length - 1];
		const endTime = lastSession.end;
		const totalMinutes = formData.totalDuration;
		
		// Resolve title based on event type
		let resolvedTitle = '';
		if (formData.eventType === 'event') {
			resolvedTitle = formData.title || '';
		} else if (formData.eventType === 'schooldag' && formData.selectedSchool) {
			const schoolOpt = schoolOptions.find(opt => opt.value === formData.selectedSchool);
			resolvedTitle = schoolOpt ? schoolOpt.label : '';
		}

		// Only send fields that are part of the Appwrite schema (do not spread ...editEvent)
		const updatedEvent = {
			description: formData.description || '',
			title: resolvedTitle,
			start: formData.computedStart || formData.editEventStart,
			end: formData.computedEnd || endTime,
			school: formData.selectedSchool ? String(formData.selectedSchool) : '',
			teacher: formData.selectedTeacher ? String(formData.selectedTeacher) : '',
			length: totalMinutes,
			materialen: formData.materialen || '',
			status: formData.selectedTeacher ? 'bevestigd' : 'geplanned',
			sessions: formData.sessions && formData.sessions.length > 0 ? JSON.stringify(formData.sessions) : JSON.stringify([]),
			totalDuration: formData.totalDuration || totalMinutes,
			eventType: formData.eventType || 'schooldag',
			assignedTeams: formData.assignedTeams && formData.assignedTeams.length > 0 ? JSON.stringify(formData.assignedTeams) : JSON.stringify([])
			};
		console.log('Updating event with ID:', editEvent.id, 'Data:', updatedEvent);
		try {
			await databases.updateDocument(databaseId, collectionId, editEvent.id, updatedEvent);
			console.log('Successfully updated workshop');
			options.update((current) => ({
				...current,
				events: current.events.map((ev) =>
					ev.id === editEvent.id ? { ...ev, ...updatedEvent } : ev
				)
			}));
			if (calendarRef && typeof calendarRef.updateEvent === 'function') {
				calendarRef.updateEvent({ ...editEvent, ...updatedEvent });
			}
			closeEditModal();
		} catch (e) {
			console.error('Failed to update event:', e);
			// Don't close modal on error so user can retry
		}
	}

	function openCreateModal() {
		showCreateModal = true;
		editEvent = null;
		editEventStart = '';
		const now = new Date();
		editEventStart = now.toISOString().slice(0, 16);
		const end = new Date(now.getTime() + 60 * 60 * 1000);
		editEventEnd = end.toISOString().slice(0, 16);
		selectedSchool = null;
		selectedTeacher = null;
		lessonLength = 45;
		materialen = '';
		status = isAdmin ? 'concept' : 'geplanned';
		eventType = 'schooldag';
		title = '';
	}

	function closeCreateModal() {
		showCreateModal = false;
		editEvent = null;
		editEventStart = '';
		editEventEnd = '';
		selectedSchool = null;
		selectedTeacher = null;
		lessonLength = 45;
		materialen = '';
		status = isAdmin ? 'concept' : 'geplanned';
		eventType = 'schooldag';
		title = '';
	}

	async function submitCreateEvent(e: any) {
		if (e && e.preventDefault) e.preventDefault();
		
		// Handle workshop creation
		const formData = e.detail;
		console.log('Creating workshop with data:', formData);
		
		// Use the end time of the last session
		const lastSession = formData.sessions[formData.sessions.length - 1];
		const endTime = lastSession.end;
		const totalMinutes = formData.totalDuration;
		
		// Resolve title based on event type
		let resolvedTitle = '';
		if (formData.eventType === 'event') {
			resolvedTitle = formData.title || '';
		} else if (formData.eventType === 'schooldag' && formData.selectedSchool) {
			const schoolOpt = schoolOptions.find(opt => opt.value === formData.selectedSchool);
			resolvedTitle = schoolOpt ? schoolOpt.label : '';
		}

		const newEvent = {
			description: formData.description || '',
			title: resolvedTitle,
			start: formData.computedStart || formData.editEventStart,
			end: formData.computedEnd || endTime,
			school: formData.selectedSchool ? String(formData.selectedSchool) : '',
			teacher: formData.selectedTeacher ? String(formData.selectedTeacher) : '',
			length: totalMinutes,
			materialen: formData.materialen || '',
			status: formData.selectedTeacher ? 'bevestigd' : 'geplanned',
			sessions: formData.sessions && formData.sessions.length > 0 ? JSON.stringify(formData.sessions) : JSON.stringify([]),
			totalDuration: formData.totalDuration || totalMinutes,
			eventType: formData.eventType || 'schooldag',
			teamId: ($teamStore.selectedTeam && $teamStore.selectedTeam.$id) ? $teamStore.selectedTeam.$id : '',
			assignedTeams: formData.assignedTeams && formData.assignedTeams.length > 0 ? JSON.stringify(formData.assignedTeams) : JSON.stringify([])
			};
		console.log('Creating event with data:', newEvent);
		try {
			const doc = await databases.createDocument(databaseId, collectionId, 'unique()', newEvent);
			console.log('Successfully created workshop:', doc);
			// Ensure the event added to the store matches the structure from Appwrite fetch
			const eventForStore = {
				id: doc.$id,
				title: doc.title || '',
				start: doc.start,
				end: doc.end,
				color: doc.teacher ? 'var(--accent)' : 'var(--warning)',
				status: doc.status || '',
				teacher: doc.teacher ? String(doc.teacher) : '',
				lesson: doc.lesson ? String(doc.lesson) : '',
				school: doc.school ? String(doc.school) : '',
				group: doc.group || '',
				materialen: doc.materialen || '',
				description: doc.description || '',
				length: doc.length || 45,
				extendedProps: {
					lesson: doc.lesson,
					school: doc.school,
					teacher: doc.teacher,
					group: doc.group,
					materialen: doc.materialen,
					status: doc.status,
					description: doc.description,
					length: doc.length,
					color: doc.teacher ? 'var(--accent)' : 'var(--warning)',
					start: doc.start,
					end: doc.end,
					sessions: doc.sessions ? JSON.parse(doc.sessions) : [],
					totalDuration: doc.totalDuration,
					eventType: doc.eventType
				}
			};
			options.update((current) => ({
				...current,
				events: [...current.events, eventForStore]
			}));
			closeCreateModal();
			// Refresh the page to reload calendar data
			window.location.reload();
		} catch (e) {
			console.error('Failed to create event:', e);
			// Don't close modal on error so user can retry
		}
	}


	async function openViewModal(event: any) {
		const props = event.extendedProps || event;
		console.log('openViewModal: event', event);
		console.log('openViewModal: props', props);
		
		// Ensure ID is available - prefer event.id, fallback to props.id, then event.$id
		const workshopId = event.id || props.id || event.$id;
		console.log('Determined workshop ID:', workshopId);
		const lessonOpt = lessonOptions.find((opt) => opt.value === props.lesson);
		const schoolOpt = schoolOptions.find((opt) => opt.value === props.school);
		const teacherOpt = teacherOptions.find((opt) => opt.value === props.teacher);
		console.log('Resolved lessonOpt:', lessonOpt);
		console.log('Resolved schoolOpt:', schoolOpt);
		console.log('Resolved teacherOpt:', teacherOpt);
		let schoolData = null;
		if (props.school) {
			try {
				const databases = new Databases(appwrite);
				schoolData = await databases.getDocument('scholen', 'school', props.school);
			} catch (e) {
				console.error('Failed to fetch school data for view modal:', e);
			}
		}
		// Parse sessions from JSON string if needed
		let parsedSessions = [];
		console.log('openViewModal: props.sessions (raw):', props.sessions);
		console.log('openViewModal: props.sessions type:', typeof props.sessions);
		if (props.sessions) {
			try {
				parsedSessions = typeof props.sessions === 'string' ? JSON.parse(props.sessions) : props.sessions;
				console.log('openViewModal: parsedSessions:', parsedSessions);
			} catch (e) {
				console.error('Error parsing sessions for view:', e);
				parsedSessions = [];
			}
		} else {
			console.log('openViewModal: No sessions found in props');
		}
		
		viewEvent = {
			...props,
			title: event.title || props.title || '',
			id: workshopId,
			lessonName: lessonOpt ? lessonOpt.label : '-',
			lessonId: props.lesson,
			schoolName: schoolOpt ? schoolOpt.label : '-',
			schoolId: props.school,
			teacherName: teacherOpt ? teacherOpt.label : '-',
			teacherId: props.teacher,
			schoolData,
			sessions: parsedSessions
		};
		console.log('viewEvent for modal (full object):', viewEvent);
		console.log('viewEvent.sessions:', viewEvent.sessions);
		
		// Update the URL with the event id and current tab, without reloading
		const eventId = viewEvent.id || viewEvent.$id;
		console.log('Event ID for URL:', eventId);
		
		if (eventId) {
			const currentHash = window.location.hash || `#${currentTab}`;
			console.log('Updating URL to:', `/planning?id=${eventId}${currentHash}`);
			goto(`/planning?id=${eventId}${currentHash}`, { replaceState: true, keepfocus: true, noscroll: true });
		} else {
			console.warn('No event ID found for URL update');
		}
		console.log('openViewModal: About to set showViewModal = true');
		showViewModal = true;
		console.log('openViewModal: showViewModal is now:', showViewModal);
	}
	let isClosingModal = false; // Flag to prevent reactive reopening
	
	function closeViewModal() {
		isClosingModal = true;
		showViewModal = false;
		viewEvent = null;
		// Clear the workshop ID from URL but keep the current tab
		const currentHash = window.location.hash;
		goto(`/planning${currentHash}`, { replaceState: true, keepfocus: true, noscroll: true });
		// Reset the flag after a short delay
		setTimeout(() => {
			isClosingModal = false;
		}, 100);
	}

	function handleEditFromView() {
		const currentViewEvent = viewEvent;
		if (!currentViewEvent) {
			console.warn('handleEditFromView: viewEvent is null or undefined');
			return;
		}
		closeViewModal();
		// Find the event in the current events list by id (viewEvent.id or viewEvent.$id)
		let eventId = currentViewEvent.id || currentViewEvent.$id;
		let event = null;
		// Try to find in filtered events
		if (myEvents) event = myEvents.find((ev) => ev.id === eventId || ev.$id === eventId);
		if (!event && availableEvents)
			event = availableEvents.find((ev) => ev.id === eventId || ev.$id === eventId);
		if (!event) event = currentViewEvent; // fallback
		openEditModal(event);
	}

	// Function to fetch a specific event from the server
	async function fetchEventById(eventId: string) {
		try {
			const event = await databases.getDocument(databaseId, collectionId, eventId);
			// Transform the event to match the expected format
			const transformedEvent = {
				id: event.$id,
				$id: event.$id,
				title: event.description || `Lesson: ${event.lesson}`,
				start: event.start,
				end: event.end,
				status: event.status,
				teacher: event.teacher,
				lesson: event.lesson,
				school: event.school,
				group: event.group,
				materialen: event.materialen,
				description: event.description,
				length: event.length,
				sessions: event.sessions,
				totalDuration: event.totalDuration,
				color: event.status === 'bevestigd' ? 'var(--accent)' : 'var(--warning)'
			};
			return transformedEvent;
		} catch (error) {
			console.error('Failed to fetch event by ID:', error);
			return null;
		}
	}

	// Handle URL parameters for direct links to workshops
	$: {
		const eventIdFromUrl = $page.url.searchParams.get('id');
		const hashFromUrl = $page.url.hash.replace('#', '');
		
		// Set the correct tab if specified in URL
		if (hashFromUrl && (hashFromUrl === 'beschikbaar' || hashFromUrl === 'mijn-planning' || hashFromUrl === 'alle-workshops')) {
			currentTab = hashFromUrl;
		}
		
		// Open workshop modal if ID is in URL and not already open and not intentionally closing
		if (eventIdFromUrl && !showViewModal && !isClosingModal) {
			// First try to find the event in the current events list
			let event = null;
			if ($options && $options.events) {
				event = $options.events.find((ev) => ev.id === eventIdFromUrl || ev.$id === eventIdFromUrl);
			}
			
			if (event) {
				// Use a timeout to ensure the data is loaded before opening modal
				setTimeout(() => {
					if (!isClosingModal) { // Double check the flag
						openViewModal(event);
					}
				}, 100);
			} else {
				// If event not found in current list, fetch it from server
				fetchEventById(eventIdFromUrl).then((fetchedEvent) => {
					if (fetchedEvent && !isClosingModal) {
						openViewModal(fetchedEvent);
					}
				});
			}
		}
	}

	async function handleAcceptWorkshop(event: any) {
		if (!currentUserId || !isVakdocent) return;
		
		const workshopEvent = event.detail.event;
		const documentId = workshopEvent.id || workshopEvent.$id;
		
		console.log('Accepting workshop:', workshopEvent);
		console.log('Document ID:', documentId);
		
		if (!documentId) {
			console.error('No document ID found for workshop:', workshopEvent);
			alert('Kan workshop niet accepteren: geen document ID gevonden.');
			return;
		}
		
		try {
			await databases.updateDocument(databaseId, collectionId, documentId, {
				teacher: currentUserId,
				status: 'bevestigd'
			});
			
			// Update the events in the store
			options.update((current) => ({
				...current,
				events: current.events.map((ev) => {
					const evId = ev.id || ev.$id;
					return evId === documentId ? { ...ev, teacher: currentUserId, status: 'bevestigd', color: 'var(--accent)' } : ev;
				})
			}));
			
			// Close the modal
			closeViewModal();
			
			// Show success message (optional)
			alert($_('planning.workshop_accepted'));
			
		} catch (error) {
			console.error('Failed to accept workshop:', error);
			alert($_('planning.workshop_accept_error'));
		}
	}

	function openIcalModal() {
		showIcalModal = true;
	}

	function closeIcalModal() {
		showIcalModal = false;
	}
</script>

<!-- Top right buttons -->
<div class="top-right-buttons">
	{#if isAdmin}
		<button type="button" class="add-workshop-btn-mobile" on:click={openCreateModal}>
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="12" y1="5" x2="12" y2="19"/>
				<line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
		</button>
	{/if}
	<button 
		class="ical-btn"
		on:click={openIcalModal}
		aria-label={$_('planning.ical_instructions')}
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
			<line x1="16" y1="2" x2="16" y2="6"/>
			<line x1="8" y1="2" x2="8" y2="6"/>
			<line x1="3" y1="10" x2="21" y2="10"/>
		</svg>
	</button>
</div>

<div class="tab-container">
	{#if $teamStore.teams.length > 1}
		<div class="team-selector">
			<label for="team-select">{$_('planning.team')}:</label>
			<select 
				id="team-select"
				value={$teamStore.selectedTeam?.$id || ''}
				on:change={async (e) => {
					const selectedTeamId = e.target.value;
					const selectedTeam = $teamStore.teams.find(team => team.$id === selectedTeamId);
					if (selectedTeam) {
						teamStore.setSelectedTeam(selectedTeam);
						await loadCurrentTabData();
					}
				}}
			>
				<option value="">Selecteer een team</option>
				{#each $teamStore.teams as team}
					<option value={team.$id}>{team.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	<div class="tab-buttons">
		<button
			type="button"
			class="tab-btn"
			class:active-tab={currentTab === 'beschikbaar'}
			on:click={async () => {
				currentTab = 'beschikbaar';
				const currentId = $page.url.searchParams.get('id');
				const url = currentId ? `/planning?id=${currentId}#beschikbaar` : '/planning#beschikbaar';
				goto(url, { replaceState: true, keepfocus: true, noscroll: true });
				await loadCurrentTabData();
			}}>{$_('planning.available')}</button
		>
		<button
			type="button"
			class="tab-btn"
			class:active-tab={currentTab === 'mijn-planning'}
			on:click={async () => {
				currentTab = 'mijn-planning';
				const currentId = $page.url.searchParams.get('id');
				const url = currentId ? `/planning?id=${currentId}#mijn-planning` : '/planning#mijn-planning';
				goto(url, { replaceState: true, keepfocus: true, noscroll: true });
				await loadCurrentTabData();
			}}>{$_('planning.my_planning')}</button
		>
		{#if isAdmin}
			<button
				type="button"
				class="tab-btn"
				class:active-tab={currentTab === 'alle-workshops'}
				on:click={async () => {
					currentTab = 'alle-workshops';
					const currentId = $page.url.searchParams.get('id');
					const url = currentId ? `/planning?id=${currentId}#alle-workshops` : '/planning#alle-workshops';
					goto(url, { replaceState: true, keepfocus: true, noscroll: true });
					await loadCurrentTabData();
				}}>{$_('planning.all_workshops')}</button
			>
		{/if}
	</div>
	{#if isAdmin}
		<button type="button" class="add-workshop-btn" on:click={openCreateModal}
			>+ {$_('planning.workshop')}</button
		>
	{/if}
</div>

{#if isAdmin && currentTab === 'alle-workshops'}
	<div class="calendar-container">
		<Calendar
			bind:this={calendarRef}
			key={calendarKey + '-alle'}
			plugins={[TimeGrid, DayGrid, List]}
			options={$options}
		/>
	</div>
{/if}
{#if currentTab === 'beschikbaar'}
	<!-- Beschikbare events calendar only -->
	<div class="calendar-container">
		{#if availableOptions}
			{console.log('=== RENDERING AVAILABLE CALENDAR ===', availableOptions)}
			{console.log('Available calendar events:', availableOptions.events)}
			{console.log('Available calendar eventClick:', availableOptions.eventClick)}
			{console.log('=== END AVAILABLE CALENDAR RENDER ===', '')}
			<Calendar
				bind:this={calendarRef}
				key={calendarKey + '-beschikbaar'}
				plugins={[TimeGrid, DayGrid, List]}
				options={availableOptions}
			/>
		{/if}
	</div>
{/if}
{#if currentTab === 'mijn-planning'}
	<!-- Mijn planning calendar -->
	<div class="calendar-container">
		{#if myOptions}
			{console.log('=== RENDERING MY CALENDAR ===', myOptions)}
			{console.log('My calendar events:', myOptions.events)}
			{console.log('My calendar eventClick:', myOptions.eventClick)}
			{console.log('=== END MY CALENDAR RENDER ===', '')}
			<Calendar
				bind:this={calendarRef}
				key={calendarKey + '-mijn'}
				plugins={[TimeGrid, DayGrid, List]}
				options={myOptions}
			/>
		{/if}
	</div>
{/if}

{#if showEditModal}
	<div class="modal-backdrop" on:click={closeEditModal}></div>
	<div class="modal" on:click|stopPropagation>
		<WorkshopForm
			{lessonOptions}
			{schoolOptions}
			{teacherOptions}
			{statusOptions}
			{teamOptions}
			isEdit={true}
			initialValues={{
				school: selectedSchool ? String(selectedSchool.value) : '',
				teacher: selectedTeacher ? String(selectedTeacher.value) : '',
				length: lessonLength,
				materialen,
				status,
				description,
				start: editEventStart,
				sessions: eventSessions,
				totalDuration: editEvent?.totalDuration || 0,
				eventType: eventType,
				title: title,
				assignedTeams: editEvent?.assignedTeams ? JSON.parse(editEvent.assignedTeams) : []
			}}
			bind:selectedSchool
			bind:selectedTeacher
			bind:lessonLength
			bind:materialen
			bind:status
			bind:description
			bind:editEventStart
			bind:eventType
			bind:title
			on:submit={submitEditEvent}
			on:cancel={closeEditModal}
		/>
	</div>
{/if}

{#if showCreateModal}
	<div class="modal-backdrop" on:click={closeCreateModal}></div>
	<div class="modal" on:click|stopPropagation>
		<WorkshopForm
			{lessonOptions}
			{schoolOptions}
			{teacherOptions}
			{statusOptions}
			{teamOptions}
			isEdit={false}
			initialValues={{}}
			bind:selectedSchool
			bind:selectedTeacher
			bind:lessonLength
			bind:materialen
			bind:status
			bind:description
			bind:editEventStart
			bind:eventType
			bind:title
			on:submit={submitCreateEvent}
			on:cancel={closeCreateModal}
		/>
	</div>
{/if}

{#if showViewModal}
	<div class="modal-backdrop" on:click={closeViewModal}></div>
	<div class="modal" on:click|stopPropagation>
		<WorkshopView 
			event={viewEvent} 
			currentUser={{ $id: currentUserId }}
			{isVakdocent}
			{isAdmin}
			{lessonOptions}
			on:close={closeViewModal} 
			on:edit={handleEditFromView}
			on:accept={handleAcceptWorkshop}
		/>
	</div>
{/if}

{#if showIcalModal}
	<div class="modal-backdrop" on:click={closeIcalModal}></div>
	<div class="modal ical-modal" on:click|stopPropagation>
		<div class="modal-header">
			<h2>📅 {$_('planning.calendar_sync')}</h2>
			<button class="close-btn" on:click={closeIcalModal}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"/>
					<line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			</button>
		</div>
		
		<div class="ical-content">
			<p>{$_('planning.add_to_calendar_app')}</p>
			
			<div class="ical-url-container">
				<label for="ical-url">{$_('planning.all_workshops_ical')}:</label>
				<div class="url-input-group">
					<input 
						id="ical-url"
						type="text" 
						value="{window.location.origin}/planning.ics"
						readonly
						class="ical-url-input"
					/>
					<button 
						class="copy-btn"
						on:click={() => {
							navigator.clipboard.writeText(`${window.location.origin}/planning.ics`);
							alert($_('planning.url_copied_clipboard'));
						}}
					>
						{$_('planning.copy')}
					</button>
				</div>
			</div>
			
			{#if currentUserId}
				<div class="personal-feeds-section">
					<h3>{$_('planning.personal_calendar_feeds')}</h3>
					<p>{$_('planning.personalized_feeds_description')}</p>
					
					<div class="ical-url-container">
						<label for="beschikbaar-url">{$_('planning.available_workshops')}:</label>
						<div class="url-input-group">
							<input 
								id="beschikbaar-url"
								type="text" 
								value="{window.location.origin}/beschikbaar/{currentUserId}.ics"
								readonly
								class="ical-url-input"
							/>
							<button 
								class="copy-btn"
								on:click={() => {
									navigator.clipboard.writeText(`${window.location.origin}/beschikbaar/${currentUserId}.ics`);
									alert($_('planning.available_url_copied'));
								}}
							>
								{$_('planning.copy')}
							</button>
						</div>
					</div>
					
					<div class="ical-url-container">
						<label for="mijn-planning-url">{$_('planning.my_planning')}:</label>
						<div class="url-input-group">
							<input 
								id="mijn-planning-url"
								type="text" 
								value="{window.location.origin}/mijn-planning/{currentUserId}.ics"
								readonly
								class="ical-url-input"
							/>
							<button 
								class="copy-btn"
								on:click={() => {
									navigator.clipboard.writeText(`${window.location.origin}/mijn-planning/${currentUserId}.ics`);
									alert($_('planning.my_planning_url_copied'));
								}}
							>
								{$_('planning.copy')}
							</button>
						</div>
					</div>
				</div>
			{/if}
			
			<div class="instructions">
				<h3>{$_('planning.instructions_per_calendar_app')}</h3>
				
				<div class="instruction-item">
					<h4>📱 {$_('planning.iphone_ipad_calendar')}</h4>
					<ol>
						<li>{$_('planning.open_calendar_app')}</li>
						<li>{$_('planning.go_to_settings_calendars_add_account')}</li>
						<li>{$_('planning.choose_other_add_calendar')}</li>
						<li>{$_('planning.paste_url_above')}</li>
					</ol>
				</div>
				
				<div class="instruction-item">
					<h4>📧 Outlook</h4>
					<ol>
						<li>{$_('planning.open_outlook')}</li>
						<li>{$_('planning.go_to_calendar_add_calendar')}</li>
						<li>{$_('planning.choose_from_internet')}</li>
						<li>{$_('planning.paste_url_above')}</li>
					</ol>
				</div>
				
				<div class="instruction-item">
					<h4>🌐 Google Calendar</h4>
					<ol>
						<li>{$_('planning.open_google_calendar')}</li>
						<li>{$_('planning.click_plus_other_calendars')}</li>
						<li>{$_('planning.choose_from_url')}</li>
						<li>{$_('planning.paste_url_above')}</li>
					</ol>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.3);
		z-index: 10;
	}
	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: var(--background);
		color: var(--foreground);
		padding: 2.5rem 2rem;
		border-radius: 1rem;
		z-index: 11;
		min-width: 320px;
		max-width: 95vw;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Wider modal on tablet and desktop */
	@media (min-width: 769px) {
		.modal {
			width: 80vw;
			max-width: 1200px;
		}
	}
	@media (max-width: 768px) {
		.modal {
			padding: 1rem;
			min-width: 0;
			width: 95vw;
			max-height: 90vh;
			top: 5vh;
			transform: translate(-50%, 0);
		}
	}
	
	@media (max-width: 480px) {
		.modal {
			padding: 0.75rem;
			width: 98vw;
			max-height: 95vh;
			top: 2.5vh;
		}
	}
	.modal form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 2rem;
	}
	@media (max-width: 600px) {
		.modal form {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}
	}
	.modal h2 {
		grid-column: 1 / -1;
		margin-bottom: 0.5rem;
		font-size: 1.3rem;
		font-weight: bold;
		letter-spacing: 0.02em;
	}
	.modal label {
		display: flex;
		flex-direction: column;
		font-weight: bold;
		font-size: 1rem;
		gap: 0.25rem;
	}
	.modal input,
	.modal select,
	.modal textarea {
		font-size: 1rem;
		padding: 0.5em 0.75em;
		border-radius: var(--radius);
		border: 1px solid var(--color-ash-grey);
		background: #fff;
		color: var(--color-blackened-steel);
		width: 100%;
		box-sizing: border-box;
		font-family: inherit;
	}
	.modal textarea {
		resize: vertical;
		min-height: 2.5em;
	}
	.modal-actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 1rem;
	}
	@media (max-width: 600px) {
		.modal-actions {
			flex-direction: column;
			gap: 0.5rem;
			margin-top: 0.5rem;
		}
	}
	.workshop-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.5rem;
		align-items: center;
	}
	.break-row {
		margin-bottom: 0.5rem;
		margin-left: 2rem;
	}
	.add-workshop-btn {
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: 0.5rem 1rem;
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}
	.add-workshop-btn:hover {
		background: var(--warning);
		color: var(--color-blackened-steel);
	}
	.tab-container {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		gap: 1rem;
		flex-wrap: wrap;
	}
	
	.team-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.team-selector label {
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
	}
	
	.team-selector select {
		background: var(--background);
		color: var(--foreground);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.5rem;
		font-size: 0.9rem;
		min-width: 200px;
	}
	
	.team-selector select:focus {
		outline: none;
		border-color: var(--accent);
	}
	
	.tab-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		flex: 1;
	}
	
	.tab-btn {
		background: var(--ash-grey);
		color: var(--accent);
		border: none;
		border-radius: var(--radius);
		padding: 0 0.5rem;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.2s;
		white-space: nowrap;
		flex: 1;
		min-width: fit-content;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.tab-btn.active-tab {
		background: var(--accent);
		color: #fff;
	}
	
	@media (max-width: 768px) {
		.tab-container {
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			background: var(--background);
			border-top: 1px solid var(--border);
			padding: 1rem 0.75rem 1rem 0.75rem;
			z-index: 10;
			box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
			flex-direction: column;
			gap: 0.75rem;
		}
		
		.tab-buttons {
			display: flex;
			gap: 0.5rem;
			width: 100%;
		}
		
		.tab-btn {
			font-size: 0.75rem;
			padding: 0 0.4rem;
			height: 1.75rem;
		}
		
		.add-workshop-btn {
			font-size: 0.8rem;
			padding: 0.4rem 0.8rem;
			height: 1.75rem;
			white-space: nowrap;
			width: 100%;
			order: -1;
		}
		
		/* Add bottom padding to main content to prevent overlap */
		:global(body) {
			padding-bottom: 6.5rem;
		}
	}
	.event-list {
		margin-top: 1rem;
	}
	.event-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}
	.claim-btn {
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: 0.25rem 0.75rem;
		font-size: 0.95rem;
		cursor: pointer;
		transition: background 0.2s;
	}
	.claim-btn:hover {
		background: var(--warning);
		color: var(--color-blackened-steel);
	}
	
	.top-right-buttons {
		position: absolute;
		top: 0.5rem;
		right: 1rem;
		display: flex;
		gap: 0.5rem;
		z-index: 5;
	}
	
	.ical-btn {
		background: none;
		color: var(--foreground);
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.ical-btn:hover {
		color: var(--accent);
		transform: scale(1.1);
	}
	
	.add-workshop-btn-mobile {
		background: var(--accent);
		color: white;
		border: none;
		padding: 0.5rem;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
	}
	
	.add-workshop-btn-mobile:hover {
		background: var(--warning);
		transform: scale(1.1);
	}
	
	/* Desktop: show original button, hide mobile button */
	@media (min-width: 769px) {
		.add-workshop-btn-mobile {
			display: none;
		}
	}
	
	/* Mobile: hide original button, show mobile button */
	@media (max-width: 768px) {
		.add-workshop-btn {
			display: none;
		}
	}
	
	.ical-modal {
		max-width: 600px;
		width: 90vw;
	}
	
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}
	
	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
	}
	
	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		color: var(--foreground);
		transition: background 0.2s;
	}
	
	.close-btn:hover {
		background: var(--muted);
	}
	
	.ical-content p {
		margin-bottom: 1.5rem;
		color: var(--muted-foreground);
	}
	
	.ical-url-container {
		margin-bottom: 2rem;
	}
	
	.ical-url-container label {
		display: block;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}
	
	.personal-feeds-section {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--divider, #eaeaea);
	}
	
	.personal-feeds-section h3 {
		margin-bottom: 1rem;
		color: var(--accent, #3ba39b);
		font-size: 1.2rem;
	}
	
	.personal-feeds-section p {
		margin-bottom: 1.5rem;
		color: var(--muted-foreground);
		font-size: 0.95rem;
	}
	
	.url-input-group {
		display: flex;
		gap: 0.5rem;
	}
	
	.ical-url-input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--muted);
		color: var(--foreground);
		font-family: monospace;
		font-size: 0.9rem;
	}
	
	.copy-btn {
		background: var(--accent);
		color: white;
		border: none;
		border-radius: var(--radius);
		padding: 0.5rem 1rem;
		cursor: pointer;
		transition: background 0.2s;
		white-space: nowrap;
	}
	
	.copy-btn:hover {
		background: var(--warning);
		color: var(--color-blackened-steel);
	}
	
	.instructions h3 {
		margin-bottom: 1rem;
		font-size: 1.1rem;
	}
	
	.instruction-item {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--muted);
		border-radius: var(--radius);
	}
	
	.instruction-item h4 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		color: var(--accent);
	}
	
	.instruction-item ol {
		margin: 0;
		padding-left: 1.5rem;
	}
	
	.instruction-item li {
		margin-bottom: 0.25rem;
		line-height: 1.4;
	}
	
	/* Mobile calendar optimizations */
	@media (max-width: 768px) {
		:global(.ec-header-toolbar) {
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		
		:global(.ec-button-group) {
			flex-wrap: wrap;
		}
		
		:global(.ec-button) {
			font-size: 0.8rem !important;
			padding: 0.25rem 0.5rem !important;
		}
		
		:global(.ec-toolbar-title) {
			font-size: 1.1rem !important;
			margin: 0.5rem 0 !important;
		}
		
		:global(.ec-event) {
			font-size: 0.75rem !important;
			padding: 0.125rem 0.25rem !important;
		}
		
		:global(.ec-day-grid-event) {
			margin-bottom: 1px !important;
		}
		
		:global(.ec-time-grid-event) {
			border-radius: 2px !important;
		}
	}
	
	@media (max-width: 480px) {
		:global(.ec-header-toolbar) {
			flex-direction: column;
			align-items: stretch;
		}
		
		:global(.ec-toolbar-chunk) {
			justify-content: center;
			margin: 0.25rem 0;
		}
		
		:global(.ec-button) {
			font-size: 0.7rem !important;
			padding: 0.2rem 0.4rem !important;
		}
		
		:global(.ec-toolbar-title) {
			font-size: 1rem !important;
			text-align: center;
		}
		
		:global(.ec-event) {
			font-size: 0.7rem !important;
			line-height: 1.2 !important;
		}
		
		:global(.ec-day-head) {
			font-size: 0.8rem !important;
		}
		
		:global(.ec-day-number) {
			font-size: 0.9rem !important;
		}
	}
	
	.calendar-container {
		position: relative;
	}
	
	/* Style the "Vandaag" (Today) button to use foreground color */
	:global(.ec-button) {
		color: var(--foreground) !important;
	}

	/* Calendar event content styling */
	:global(.event-content) {
		text-align: left !important;
		width: 100% !important;
		display: flex !important;
		flex-direction: column !important;
		align-items: flex-start !important;
	}

	:global(.event-title) {
		text-align: left !important;
		width: 100% !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		white-space: nowrap !important;
	}

	/* For narrow events, stack vertically */
	@media (max-width: 768px) {
		:global(.ec-event) {
			min-height: 2.5rem !important;
		}
		
		:global(.event-title) {
			white-space: normal !important;
			line-height: 1.2 !important;
		}
	}
</style>
