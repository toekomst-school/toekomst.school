<script lang="ts">
	import { onMount } from 'svelte';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';
	import Users from '@lucide/svelte/icons/users';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Bell from '@lucide/svelte/icons/bell';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Info from '@lucide/svelte/icons/info';
	import { account, databases } from '$lib/appwrite';
	import { Query } from 'appwrite';
	import * as Card from '$lib/components/ui/card';
	import { goto } from '$app/navigation';

	const databaseId = 'lessen';
	const collectionId = 'planning';
	const SCHOOL_DB_ID = 'scholen';
	const SCHOOL_COLLECTION_ID = 'school';

	let upcomingWorkshops: any[] = [];
	let currentUser: any = null;
	let schoolOptions: any[] = [];
	let announcements: Array<{
		id: number;
		type: string;
		title: string;
		message: string;
		date: string;
		priority: string;
	}> = [];
	let loading = true;
	let expandedAnnouncements = new Set<number>();

	// Mock data for demonstration
	const mockWorkshops = [
		{
			id: 1,
			title: 'Robotica Workshop',
			schoolName: 'Basisschool De Horizon',
			date: '2025-07-15',
			time: '10:00 - 11:30',
			duration: '90 min',
			group: 'Groep 7',
			status: 'confirmed',
			color: '#3ba39b',
			teacherName: 'Sarah Johnson',
			location: 'Lokaal A2'
		},
		{
			id: 2,
			title: '3D Printen Workshop',
			schoolName: 'Het Kompas',
			date: '2025-07-16',
			time: '14:00 - 15:30',
			duration: '90 min',
			group: 'Groep 8',
			status: 'geplanned',
			color: '#eab308',
			teacherName: 'Mark van der Berg',
			location: 'Technieklokaal'
		},
		{
			id: 3,
			title: 'AI & Machine Learning',
			schoolName: 'Montessori College',
			date: '2025-07-18',
			time: '09:00 - 10:30',
			duration: '90 min',
			group: 'Groep 6',
			status: 'confirmed',
			color: '#3ba39b',
			teacherName: 'Lisa Chen',
			location: 'Computerlokaal'
		}
	];

	const mockAnnouncements = [
		{
			id: 1,
			type: 'info',
			title: 'Nieuwe workshop materialen beschikbaar',
			message:
				'Voor de robotica workshops zijn nieuwe sensoren aangekomen. Check de materiaallijst.',
			date: '2025-07-08',
			priority: 'medium'
		},
		{
			id: 2,
			type: 'warning',
			title: 'Wijziging in planning',
			message: 'De workshop op 12 juli is verplaatst naar 19 juli vanwege schoolvakantie.',
			date: '2025-07-05',
			priority: 'high'
		},
		{
			id: 3,
			type: 'success',
			title: 'Nieuwe school toegevoegd',
			message: 'Basisschool De Toekomst is toegevoegd aan onze lijst van partnerscholen.',
			date: '2025-07-03',
			priority: 'low'
		}
	];

	onMount(async () => {
		try {
			currentUser = await account.get();
			
			// Fetch schools first
			const schoolsRes = await databases.listDocuments(SCHOOL_DB_ID, SCHOOL_COLLECTION_ID, [
				Query.equal('KLANT', true),
				Query.limit(1000)
			]);
			schoolOptions = schoolsRes.documents.map((school) => ({
				value: school.$id,
				label: school.NAAM || school.$id
			}));
			
			const now = new Date().toISOString();
			const response = await databases.listDocuments(
				databaseId,
				collectionId,
				[
					Query.equal('teacher', currentUser.$id),
					Query.greaterThan('start', now),
					Query.orderAsc('start'),
					Query.limit(10)
				]
			);
			
			// Transform Appwrite data to match UI structure
			upcomingWorkshops = response.documents.map(doc => ({
				id: doc.$id,
				title: getWorkshopTitle(doc),
				schoolName: getSchoolName(doc.school),
				date: new Date(doc.start).toISOString().split('T')[0],
				time: formatTimeRange(doc.start, doc.end),
				duration: `${doc.length || 90} min`,
				group: doc.group || 'Onbekend',
				status: doc.status || 'geplanned',
				color: doc.status === 'bevestigd' ? '#3ba39b' : '#eab308',
				teacherName: currentUser.name || 'Onbekend',
				location: 'School lokaal',
				description: doc.description || '',
				lesson: doc.lesson,
				school: doc.school,
				materialen: doc.materialen || ''
			}));
			
			// Use mock announcements for now
			announcements = mockAnnouncements;
		} catch (error) {
			console.error('Error loading dashboard data:', error);
			upcomingWorkshops = [];
			announcements = mockAnnouncements;
		} finally {
			loading = false;
		}
	});

	function getWorkshopTitle(workshop: any): string {
		if (workshop.description) return workshop.description;
		if (workshop.lesson) return `Les: ${workshop.lesson}`;
		return 'Workshop';
	}

	function getSchoolName(schoolId: string): string {
		const school = schoolOptions.find(opt => opt.value === schoolId);
		return school ? school.label : 'Onbekende school';
	}

	function formatTimeRange(start: string, end: string): string {
		// Simple approach - just extract time from the date string
		const startTime = start.includes('T') ? start.split('T')[1].substring(0, 5) : start;
		const endTime = end.includes('T') ? end.split('T')[1].substring(0, 5) : end;
		return `${startTime} - ${endTime}`;
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'confirmed':
				return CheckCircle;
			case 'pending':
				return AlertCircle;
			default:
				return Info;
		}
	}

	function getAnnouncementIcon(type: string) {
		switch (type) {
			case 'success':
				return CheckCircle;
			case 'warning':
				return AlertCircle;
			default:
				return Info;
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('nl-NL', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}

	function handleWorkshopClick(workshop: any) {
		goto(`/planning?id=${workshop.id}`);
	}

	function toggleAnnouncement(announcementId: number) {
		if (expandedAnnouncements.has(announcementId)) {
			expandedAnnouncements.delete(announcementId);
		} else {
			expandedAnnouncements.add(announcementId);
		}
		expandedAnnouncements = expandedAnnouncements; // Trigger reactivity
	}
</script>

<div class="container mx-auto p-6 max-w-7xl">

	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
			<p class="text-muted-foreground">Dashboard wordt geladen...</p>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Announcements Section - Now first -->
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-center gap-2">
						<Bell size={20} class="text-primary" />
						<Card.Title class="text-lg">Mededelingen</Card.Title>
					</div>
				</Card.Header>
				<Card.Content>
					{#if announcements.length > 0}
						<div class="space-y-2">
							{#each announcements as announcement (announcement.id)}
								<div 
									class="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50 {announcement.priority === 'high' ? 'border-l-4 border-l-destructive' : ''}"
									on:click={() => toggleAnnouncement(announcement.id)}
									role="button"
									tabindex="0"
									on:keydown={(e) => e.key === 'Enter' && toggleAnnouncement(announcement.id)}
								>
									<div class="flex items-center gap-3">
										<div class="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 {announcement.type === 'success' ? 'bg-green-100 text-green-600' : announcement.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}">
											<svelte:component this={getAnnouncementIcon(announcement.type)} size={16} />
										</div>
										<div class="flex-1 min-w-0">
											<h4 class="text-sm font-semibold">{announcement.title}</h4>
											<span class="text-xs text-muted-foreground">{formatDate(announcement.date)}</span>
										</div>
										<div class="transition-transform {expandedAnnouncements.has(announcement.id) ? 'rotate-180' : ''}">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path d="m6 9 6 6 6-6"/>
											</svg>
										</div>
									</div>
									{#if expandedAnnouncements.has(announcement.id)}
										<div class="mt-3 pl-11 transition-all duration-200">
											<p class="text-sm text-muted-foreground leading-relaxed">{announcement.message}</p>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<Bell size={32} class="text-muted-foreground mb-3" />
							<h3 class="font-semibold mb-1">Geen mededelingen</h3>
							<p class="text-sm text-muted-foreground">Er zijn momenteel geen belangrijke mededelingen.</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Upcoming Workshops Section - Now second -->
			<Card.Root>
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Calendar size={20} class="text-primary" />
							<Card.Title class="text-lg">Aankomende Workshops</Card.Title>
						</div>
						<span class="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
							{upcomingWorkshops.length} workshops
						</span>
					</div>
				</Card.Header>
				<Card.Content>
					{#if upcomingWorkshops.length > 0}
						<div class="space-y-3">
							{#each upcomingWorkshops as workshop (workshop.id)}
								<div class="cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-3 border border-l-4 border-l-primary/20" on:click={() => handleWorkshopClick(workshop)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleWorkshopClick(workshop)}>
									<div class="flex items-start justify-between mb-2">
										<h4 class="font-semibold text-sm">{workshop.schoolName}</h4>
										<div class="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full {workshop.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
											<svelte:component this={getStatusIcon(workshop.status)} size={12} />
											<span>{workshop.status === 'confirmed' ? 'Bevestigd' : 'In behandeling'}</span>
										</div>
									</div>
									<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
										<div class="flex items-center gap-1">
											<Users size={14} />
											<span>{workshop.group}</span>
										</div>
										<div class="flex items-center gap-1">
											<MapPin size={14} />
											<span>{workshop.title}</span>
										</div>
										<div class="flex items-center gap-1">
											<Clock size={14} />
											<span>{workshop.time}</span>
										</div>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-xs font-medium">{formatDate(workshop.date)}</span>
										<span class="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
											{workshop.duration}
										</span>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-8 text-center">
							<Calendar size={32} class="text-muted-foreground mb-3" />
							<h3 class="font-semibold mb-1">Geen workshops gepland</h3>
							<p class="text-sm text-muted-foreground">
								Je hebt momenteel geen workshops gepland voor de komende weken.
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
