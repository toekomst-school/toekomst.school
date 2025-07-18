<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { 
		announcements, 
		filteredAnnouncements, 
		currentFilters, 
		announcementActions, 
		isLoading 
	} from '$lib/stores/announcements';
	import { user } from '$lib/stores/auth';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { 
		Search, 
		Filter, 
		Eye, 
		Edit, 
		Trash2, 
		Bell, 
		Clock, 
		Users, 
		MessageSquare,
		Calendar,
		AlertTriangle
	} from 'lucide-svelte';
	import type { Announcement, AnnouncementFilters } from '$lib/types/announcements';

	const dispatch = createEventDispatcher<{
		edit: Announcement;
		view: Announcement;
	}>();

	// Filter state
	let searchQuery = '';
	let selectedPriority = 'all';
	let selectedTargetType = 'all';
	let showUnreadOnly = false;

	// Pagination
	let currentPage = 0;
	const pageSize = 10;

	$: paginatedAnnouncements = $filteredAnnouncements.slice(
		currentPage * pageSize, 
		(currentPage + 1) * pageSize
	);

	$: totalPages = Math.ceil($filteredAnnouncements.length / pageSize);

	onMount(() => {
		loadAnnouncements();
	});

	async function loadAnnouncements() {
		try {
			await announcementActions.fetchAnnouncements({}, true);
		} catch (error) {
			console.error('Failed to load announcements:', error);
		}
	}

	function applyFilters() {
		const filters: AnnouncementFilters = {};
		
		if (searchQuery.trim()) filters.search = searchQuery.trim();
		if (selectedPriority !== 'all') filters.priority = selectedPriority as any;
		if (selectedTargetType !== 'all') filters.targetType = selectedTargetType as any;
		if (showUnreadOnly) filters.unreadOnly = true;

		announcementActions.setFilters(filters);
		currentPage = 0; // Reset to first page
	}

	function clearFilters() {
		searchQuery = '';
		selectedPriority = 'all';
		selectedTargetType = 'all';
		showUnreadOnly = false;
		announcementActions.setFilters({});
		currentPage = 0;
	}

	function handleEdit(announcement: Announcement) {
		dispatch('edit', announcement);
	}

	function handleView(announcement: Announcement) {
		// Mark as read when viewing
		if (!announcement.readBy.includes(getCurrentUserId())) {
			announcementActions.markAsRead(announcement.$id);
		}
		dispatch('view', announcement);
	}

	async function handleDelete(announcement: Announcement) {
		if (confirm(`Weet je zeker dat je "${announcement.title}" wilt verwijderen?`)) {
			try {
				await announcementActions.deleteAnnouncement(announcement.$id);
			} catch (error) {
				console.error('Failed to delete announcement:', error);
			}
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('nl-NL', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getPriorityColor(priority: string): string {
		switch (priority) {
			case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
			case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
			case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
			default: return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	function getTargetTypeIcon(type: string) {
		switch (type) {
			case 'team': return Users;
			case 'class': return MessageSquare;
			case 'school': return Bell;
			default: return MessageSquare;
		}
	}

	function isUnread(announcement: Announcement): boolean {
		return !announcement.readBy.includes(getCurrentUserId());
	}

	function getCurrentUserId(): string {
		try {
			const currentUser = get(user);
			if (currentUser && currentUser.$id) {
				return currentUser.$id;
			}
			
			// Fallback: try to get from localStorage where auth might store it
			if (typeof window !== 'undefined') {
				const authData = localStorage.getItem('auth') || localStorage.getItem('user');
				if (authData) {
					const parsed = JSON.parse(authData);
					return parsed.id || parsed.$id || parsed.userId || '';
				}
			}
		} catch (error) {
			console.warn('Failed to get current user ID:', error);
		}
		return '';
	}

	// Watch filters and apply them
	$: {
		if (searchQuery !== undefined) applyFilters();
	}
</script>

<div class="space-y-6">
	<!-- Filters -->
	<Card.Root>
		<Card.Header class="pb-4">
			<div class="flex items-center justify-between">
				<Card.Title class="flex items-center gap-2">
					<Filter size={18} />
					Filters
				</Card.Title>
				<Button variant="ghost" size="sm" on:click={clearFilters}>
					Wissen
				</Button>
			</div>
		</Card.Header>
		
		<Card.Content class="space-y-4">
			<!-- Search -->
			<div class="flex items-center gap-2">
				<Search size={16} class="text-muted-foreground" />
				<Input
					placeholder="Zoek in mededelingen..."
					bind:value={searchQuery}
					class="flex-1"
				/>
			</div>

			<!-- Filter Options -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<!-- Priority Filter -->
				<div class="space-y-2">
					<label class="text-sm font-medium">Prioriteit</label>
					<select bind:value={selectedPriority} class="w-full h-9 px-3 py-2 border rounded-md bg-background">
						<option value="all">Alle prioriteiten</option>
						<option value="urgent">Urgent</option>
						<option value="high">Hoog</option>
						<option value="normal">Normaal</option>
						<option value="low">Laag</option>
					</select>
				</div>

				<!-- Target Type Filter -->
				<div class="space-y-2">
					<label class="text-sm font-medium">Type</label>
					<select bind:value={selectedTargetType} class="w-full h-9 px-3 py-2 border rounded-md bg-background">
						<option value="all">Alle types</option>
						<option value="team">Teams</option>
						<option value="class">Klassen</option>
						<option value="school">Scholen</option>
					</select>
				</div>

				<!-- Unread Only -->
				<div class="space-y-2">
					<label class="text-sm font-medium">Status</label>
					<Button
						variant={showUnreadOnly ? "default" : "outline"}
						size="sm"
						on:click={() => showUnreadOnly = !showUnreadOnly}
						class="w-full justify-start"
					>
						{showUnreadOnly ? 'Alleen ongelezen' : 'Alle berichten'}
					</Button>
				</div>

				<!-- Results Count -->
				<div class="space-y-2">
					<label class="text-sm font-medium">Resultaten</label>
					<div class="flex items-center h-9 px-3 py-2 border rounded-md bg-muted">
						<span class="text-sm">{$filteredAnnouncements.length} gevonden</span>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Announcements List -->
	<div class="space-y-3">
		{#if $isLoading}
			<Card.Root>
				<Card.Content class="py-8">
					<div class="flex items-center justify-center">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
						<span class="ml-2 text-muted-foreground">Mededelingen laden...</span>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if paginatedAnnouncements.length === 0}
			<Card.Root>
				<Card.Content class="py-8">
					<div class="text-center">
						<MessageSquare size={32} class="mx-auto text-muted-foreground mb-3" />
						<h3 class="font-semibold mb-1">Geen mededelingen gevonden</h3>
						<p class="text-sm text-muted-foreground">
							{$filteredAnnouncements.length === 0 && Object.keys($currentFilters).length === 0
								? 'Er zijn nog geen mededelingen.'
								: 'Probeer je zoekfilters aan te passen.'}
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			{#each paginatedAnnouncements as announcement (announcement.$id)}
				<Card.Root 
					class="transition-all duration-200 hover:shadow-md cursor-pointer
					{isUnread(announcement) ? 'border-teal-200 dark:border-teal-400' : 'border-gray-200'}
					{announcement.priority === 'urgent' ? 'border-l-4 border-l-red-500' : 
					 announcement.priority === 'high' ? 'border-l-4 border-l-orange-500' : ''}"
					on:click={() => handleView(announcement)}
				>
					<Card.Content class="p-4">
						<div class="flex items-start justify-between mb-3">
							<div class="flex-1 space-y-1">
								<div class="flex items-center gap-2">
									<h3 class="font-semibold text-base {isUnread(announcement) ? 'text-foreground' : 'text-muted-foreground'}">
										{announcement.title}
									</h3>
									{#if isUnread(announcement)}
										<div class="w-2 h-2 bg-teal-500 rounded-full"></div>
									{/if}
								</div>
								
								<div class="flex items-center gap-3 text-xs text-muted-foreground">
									<div class="flex items-center gap-1">
										<svelte:component this={getTargetTypeIcon(announcement.targetType)} size={12} />
										<span>{announcement.targetName}</span>
									</div>
									<div class="flex items-center gap-1">
										<Clock size={12} />
										<span>{formatDate(announcement.$createdAt)}</span>
									</div>
									<span>door {announcement.authorName}</span>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<Badge class={getPriorityColor(announcement.priority)}>
									{announcement.priority === 'urgent' ? 'Urgent' :
									 announcement.priority === 'high' ? 'Hoog' :
									 announcement.priority === 'normal' ? 'Normaal' : 'Laag'}
								</Badge>
								
								{#if announcement.priority === 'urgent'}
									<AlertTriangle size={16} class="text-red-500" />
								{/if}
							</div>
						</div>

						<p class="text-sm text-muted-foreground line-clamp-2 mb-3">
							{announcement.content}
						</p>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-xs text-muted-foreground">
								{#if announcement.expiresAt}
									<div class="flex items-center gap-1">
										<Calendar size={12} />
										<span>Vervalt: {formatDate(announcement.expiresAt)}</span>
									</div>
								{/if}
							</div>

							<div class="flex items-center gap-1">
								<Button 
									variant="ghost" 
									size="sm" 
									on:click={(e) => { e.stopPropagation(); handleView(announcement); }}
								>
									<Eye size={14} class="mr-1" />
									Bekijk
								</Button>
								
								<Button 
									variant="ghost" 
									size="sm" 
									on:click={(e) => { e.stopPropagation(); handleEdit(announcement); }}
								>
									<Edit size={14} class="mr-1" />
									Bewerk
								</Button>
								
								<Button 
									variant="ghost" 
									size="sm" 
									class="text-red-600 hover:text-red-700"
									on:click={(e) => { e.stopPropagation(); handleDelete(announcement); }}
								>
									<Trash2 size={14} class="mr-1" />
									Verwijder
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Pagina {currentPage + 1} van {totalPages} 
				({$filteredAnnouncements.length} resultaten)
			</p>
			
			<div class="flex items-center gap-2">
				<Button 
					variant="outline" 
					size="sm" 
					disabled={currentPage === 0}
					on:click={() => currentPage = Math.max(0, currentPage - 1)}
				>
					Vorige
				</Button>
				
				<span class="text-sm px-2">
					{currentPage + 1} / {totalPages}
				</span>
				
				<Button 
					variant="outline" 
					size="sm" 
					disabled={currentPage >= totalPages - 1}
					on:click={() => currentPage = Math.min(totalPages - 1, currentPage + 1)}
				>
					Volgende
				</Button>
			</div>
		</div>
	{/if}
</div>