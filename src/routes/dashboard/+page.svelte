<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
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
	import { offlineActions, offlineState, isOffline, syncStatus } from '$lib/stores/offline';
	import { teamStore } from '$lib/stores/team';
	import Clock2 from '@lucide/svelte/icons/clock-2';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Play from '@lucide/svelte/icons/play';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

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
			// Try to load cached data first if offline, before attempting network requests
			if ($isOffline) {
				const cachedData = offlineActions.loadDashboardData();
				if (cachedData) {
					console.log('Loading cached dashboard data for offline use');
					
					// Load cached workshops
					upcomingWorkshops = cachedData.workshops || [];
					
					// Load cached schools
					schoolOptions = cachedData.schools || [];
					
					// Load cached announcements
					if (cachedData.announcements) {
						announcements.set(cachedData.announcements);
					}
					
					// Try to get user info, but don't fail if offline
					try {
						currentUser = await account.get();
					} catch (error) {
						console.log('Cannot get user info while offline, using cached data anyway');
						// We'll set a placeholder user ID from cached data
						currentUser = { $id: cachedData.userId };
					}
					
					loading = false;
					return;
				}
			}
			
			// Get current user when online
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
			
			// Load teams for team initials display - BEFORE loading workshops
			try {
				const response = await fetch(`/api/teams?userId=${encodeURIComponent(currentUser.$id)}`);
				const data = await response.json();
				
				if (data.success && data.teams) {
					console.log('Dashboard: Loaded teams:', data.teams.map(t => ({ id: t.$id, name: t.name })));
					teamStore.setTeams(data.teams);
				} else {
					console.warn('Dashboard: Failed to load teams:', data);
				}
			} catch (error) {
				console.warn('Failed to load teams for dashboard:', error);
			}
			
			// Use start of today and end of week to include workshops within next 7 days
			const startOfToday = new Date();
			startOfToday.setHours(0, 0, 0, 0);
			const startOfTodayISO = startOfToday.toISOString();
			
			const endOfWeek = new Date();
			endOfWeek.setDate(startOfToday.getDate() + 7);
			endOfWeek.setHours(23, 59, 59, 999);
			const endOfWeekISO = endOfWeek.toISOString();
			
			console.log('Dashboard: Fetching workshops from', startOfTodayISO, 'to', endOfWeekISO, 'for user', currentUser.$id);
			
			const response = await databases.listDocuments(
				databaseId,
				collectionId,
				[
					Query.equal('teacher', currentUser.$id),
					Query.greaterThanEqual('start', startOfTodayISO),
					Query.lessThanEqual('start', endOfWeekISO),
					Query.orderAsc('start'),
					Query.limit(25)
				]
			);
			
			console.log('Dashboard: Found', response.documents.length, 'workshops');
			
			// Transform Appwrite data to match UI structure
			const transformedWorkshops = response.documents.map(doc => {
				const workshopDate = new Date(doc.start);
				// Parse sessions from JSON string if needed
				let parsedSessions = [];
				if (doc.sessions) {
					try {
						parsedSessions = typeof doc.sessions === 'string' ? JSON.parse(doc.sessions) : doc.sessions;
						console.log('Dashboard: Parsed sessions for workshop', doc.$id, ':', parsedSessions);
					} catch (e) {
						console.error('Dashboard: Failed to parse sessions for workshop', doc.$id, ':', e);
						console.log('Dashboard: Raw sessions data:', doc.sessions);
						parsedSessions = [];
					}
				} else {
					console.log('Dashboard: No sessions data found for workshop', doc.$id);
				}

				// Get team name for group display
				const getTeamNameForGroup = (teamId: string) => {
					if (!teamId) {
						console.log('Dashboard: No teamId for workshop', doc.$id);
						return 'Team onbekend';
					}
					
					// Get current team store value directly
					const currentTeamStore = get(teamStore);
					console.log('Dashboard: Current team store:', currentTeamStore);
					
					if (!currentTeamStore.teams?.length) {
						console.log('Dashboard: No teams in store');
						return 'Team onbekend';
					}
					
					const team = currentTeamStore.teams.find(t => t.$id === teamId);
					console.log('Dashboard: Looking for team ID:', teamId, 'Found:', team);
					return team?.name || 'Team onbekend';
				};

				const workshop = {
					id: doc.$id,
					title: getWorkshopTitle(doc),
					schoolName: getSchoolName(doc.school),
					date: workshopDate.toISOString().split('T')[0],
					time: formatTimeRange(doc.start, doc.end),
					duration: `${doc.length || 90} min`,
					group: doc.group || doc.klas || getTeamNameForGroup(doc.teamId),
					status: doc.status || 'geplanned',
					color: doc.status === 'bevestigd' ? '#3ba39b' : '#eab308',
					teacherName: currentUser.name || 'Docent onbekend',
					location: doc.location || 'Lokaal onbekend',
					description: doc.description || '',
					lesson: doc.lesson,
					school: doc.school,
					materialen: doc.materialen || '',
					sessions: parsedSessions,
					teamId: doc.teamId, // Include team ID for team selection
					rawStart: doc.start // Keep original start time for debugging
				};
				
				console.log('Dashboard: Workshop mapped:', {
					id: workshop.id,
					title: workshop.title,
					date: workshop.date,
					time: workshop.time,
					status: workshop.status,
					teamId: workshop.teamId,
					rawStart: doc.start,
					localTime: workshopDate.toLocaleString(),
					isToday: isToday(workshop.date)
				});
				
				return workshop;
			});
			
			// Set workshops data immediately
			upcomingWorkshops = transformedWorkshops;
			console.log('Dashboard: Set upcomingWorkshops to', upcomingWorkshops.length, 'workshops');
			
			// Save workshop data to localStorage immediately (before announcements)
			console.log('Dashboard: Saving workshops to localStorage immediately');
			offlineActions.saveDashboardData(
				upcomingWorkshops,
				[], // Empty announcements for now
				schoolOptions,
				currentUser.$id
			);
			
			// Load real announcements (non-blocking)
			try {
				await announcementActions.fetchAnnouncements({}, true);
				console.log('Dashboard: Announcements loaded successfully, updating localStorage');
				// Update localStorage with announcements
				offlineActions.saveDashboardData(
					upcomingWorkshops,
					$announcements,
					schoolOptions,
					currentUser.$id
				);
			} catch (announcementError) {
				console.error('Dashboard: Failed to load announcements, but workshops are saved:', announcementError);
				// Workshops are already saved, continue without announcements
			}
			
		} catch (error) {
			console.error('Error loading dashboard data:', error);
			
			// Try to load cached data as fallback
			const cachedData = offlineActions.loadDashboardData();
			if (cachedData) {
				console.log('Loading cached data as fallback due to error');
				upcomingWorkshops = cachedData.workshops || [];
				schoolOptions = cachedData.schools || [];
				if (cachedData.announcements) {
					announcements.set(cachedData.announcements);
				}
				// Set user info from cached data if not already set
				if (!currentUser && cachedData.userId) {
					currentUser = { $id: cachedData.userId };
				}
			} else {
				console.log('No cached data available, showing empty state');
				upcomingWorkshops = [];
			}
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

	function formatSessionTime(startTime: string, endTime: string) {
		const start = new Date(startTime);
		const end = new Date(endTime);
		return `${start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
	}

	function getSessionStatus(session: any) {
		const now = new Date();
		const sessionStart = new Date(session.start);
		const sessionEnd = new Date(session.end);
		
		if (now < sessionStart) return 'upcoming';
		if (now >= sessionStart && now <= sessionEnd) return 'current';
		return 'completed';
	}

	function isToday(dateString: string) {
		const today = new Date().toISOString().split('T')[0];
		return dateString === today;
	}

	function getTeamInitials(teamId: string): string {
		if (!teamId) {
			console.log('Dashboard: No teamId provided');
			return '';
		}
		if (!$teamStore.teams || $teamStore.teams.length === 0) {
			console.log('Dashboard: No teams loaded in store');
			return '';
		}
		
		const team = $teamStore.teams.find(t => t.$id === teamId);
		if (!team) {
			console.log('Dashboard: Team not found for ID:', teamId, 'Available teams:', $teamStore.teams.map(t => t.$id));
			return '';
		}
		if (!team.name) {
			console.log('Dashboard: Team found but no name:', team);
			return '';
		}
		
		// Convert team name to initials (e.g., "Team Alpha" -> "TA")
		const initials = team.name
			.split(' ')
			.filter(word => word.length > 0)
			.map(word => word.charAt(0).toUpperCase())
			.join('');
			
		console.log('Dashboard: Generated initials for team', team.name, ':', initials);
		return initials;
	}

	async function handleWorkshopClick(workshop: any) {
		// Set the team based on workshop data if available
		if (workshop.teamId) {
			const { teamStore } = await import('$lib/stores/team');
			const { get } = await import('svelte/store');
			
			// Get current teams to find the matching team
			const currentTeamStore = get(teamStore);
			const matchingTeam = currentTeamStore.teams.find(team => team.$id === workshop.teamId);
			
			if (matchingTeam) {
				teamStore.setSelectedTeam(matchingTeam);
			}
		}
		
		goto(`/planning?id=${workshop.id}#mijn-planning`);
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
			if ($isOffline) {
				// Store action for later sync
				offlineActions.addPendingAction('mark_read', {
					announcementId,
					userId: currentUser.$id
				});
				
				// Update local state immediately for better UX
				announcements.update(items => 
					items.map(item => {
						if (item.$id === announcementId && !item.readBy.includes(currentUser.$id)) {
							return { ...item, readBy: [...item.readBy, currentUser.$id] };
						}
						return item;
					})
				);
			} else {
				await announcementActions.markAsRead(announcementId);
			}
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
	<!-- Offline Status Indicator -->
	{#if $isOffline || $syncStatus === 'syncing'}
		<div class="mb-4 rounded-lg border {$isOffline ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'} p-3">
			<div class="flex items-center gap-2">
				{#if $isOffline}
					<div class="h-2 w-2 rounded-full bg-yellow-500"></div>
					<span class="text-sm font-medium text-yellow-800">Offline modus</span>
					<span class="text-xs text-yellow-600">- Data wordt lokaal opgeslagen</span>
				{:else if $syncStatus === 'syncing'}
					<div class="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
					<span class="text-sm font-medium text-blue-800">Synchroniseren...</span>
					<span class="text-xs text-blue-600">- {$offlineState.pendingActions.length} acties in wachtrij</span>
				{/if}
			</div>
		</div>
	{/if}

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
				{#if filteredWorkshops.filter(w => isToday(w.date)).length > 0 && workshopFilter !== 'confirmed'}
				<Card.Root class="border-l-4 border-l-primary">
					<Card.Header class="pb-3">
						<div class="flex items-center gap-2">
							<div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
							<Card.Title class="text-lg font-semibold text-primary">Vandaag</Card.Title>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							{#each filteredWorkshops.filter(w => isToday(w.date)) as workshop (workshop.id)}
								<div class="rounded-xl border-2 border-gray-100 bg-white dark:border-teal-200 dark:bg-transparent transition-all duration-200"> 
									<!-- Workshop Header -->
									<div class="group cursor-pointer p-4 hover:border-primary/30 hover:shadow-lg dark:hover:border-teal-400 transition-all duration-200"
										on:click={() => handleWorkshopClick(workshop)} 
										role="button" 
										tabindex="0" 
										on:keydown={(e) => e.key === 'Enter' && handleWorkshopClick(workshop)}>
										<div class="flex items-start justify-between mb-3">
											<div class="flex-1">
												<h3 class="font-bold text-base mb-1 group-hover:text-primary transition-colors">{workshop.title}</h3>
												<p class="text-sm text-muted-foreground font-medium">{workshop.schoolName}</p>
											</div>
											<div class="flex items-center gap-2">
												{#if getTeamInitials(workshop.teamId)}
													<div class="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
														{getTeamInitials(workshop.teamId)}
													</div>
												{/if}
												<div class="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
												{workshop.status === 'confirmed' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}">
													<svelte:component this={getStatusIcon(workshop.status)} size={12} />
													<span>{workshop.status === 'confirmed' ? $_('dashboard.confirmed') : $_('dashboard.pending')}</span>
												</div>
											</div>
										</div>
										<div class="grid grid-cols-3 gap-4 text-sm">
											<div class="flex items-center gap-2 text-gray-600 dark:text-white">
												<Clock size={16} class="text-primary" />
												<span class="font-medium">{workshop.time}</span>
											</div>
											<div class="flex items-center gap-2 text-gray-600 dark:text-white">
												<Users size={16} class="text-primary" />
												<span class="font-medium">{workshop.group}</span>
											</div>
											<div class="flex items-center gap-2 text-gray-600 dark:text-white">
												<MapPin size={16} class="text-primary" />
												<span class="font-medium">{workshop.location}</span>
											</div>
										</div>
									</div>

									<!-- Session Schedule -->
									{#if workshop.sessions && workshop.sessions.length > 0}
										<div class="px-4 py-3 bg-gray-50/50 dark:bg-transparent">
											<div class="flex items-center gap-2 mb-3">
												<Clock2 size={16} class="text-primary" />
												<h4 class="font-semibold text-sm">Sessie planning</h4>
											</div>
											<div class="space-y-2">
												{#each workshop.sessions as session, i (i)}
													{@const status = getSessionStatus(session)}
													<div class="flex items-center gap-3 p-2 rounded-lg
														{status === 'current' ? 'bg-primary/10 border border-primary/20' : 
														 status === 'completed' ? 'bg-green-50 border border-green-200' : 
														 'bg-white border border-gray-200'}">
														
														<!-- Session Icon -->
														<div class="flex-shrink-0">
															{#if session.type === 'break'}
																<Coffee size={16} class="text-orange-500" />
															{:else if status === 'current'}
																<Play size={16} class="text-primary" />
															{:else if status === 'completed'}
																<CheckCircle2 size={16} class="text-green-600" />
															{:else}
																<Clock2 size={16} class="text-gray-400" />
															{/if}
														</div>

														<!-- Session Details -->
														<div class="flex-1 min-w-0">
															<div class="flex items-center justify-between">
																<div>
																	<p class="font-medium text-sm
																		{status === 'current' ? 'text-primary' : 
																		 status === 'completed' ? 'text-green-700' : 
																		 'text-gray-900'}">
																		{session.title || (session.type === 'break' ? 'Pauze' : session.lesson || 'Sessie')}
																	</p>
																	{#if session.type === 'session' && session.group}
																		<p class="text-xs text-muted-foreground">{session.group}</p>
																	{/if}
																</div>
																<div class="text-right">
																	<p class="text-xs font-medium
																		{status === 'current' ? 'text-primary' : 
																		 status === 'completed' ? 'text-green-600' : 
																		 'text-gray-600'}">
																		{formatSessionTime(session.start, session.end)}
																	</p>
																	<p class="text-xs text-muted-foreground">
																		{session.duration || 0} min
																	</p>
																</div>
															</div>
														</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}
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
								{#each filteredWorkshops.filter(w => workshopFilter === 'today' || !isToday(w.date)).slice(0, 4) as workshop (workshop.id)}
									<div class="group cursor-pointer rounded-lg border border-gray-200 bg-gray-50/50 hover:border-primary/40 hover:bg-white hover:shadow-sm dark:border-teal-200 dark:bg-transparent dark:hover:border-teal-400 p-3 transition-all duration-200" 
										on:click={() => handleWorkshopClick(workshop)} 
										role="button" 
										tabindex="0" 
										on:keydown={(e) => e.key === 'Enter' && handleWorkshopClick(workshop)}>
										<div class="flex items-center justify-between mb-2">
											<div class="flex-1">
												<h4 class="font-semibold text-sm group-hover:text-primary transition-colors">{workshop.schoolName}</h4>
												<p class="text-xs text-muted-foreground dark:text-white">{workshop.title}</p>
											</div>
											<div class="text-right">
												<p class="text-xs font-medium text-gray-900 dark:text-white">{formatDate(workshop.date)}</p>
												<p class="text-xs text-muted-foreground dark:text-white">{workshop.time}</p>
											</div>
										</div>
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-4 text-xs text-muted-foreground dark:text-white">
												<div class="flex items-center gap-1">
													<Users size={12} />
													<span>{workshop.group}</span>
												</div>
												<div class="flex items-center gap-1">
													<Clock size={12} />
													<span>{workshop.duration}</span>
												</div>
											</div>
											<div class="flex items-center gap-2">
												{#if getTeamInitials(workshop.teamId)}
													<div class="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">
														{getTeamInitials(workshop.teamId)}
													</div>
												{/if}
												<div class="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md
												{workshop.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
													<svelte:component this={getStatusIcon(workshop.status)} size={10} />
													<span>{workshop.status === 'confirmed' ? $_('dashboard.confirmed') : $_('dashboard.pending')}</span>
												</div>
											</div>
										</div>
									</div>
								{/each}
								{#if filteredWorkshops.filter(w => workshopFilter === 'today' || !isToday(w.date)).length > 4}
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
