<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import { 
		announcements, 
		announcementActions, 
		isLoading, 
		error 
	} from '$lib/stores/announcements';
	import AnnouncementForm from '$lib/components/AnnouncementForm.svelte';
	import AnnouncementList from '$lib/components/AnnouncementList.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Plus, MessageSquare, Settings, Users, Building } from 'lucide-svelte';
	import type { Announcement } from '$lib/types/announcements';

	let showCreateForm = false;
	let showCreateSheet = false; // For mobile
	let editingAnnouncement: Announcement | null = null;
	let viewingAnnouncement: Announcement | null = null;

	// Check if user has admin permissions
	$: isAdmin = $user?.labels?.includes('admin') || $user?.labels?.includes('planning');

	onMount(() => {
		// Redirect if not admin
		if (!isAdmin) {
			goto('/dashboard');
			return;
		}

		// Load announcements
		announcementActions.fetchAnnouncements({}, true);
	});

	function handleCreateNew() {
		editingAnnouncement = null;
		if (window.innerWidth < 768) {
			showCreateSheet = true;
		} else {
			showCreateForm = true;
		}
	}

	function handleEdit(event: CustomEvent<Announcement>) {
		editingAnnouncement = event.detail;
		if (window.innerWidth < 768) {
			showCreateSheet = true;
		} else {
			showCreateForm = true;
		}
	}

	function handleView(event: CustomEvent<Announcement>) {
		viewingAnnouncement = event.detail;
	}

	function handleFormSuccess() {
		showCreateForm = false;
		showCreateSheet = false;
		editingAnnouncement = null;
		// Refresh the list
		announcementActions.fetchAnnouncements({}, true);
	}

	function handleFormCancel() {
		showCreateForm = false;
		showCreateSheet = false;
		editingAnnouncement = null;
	}

	function closeViewDialog() {
		viewingAnnouncement = null;
	}

	// Stats calculations
	$: totalAnnouncements = $announcements.length;
	$: urgentAnnouncements = $announcements.filter(a => a.priority === 'urgent').length;
	$: highPriorityAnnouncements = $announcements.filter(a => a.priority === 'high').length;
	$: teamAnnouncements = $announcements.filter(a => a.targetType === 'team').length;
	$: classAnnouncements = $announcements.filter(a => a.targetType === 'class').length;
	$: schoolAnnouncements = $announcements.filter(a => a.targetType === 'school').length;
</script>

<svelte:head>
	<title>Mededelingen Beheer - Toekomst School</title>
</svelte:head>

{#if !isAdmin}
	<div class="container mx-auto p-6">
		<Card.Root>
			<Card.Content class="py-8 text-center">
				<MessageSquare size={48} class="mx-auto text-muted-foreground mb-4" />
				<h2 class="text-xl font-semibold mb-2">Toegang geweigerd</h2>
				<p class="text-muted-foreground">Je hebt geen toestemming om mededelingen te beheren.</p>
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<div class="container mx-auto p-4 md:p-6 max-w-7xl">
		<!-- Header -->
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
			<div>
				<h1 class="text-2xl md:text-3xl font-bold flex items-center gap-2">
					<MessageSquare size={24} class="text-primary" />
					Mededelingen Beheer
				</h1>
				<p class="text-muted-foreground mt-1">
					Verstuur mededelingen naar teams, klassen en scholen
				</p>
			</div>
			
			<button 
				on:click={handleCreateNew} 
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
			>
				<Plus size={16} />
				Nieuwe mededeling
			</button>
		</div>

		<!-- Stats Overview -->
		<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
			<Card.Root>
				<Card.Content class="p-3 md:p-4 text-center">
					<div class="text-lg md:text-2xl font-bold text-blue-600">{totalAnnouncements}</div>
					<div class="text-xs md:text-sm text-muted-foreground">Totaal</div>
				</Card.Content>
			</Card.Root>
			
			<Card.Root>
				<Card.Content class="p-3 md:p-4 text-center">
					<div class="text-lg md:text-2xl font-bold text-red-600">{urgentAnnouncements}</div>
					<div class="text-xs md:text-sm text-muted-foreground">Urgent</div>
				</Card.Content>
			</Card.Root>
			
			<Card.Root>
				<Card.Content class="p-3 md:p-4 text-center">
					<div class="text-lg md:text-2xl font-bold text-orange-600">{highPriorityAnnouncements}</div>
					<div class="text-xs md:text-sm text-muted-foreground">Hoog</div>
				</Card.Content>
			</Card.Root>
			
			<Card.Root>
				<Card.Content class="p-3 md:p-4 text-center">
					<div class="text-lg md:text-2xl font-bold text-green-600">{teamAnnouncements}</div>
					<div class="text-xs md:text-sm text-muted-foreground">Teams</div>
				</Card.Content>
			</Card.Root>
			
			<Card.Root>
				<Card.Content class="p-3 md:p-4 text-center">
					<div class="text-lg md:text-2xl font-bold text-purple-600">{classAnnouncements}</div>
					<div class="text-xs md:text-sm text-muted-foreground">Klassen</div>
				</Card.Content>
			</Card.Root>
			
			<Card.Root>
				<Card.Content class="p-3 md:p-4 text-center">
					<div class="text-lg md:text-2xl font-bold text-teal-600">{schoolAnnouncements}</div>
					<div class="text-xs md:text-sm text-muted-foreground">Scholen</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Desktop Layout -->
		<div class="hidden md:grid md:grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Announcements List -->
			<div class="lg:col-span-2">
				<AnnouncementList 
					on:edit={handleEdit}
					on:view={handleView}
				/>
			</div>

			<!-- Create/Edit Form -->
			<div class="lg:col-span-1">
				{#if showCreateForm}
					<AnnouncementForm
						announcement={editingAnnouncement}
						isEdit={!!editingAnnouncement}
						on:success={handleFormSuccess}
						on:cancel={handleFormCancel}
					/>
				{:else}
					<Card.Root>
						<Card.Content class="py-8 text-center">
							<MessageSquare size={32} class="mx-auto text-muted-foreground mb-3" />
							<h3 class="font-semibold mb-2">Maak een nieuwe mededeling</h3>
							<p class="text-sm text-muted-foreground mb-4">
								Klik op "Nieuwe mededeling" om te beginnen
							</p>
							<button 
								on:click={handleCreateNew} 
								class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 flex items-center gap-2"
							>
								<Plus size={16} />
								Nieuwe mededeling
							</button>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>

		<!-- Mobile Layout -->
		<div class="md:hidden">
			<AnnouncementList 
				on:edit={handleEdit}
				on:view={handleView}
			/>
		</div>

		<!-- Mobile Create/Edit Sheet -->
		<Sheet.Root bind:open={showCreateSheet}>
			<Sheet.Content side="bottom" class="h-[90vh]">
				<Sheet.Header>
					<Sheet.Title>
						{editingAnnouncement ? 'Mededeling bewerken' : 'Nieuwe mededeling'}
					</Sheet.Title>
				</Sheet.Header>
				<div class="py-4 overflow-y-auto">
					<AnnouncementForm
						announcement={editingAnnouncement}
						isEdit={!!editingAnnouncement}
						on:success={handleFormSuccess}
						on:cancel={handleFormCancel}
					/>
				</div>
			</Sheet.Content>
		</Sheet.Root>

		<!-- View Dialog -->
		<Dialog.Root open={!!viewingAnnouncement} onOpenChange={(open) => { if (!open) viewingAnnouncement = null; }}>
			<Dialog.Content class="max-w-2xl">
				{#if viewingAnnouncement}
					<Dialog.Header>
						<Dialog.Title class="flex items-center gap-2">
							<div class="w-3 h-3 rounded-full
								{viewingAnnouncement.priority === 'urgent' ? 'bg-red-500' :
								 viewingAnnouncement.priority === 'high' ? 'bg-orange-500' :
								 viewingAnnouncement.priority === 'normal' ? 'bg-blue-500' : 'bg-green-500'}">
							</div>
							{viewingAnnouncement.title}
						</Dialog.Title>
					</Dialog.Header>
					
					<div class="space-y-4">
						<div class="flex items-center gap-4 text-sm text-muted-foreground">
							<div class="flex items-center gap-1">
								{#if viewingAnnouncement.targetType === 'team'}
									<Users size={14} />
								{:else if viewingAnnouncement.targetType === 'class'}
									<MessageSquare size={14} />
								{:else}
									<Building size={14} />
								{/if}
								<span>{viewingAnnouncement.targetName}</span>
							</div>
							<span>•</span>
							<span>door {viewingAnnouncement.authorName}</span>
							<span>•</span>
							<span>{new Date(viewingAnnouncement.$createdAt).toLocaleDateString('nl-NL')}</span>
						</div>
						
						<div class="prose prose-sm max-w-none">
							<p class="whitespace-pre-wrap">{viewingAnnouncement.content}</p>
						</div>
						
						{#if viewingAnnouncement.expiresAt}
							<div class="p-3 bg-muted rounded-lg">
								<p class="text-sm text-muted-foreground">
									<strong>Vervalt:</strong> {new Date(viewingAnnouncement.expiresAt).toLocaleDateString('nl-NL')}
								</p>
							</div>
						{/if}
					</div>
					
					<Dialog.Footer>
						<Button variant="outline" on:click={closeViewDialog}>
							Sluiten
						</Button>
						<Button on:click={() => handleEdit({ detail: viewingAnnouncement })}>
							Bewerken
						</Button>
					</Dialog.Footer>
				{/if}
			</Dialog.Content>
		</Dialog.Root>
	</div>
{/if}

{#if $error}
	<div class="fixed bottom-4 right-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-sm">
		<p class="text-sm text-red-700">{$error}</p>
		<Button 
			variant="ghost" 
			size="sm" 
			class="mt-2 text-red-600 hover:text-red-700"
			on:click={() => announcementActions.clearError()}
		>
			Sluiten
		</Button>
	</div>
{/if}