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
	import Filter from '@lucide/svelte/icons/filter';
	import { account, databases } from '$lib/appwrite';
	import { Query } from 'appwrite';
	import * as Card from '$lib/components/ui/card';
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import { 
		announcements, 
		filteredAnnouncements, 
		announcementActions, 
		isLoading as announcementsLoading 
	} from '$lib/stores/announcements';

	const databaseId = 'lessen';
	const collectionId = 'planning';
	const SCHOOL_DB_ID = 'scholen';
	const SCHOOL_COLLECTION_ID = 'school';

	let upcomingWorkshops: any[] = [];
	let currentUser: any = null;
	let schoolOptions: any[] = [];
	let loading = true;
	let expandedAnnouncements = new Set<string>();
	let filterPriority = 'all';
	let sortBy = 'date';
	let workshopFilter = 'all'; // 'all', 'today', 'thisweek', 'new', 'confirmed'

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
				group: doc.group || 'Unknown',
				status: doc.status || 'geplanned',
				color: doc.status === 'bevestigd' ? '#3ba39b' : '#eab308',
				teacherName: currentUser.name || 'Unknown',
				location: 'School classroom',
				description: doc.description || '',
				lesson: doc.lesson,
				school: doc.school,
				materialen: doc.materialen || ''
			}));
			
			// Load real announcements
			await announcementActions.fetchAnnouncements({}, true);
		} catch (error) {
			console.error('Error loading dashboard data:', error);
			upcomingWorkshops = [];
		} finally {
			loading = false;
		}
	});

	function getWorkshopTitle(workshop: any): string {
		if (workshop.description) return workshop.description;
		if (workshop.lesson) return `Lesson: ${workshop.lesson}`;
		return 'Workshop';
	}

	function getSchoolName(schoolId: string): string {
		const school = schoolOptions.find(opt => opt.value === schoolId);
		return school ? school.label : 'Unknown school';
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

	function toggleAnnouncement(announcementId: string) {
		if (expandedAnnouncements.has(announcementId)) {
			expandedAnnouncements.delete(announcementId);
		} else {
			expandedAnnouncements.add(announcementId);
		}
		expandedAnnouncements = expandedAnnouncements; // Trigger reactivity
	}

	function getAnnouncementType(priority: string) {
		switch (priority) {
			case 'urgent':
			case 'high':
				return 'warning';
			case 'low':
				return 'success';
			default:
				return 'info';
		}
	}

	async function markAnnouncementAsRead(announcementId: string) {
		try {
			await announcementActions.markAsRead(announcementId);
		} catch (error) {
			console.error('Failed to mark announcement as read:', error);
		}
	}

	function handleTileClick(filter: string) {
		// If the same tile is clicked again, deselect it (go back to 'all')
		if (workshopFilter === filter) {
			workshopFilter = 'all';
		} else {
			workshopFilter = filter;
		}
		console.log('Tile clicked:', filter, 'Current filter:', workshopFilter);
	}

	// Debug reactive statement
	$: console.log('Workshop filter changed to:', workshopFilter);

	// Filter workshops based on selected filter
	$: filteredWorkshops = (() => {
		let filtered = upcomingWorkshops;
		const today = new Date().toISOString().split('T')[0];
		
		switch (workshopFilter) {
			case 'today':
				filtered = upcomingWorkshops.filter(w => w.date === today);
				break;
			case 'thisweek':
				// For simplicity, showing all upcoming workshops as "this week"
				filtered = upcomingWorkshops;
				break;
			case 'new':
				// Filter for high priority announcements - this tile shows announcement count
				// So we'll show all workshops but highlight the filter is active
				filtered = upcomingWorkshops;
				break;
			case 'confirmed':
				filtered = upcomingWorkshops.filter(w => w.status === 'confirmed');
				break;
			default:
				filtered = upcomingWorkshops;
		}
		
		// Apply existing sort
		return filtered.sort((a, b) => {
			if (sortBy === 'school') return a.schoolName.localeCompare(b.schoolName);
			if (sortBy === 'status') return a.status.localeCompare(b.status);
			return new Date(a.date).getTime() - new Date(b.date).getTime();
		});
	})();
</script>

<div class="container mx-auto p-4 md:p-6 max-w-7xl">

	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
			<p class="text-muted-foreground">{$_('dashboard.loading')}</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Priority Announcements Section -->
			<div class="lg:col-span-1">
				<Card.Root class="h-fit">
					<Card.Header class="pb-3">
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<Bell size={18} class="text-primary" />
								<Card.Title class="text-base font-semibold">{$_('dashboard.announcements')}</Card.Title>
							</div>
							{#if $announcements.length > 0}
								<span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
									{$announcements.length}
								</span>
							{/if}
						</div>
						{#if $announcements.length > 0}
						<div class="flex items-center gap-2">
							<Filter size={14} class="text-muted-foreground" />
							<select bind:value={filterPriority} class="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white">
								<option value="all">Alle prioriteiten</option>
								<option value="high">Hoog</option>
								<option value="medium">Gemiddeld</option>
								<option value="low">Laag</option>
							</select>
						</div>
						{/if}
					</Card.Header>
					<Card.Content class="space-y-3">
						{#if $announcements.length > 0}
							{#each $announcements.filter(a => filterPriority === 'all' || a.priority === filterPriority).slice(0, 3) as announcement (announcement.$id)}
								<div 
									class="group cursor-pointer rounded-xl border-2 transition-all duration-200 hover:shadow-md
									{announcement.priority === 'high' ? 'border-red-200 bg-red-50 hover:border-red-300 dark:border-teal-200 dark:bg-transparent dark:hover:border-teal-400' : 
									 announcement.priority === 'medium' ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-300 dark:border-teal-200 dark:bg-transparent dark:hover:border-teal-400' : 
									 'border-blue-200 bg-blue-50 hover:border-blue-300 dark:border-teal-200 dark:bg-transparent dark:hover:border-teal-400'}"
									on:click={() => { toggleAnnouncement(announcement.$id); markAnnouncementAsRead(announcement.$id); }}
									role="button"
									tabindex="0"
									on:keydown={(e) => { if (e.key === 'Enter') { toggleAnnouncement(announcement.$id); markAnnouncementAsRead(announcement.$id); } }}
								>
									<div class="p-4">
										<div class="flex items-start gap-3 mb-2">
											<div class="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0
											{announcement.priority === 'urgent' || announcement.priority === 'high' ? 'bg-red-100 text-red-600' :
											 announcement.priority === 'normal' ? 'bg-blue-100 text-blue-600' :
											 'bg-green-100 text-green-600'}">
												<svelte:component this={getAnnouncementIcon(getAnnouncementType(announcement.priority))} size={16} />
											</div>
											<div class="flex-1 min-w-0">
												<h4 class="font-semibold text-sm leading-tight mb-1">{announcement.title}</h4>
												<p class="text-xs text-muted-foreground">{formatDate(announcement.$createdAt)}</p>
											</div>
											<div class="transition-transform duration-200 {expandedAnnouncements.has(announcement.$id) ? 'rotate-180' : ''}">
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted-foreground">
													<path d="m6 9 6 6 6-6"/>
												</svg>
											</div>
										</div>
										{#if expandedAnnouncements.has(announcement.$id)}
											<div class="pt-2 border-t border-white/50">
												<p class="text-sm text-gray-700 leading-relaxed">{announcement.content}</p>
											</div>
										{/if}
									</div>
								</div>
							{/each}
							{#if $announcements.filter(a => filterPriority === 'all' || a.priority === filterPriority).length > 3}
								<button class="w-full text-sm text-primary hover:text-primary/80 font-medium py-2 transition-colors" on:click={() => goto('/admin/mededelingen')}>
									Bekijk alle {$announcements.filter(a => filterPriority === 'all' || a.priority === filterPriority).length} mededelingen →
								</button>
							{/if}
						{:else}
							<div class="flex flex-col items-center justify-center py-8 text-center">
								<div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
									<Bell size={20} class="text-muted-foreground" />
								</div>
								<h3 class="font-medium mb-1 text-sm">{$_('dashboard.no_announcements')}</h3>
								<p class="text-xs text-muted-foreground">{$_('dashboard.no_announcements_desc')}</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Main Workshops Section -->
			<div class="lg:col-span-2 space-y-4">
				<!-- Today's Workshops -->
				{#if filteredWorkshops.filter(w => w.date === new Date().toISOString().split('T')[0]).length > 0 && workshopFilter !== 'confirmed'}
				<Card.Root class="border-l-4 border-l-primary">
					<Card.Header class="pb-3">
						<div class="flex items-center gap-2">
							<div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
							<Card.Title class="text-lg font-semibold text-primary">Vandaag</Card.Title>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each filteredWorkshops.filter(w => w.date === new Date().toISOString().split('T')[0]) as workshop (workshop.id)}
								<div class="group cursor-pointer rounded-xl border-2 border-gray-100 bg-white hover:border-primary/30 hover:shadow-lg dark:border-teal-200 dark:bg-transparent dark:hover:border-teal-400 p-4 transition-all duration-200" 
									on:click={() => handleWorkshopClick(workshop)} 
									role="button" 
									tabindex="0" 
									on:keydown={(e) => e.key === 'Enter' && handleWorkshopClick(workshop)}>
									<div class="flex items-start justify-between mb-3">
										<div class="flex-1">
											<h3 class="font-bold text-base mb-1 group-hover:text-primary transition-colors">{workshop.title}</h3>
											<p class="text-sm text-muted-foreground font-medium">{workshop.schoolName}</p>
										</div>
										<div class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
										{workshop.status === 'confirmed' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}">
											<svelte:component this={getStatusIcon(workshop.status)} size={12} />
											<span>{workshop.status === 'confirmed' ? $_('dashboard.confirmed') : $_('dashboard.pending')}</span>
										</div>
									</div>
									<div class="grid grid-cols-3 gap-4 text-sm">
										<div class="flex items-center gap-2 text-gray-600">
											<Clock size={16} class="text-primary" />
											<span class="font-medium">{workshop.time}</span>
										</div>
										<div class="flex items-center gap-2 text-gray-600">
											<Users size={16} class="text-primary" />
											<span class="font-medium">{workshop.group}</span>
										</div>
										<div class="flex items-center gap-2 text-gray-600">
											<MapPin size={16} class="text-primary" />
											<span class="font-medium">{workshop.location}</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
				{/if}

				<!-- Upcoming Workshops -->
				<Card.Root>
					<Card.Header class="pb-3">
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								<Calendar size={20} class="text-primary" />
								<Card.Title class="text-lg font-semibold">
									{#if workshopFilter === 'all'}
										{$_('dashboard.upcoming_workshops')}
									{:else if workshopFilter === 'today'}
										Workshops vandaag
									{:else if workshopFilter === 'thisweek'}
										Workshops deze week
									{:else if workshopFilter === 'confirmed'}
										Bevestigde workshops
									{:else}
										Nieuwe workshops
									{/if}
								</Card.Title>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
									{filteredWorkshops.length} {$_('dashboard.workshops')}
								</span>
							</div>
						</div>
						{#if filteredWorkshops.length > 0}
						<div class="flex items-center gap-2">
							<Filter size={14} class="text-muted-foreground" />
							<select bind:value={sortBy} class="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white">
								<option value="date">Sorteer op datum</option>
								<option value="school">Sorteer op school</option>
								<option value="status">Sorteer op status</option>
							</select>
						</div>
						{/if}
					</Card.Header>
					<Card.Content>
						{#if filteredWorkshops.length > 0}
							<div class="space-y-2">
								{#each filteredWorkshops.filter(w => workshopFilter === 'today' || w.date !== new Date().toISOString().split('T')[0]).slice(0, 4) as workshop (workshop.id)}
									<div class="group cursor-pointer rounded-lg border border-gray-200 bg-gray-50/50 hover:border-primary/40 hover:bg-white hover:shadow-sm dark:border-teal-200 dark:bg-transparent dark:hover:border-teal-400 p-3 transition-all duration-200" 
										on:click={() => handleWorkshopClick(workshop)} 
										role="button" 
										tabindex="0" 
										on:keydown={(e) => e.key === 'Enter' && handleWorkshopClick(workshop)}>
										<div class="flex items-center justify-between mb-2">
											<div class="flex-1">
												<h4 class="font-semibold text-sm group-hover:text-primary transition-colors">{workshop.schoolName}</h4>
												<p class="text-xs text-muted-foreground">{workshop.title}</p>
											</div>
											<div class="text-right">
												<p class="text-xs font-medium text-gray-900">{formatDate(workshop.date)}</p>
												<p class="text-xs text-muted-foreground">{workshop.time}</p>
											</div>
										</div>
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-4 text-xs text-muted-foreground">
												<div class="flex items-center gap-1">
													<Users size={12} />
													<span>{workshop.group}</span>
												</div>
												<div class="flex items-center gap-1">
													<Clock size={12} />
													<span>{workshop.duration}</span>
												</div>
											</div>
											<div class="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md
											{workshop.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
												<svelte:component this={getStatusIcon(workshop.status)} size={10} />
												<span>{workshop.status === 'confirmed' ? $_('dashboard.confirmed') : $_('dashboard.pending')}</span>
											</div>
										</div>
									</div>
								{/each}
								{#if filteredWorkshops.filter(w => workshopFilter === 'today' || w.date !== new Date().toISOString().split('T')[0]).length > 4}
									<button class="w-full text-sm text-primary hover:text-primary/80 font-medium py-3 transition-colors border-t border-gray-200 mt-3">
										Bekijk alle {filteredWorkshops.length} workshops →
									</button>
								{/if}
							</div>
						{:else}
							<div class="flex flex-col items-center justify-center py-12 text-center">
								<div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
									<Calendar size={24} class="text-muted-foreground" />
								</div>
								<h3 class="font-semibold mb-2">{$_('dashboard.no_workshops')}</h3>
								<p class="text-sm text-muted-foreground max-w-md">
									{$_('dashboard.no_workshops_desc')}
								</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Quick Stats Bar -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
					<div 
						class="rounded-xl p-4 text-white cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg {workshopFilter === 'today' ? 'bg-gradient-to-r from-orange-500 to-orange-600 ring-2 ring-orange-300' : 'bg-gradient-to-r from-blue-500 to-blue-600'}"
						on:click={() => handleTileClick('today')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleTileClick('today')}
					>
						<div class="flex items-center justify-between">
							<div>
								<p class="{workshopFilter === 'today' ? 'text-orange-100' : 'text-blue-100'} text-xs font-medium">Vandaag</p>
								<p class="text-2xl font-bold">{upcomingWorkshops.filter(w => w.date === new Date().toISOString().split('T')[0]).length}</p>
							</div>
							<Calendar size={20} class="{workshopFilter === 'today' ? 'text-orange-200' : 'text-blue-200'}" />
						</div>
					</div>
					<div 
						class="rounded-xl p-4 text-white cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg {workshopFilter === 'thisweek' ? 'bg-gradient-to-r from-orange-500 to-orange-600 ring-2 ring-orange-300' : 'bg-gradient-to-r from-green-500 to-green-600'}"
						on:click={() => handleTileClick('thisweek')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleTileClick('thisweek')}
					>
						<div class="flex items-center justify-between">
							<div>
								<p class="{workshopFilter === 'thisweek' ? 'text-orange-100' : 'text-green-100'} text-xs font-medium">Deze week</p>
								<p class="text-2xl font-bold">{upcomingWorkshops.length}</p>
							</div>
							<Users size={20} class="{workshopFilter === 'thisweek' ? 'text-orange-200' : 'text-green-200'}" />
						</div>
					</div>
					<div 
						class="rounded-xl p-4 text-white cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg {workshopFilter === 'new' ? 'bg-gradient-to-r from-orange-500 to-orange-600 ring-2 ring-orange-300' : 'bg-gradient-to-r from-teal-500 to-teal-600'}"
						on:click={() => handleTileClick('new')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleTileClick('new')}
					>
						<div class="flex items-center justify-between">
							<div>
								<p class="{workshopFilter === 'new' ? 'text-orange-100' : 'text-teal-100'} text-xs font-medium">Nieuw</p>
								<p class="text-2xl font-bold">{$announcements.filter(a => a.priority === 'high' || a.priority === 'urgent').length}</p>
							</div>
							<Bell size={20} class="{workshopFilter === 'new' ? 'text-orange-200' : 'text-teal-200'}" />
						</div>
					</div>
					<div 
						class="rounded-xl p-4 text-white cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg {workshopFilter === 'confirmed' ? 'bg-gradient-to-r from-orange-500 to-orange-600 ring-2 ring-orange-300' : 'bg-gradient-to-r from-purple-500 to-purple-600'}"
						on:click={() => handleTileClick('confirmed')}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && handleTileClick('confirmed')}
					>
						<div class="flex items-center justify-between">
							<div>
								<p class="{workshopFilter === 'confirmed' ? 'text-orange-100' : 'text-purple-100'} text-xs font-medium">Bevestigd</p>
								<p class="text-2xl font-bold">{upcomingWorkshops.filter(w => w.status === 'confirmed').length}</p>
							</div>
							<CheckCircle size={20} class="{workshopFilter === 'confirmed' ? 'text-orange-200' : 'text-purple-200'}" />
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
