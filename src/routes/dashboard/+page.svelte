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
			status: 'pending',
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
				status: doc.status || 'pending',
				color: doc.status === 'confirmed' ? '#3ba39b' : '#eab308',
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
</script>

<div class="container mx-auto p-6 max-w-7xl">

	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
			<p class="text-muted-foreground">Dashboard wordt geladen...</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Upcoming Workshops Section -->
			<div class="lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<Calendar size={24} class="text-primary" />
								<Card.Title>Aankomende Workshops</Card.Title>
							</div>
							<span class="text-sm bg-muted px-3 py-1 rounded-full text-muted-foreground">
								{upcomingWorkshops.length} workshops
							</span>
						</div>
					</Card.Header>
					<Card.Content>
						{#if upcomingWorkshops.length > 0}
							<div class="space-y-4">
								{#each upcomingWorkshops as workshop (workshop.id)}
									<div class="cursor-pointer hover:bg-muted/50 transition-colors rounded-lg" on:click={() => handleWorkshopClick(workshop)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleWorkshopClick(workshop)}>
										<Card.Root class="border-l-4 border-l-primary/20">
											<Card.Header class="pb-3">
											<div class="flex items-start justify-between">
												<Card.Title class="text-lg">{workshop.schoolName}</Card.Title>
												<div
													class="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full {workshop.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}"
												>
													<svelte:component this={getStatusIcon(workshop.status)} size={14} />
													<span>{workshop.status === 'confirmed' ? 'Bevestigd' : 'In behandeling'}</span>
												</div>
											</div>
										</Card.Header>
										<Card.Content class="pt-0">
											<div class="space-y-2 text-sm text-muted-foreground">
												<div class="flex items-center gap-2">
													<Users size={16} />
													<span>{workshop.group}</span>
												</div>
												<div class="flex items-center gap-2">
													<MapPin size={16} />
													<span>{workshop.title}</span>
												</div>
												<div class="flex items-center gap-2">
													<Clock size={16} />
													<span>{formatDate(workshop.date)} om {workshop.time}</span>
												</div>
											</div>
										</Card.Content>
										<Card.Footer class="pt-3 border-t">
											<div class="flex items-center justify-between w-full">
												<span class="text-sm font-medium">{workshop.teacherName}</span>
												<span class="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
													{workshop.duration}
												</span>
											</div>
										</Card.Footer>
									</Card.Root>
								</div>
								{/each}
							</div>
						{:else}
							<div class="flex flex-col items-center justify-center py-12 text-center">
								<Calendar size={48} class="text-muted-foreground mb-4" />
								<h3 class="text-lg font-semibold mb-2">Geen workshops gepland</h3>
								<p class="text-muted-foreground">
									Je hebt momenteel geen workshops gepland voor de komende weken.
								</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Announcements Section -->
			<div>
				<Card.Root>
					<Card.Header>
						<div class="flex items-center gap-2">
							<Bell size={24} class="text-primary" />
							<Card.Title>Mededelingen</Card.Title>
						</div>
					</Card.Header>
					<Card.Content>
						{#if announcements.length > 0}
							<div class="space-y-4">
								{#each announcements as announcement (announcement.id)}
									<Card.Root
										class="p-4 {announcement.priority === 'high' ? 'border-l-4 border-l-destructive' : ''}"
									>
										<div class="flex items-start gap-3">
											<div
												class="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 {announcement.type === 'success' ? 'bg-green-100 text-green-600' : announcement.type === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}"
											>
												<svelte:component this={getAnnouncementIcon(announcement.type)} size={20} />
											</div>
											<div class="flex-1 min-w-0">
												<h4 class="text-sm font-semibold mb-1">{announcement.title}</h4>
												<p class="text-sm text-muted-foreground mb-2 leading-relaxed">
													{announcement.message}
												</p>
												<span class="text-xs text-muted-foreground">
													{formatDate(announcement.date)}
												</span>
											</div>
										</div>
									</Card.Root>
								{/each}
							</div>
						{:else}
							<div class="flex flex-col items-center justify-center py-12 text-center">
								<Bell size={48} class="text-muted-foreground mb-4" />
								<h3 class="text-lg font-semibold mb-2">Geen mededelingen</h3>
								<p class="text-muted-foreground">Er zijn momenteel geen belangrijke mededelingen.</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</div>
