<script lang="ts">
	import { onMount } from 'svelte';
	import { databases } from '$lib/appwrite';
	import { user } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { Query } from 'appwrite';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { CalendarIcon, SearchIcon, FilterIcon, MailIcon, PhoneIcon, BuildingIcon, UsersIcon, AlertCircle } from 'lucide-svelte';

	const databaseId = 'lessen';
	const collectionId = 'aanvragen';

	// Check user role
	$: isVakdocent = $user?.labels?.includes('vakdocent');
	$: isAdmin = $user?.labels?.includes('admin');
	$: hasAccess = isVakdocent || isAdmin;
	
	// Redirect if no access
	$: if ($user && !hasAccess) {
		// Teachers should go to docent-on-demand
		if ($user.labels?.includes('teacher')) {
			goto('/docent-on-demand');
		} else {
			goto('/');
		}
	}

	let requests: any[] = [];
	let loading = true;
	let error = '';
	let success = '';
	let searchQuery = '';
	let statusFilter = 'all';
	let priorityFilter = 'all';
	let showFilters = false;
	let selectedRequest: any = null;
	let showRequestDialog = false;

	// Status options
	const statusOptions = [
		{ value: 'nieuw', label: 'Nieuw', color: 'bg-blue-500' },
		{ value: 'in_behandeling', label: 'In behandeling', color: 'bg-yellow-500' },
		{ value: 'geaccepteerd', label: 'Geaccepteerd', color: 'bg-green-500' },
		{ value: 'afgewezen', label: 'Afgewezen', color: 'bg-red-500' }
	];

	const priorityOptions = [
		{ value: 'hoog', label: 'Hoog', color: 'bg-red-100 text-red-800' },
		{ value: 'normaal', label: 'Normaal', color: 'bg-gray-100 text-gray-800' },
		{ value: 'laag', label: 'Laag', color: 'bg-green-100 text-green-800' }
	];

	async function fetchRequests() {
		loading = true;
		try {
			const response = await databases.listDocuments(databaseId, collectionId, [
				Query.orderDesc('$createdAt')
			]);
			requests = response.documents;
			error = '';
		} catch (e) {
			error = `Fout bij laden van aanvragen: ${e}`;
			console.error('Error fetching requests:', e);
		} finally {
			loading = false;
		}
	}

	async function updateRequestStatus(requestId: string, newStatus: string) {
		try {
			await databases.updateDocument(databaseId, collectionId, requestId, {
				status: newStatus
			});
			await fetchRequests();
			success = 'Status succesvol bijgewerkt';
			setTimeout(() => success = '', 3000);
		} catch (e) {
			error = `Fout bij bijwerken van status: ${e}`;
			console.error('Error updating status:', e);
		}
	}

	function getStatusBadgeColor(status: string) {
		const option = statusOptions.find(s => s.value === status);
		return option?.color || 'bg-gray-500';
	}

	function getPriorityBadgeColor(priority: string) {
		const option = priorityOptions.find(p => p.value === priority);
		return option?.color || 'bg-gray-100 text-gray-800';
	}

	function openRequestDialog(request: any) {
		selectedRequest = request;
		showRequestDialog = true;
	}

	// Filter requests
	$: filteredRequests = requests.filter(request => {
		const matchesSearch = searchQuery === '' || 
			request.naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			request.organisatie?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			request.onderwerp?.toLowerCase().includes(searchQuery.toLowerCase());
		
		const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
		const matchesPriority = priorityFilter === 'all' || request.prioriteit === priorityFilter;
		
		return matchesSearch && matchesStatus && matchesPriority;
	});

	onMount(() => {
		fetchRequests();
	});
</script>

<div class="container mx-auto p-6">
	{#if !hasAccess}
		<!-- No Access Message -->
		<Card class="max-w-md mx-auto mt-12">
			<CardContent class="py-12 text-center">
				<AlertCircle class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
				<h2 class="text-lg font-semibold mb-2">Geen toegang</h2>
				<p class="text-muted-foreground">
					Deze pagina is alleen beschikbaar voor vakdocenten en beheerders.
				</p>
				{#if $user?.labels?.includes('teacher')}
					<Button 
						class="mt-4"
						on:click={() => goto('/docent-on-demand')}
					>
						Ga naar Docent on Demand
					</Button>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<div class="flex items-center justify-between mb-6">
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Aanvragen</h1>
				<p class="text-muted-foreground">
					Beheer binnenkomende aanvragen voor workshops en lessen
				</p>
			</div>
			<button
				on:click={() => goto('/aanvragen/nieuw')}
				class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-teal-600 text-white hover:bg-teal-700 h-10 px-4 py-2"
			>
				<MailIcon class="w-4 h-4 mr-2" />
				Nieuwe aanvraag
			</button>
		</div>

	<!-- Search and Filters -->
	<Card class="mb-6">
		<CardHeader>
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4 flex-1">
					<div class="relative flex-1 max-w-sm">
						<SearchIcon class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Zoek aanvragen..."
							bind:value={searchQuery}
							class="pl-8"
						/>
					</div>
					<Button 
						variant="outline" 
						size="sm" 
						on:click={() => showFilters = !showFilters}
						class={showFilters ? 'bg-muted' : ''}
					>
						<FilterIcon class="w-4 h-4 mr-2" />
						Filters
					</Button>
				</div>
				<div class="text-sm text-muted-foreground">
					{filteredRequests.length} van {requests.length} aanvragen
				</div>
			</div>
		</CardHeader>
		{#if showFilters}
			<CardContent class="pt-0">
				<div class="flex gap-4">
					<div class="flex-1">
						<Label for="status-filter">Status</Label>
						<select 
							bind:value={statusFilter}
							class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						>
							<option value="all">Alle statussen</option>
							{#each statusOptions as status}
								<option value={status.value}>{status.label}</option>
							{/each}
						</select>
					</div>
					<div class="flex-1">
						<Label for="priority-filter">Prioriteit</Label>
						<select 
							bind:value={priorityFilter}
							class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						>
							<option value="all">Alle prioriteiten</option>
							{#each priorityOptions as priority}
								<option value={priority.value}>{priority.label}</option>
							{/each}
						</select>
					</div>
				</div>
			</CardContent>
		{/if}
	</Card>

	<!-- Success/Error Messages -->
	{#if success}
		<div class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
			{success}
		</div>
	{/if}
	
	{#if error}
		<div class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
			{error}
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
		</div>
	{:else}
		<!-- Requests Grid -->
		<div class="grid gap-4">
			{#each filteredRequests as request}
				<Card class="hover:shadow-md transition-shadow cursor-pointer" 
					  on:click={() => openRequestDialog(request)}>
					<CardContent class="p-6">
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-2">
									<h3 class="font-semibold text-lg">{request.onderwerp || 'Geen onderwerp'}</h3>
									<Badge class={`text-white ${getStatusBadgeColor(request.status)}`}>
										{statusOptions.find(s => s.value === request.status)?.label || request.status}
									</Badge>
									{#if request.prioriteit}
										<Badge variant="outline" class={getPriorityBadgeColor(request.prioriteit)}>
											{priorityOptions.find(p => p.value === request.prioriteit)?.label || request.prioriteit}
										</Badge>
									{/if}
								</div>
								<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
									<div class="flex items-center gap-1">
										<MailIcon class="w-4 h-4" />
										{request.naam} ({request.email})
									</div>
									<div class="flex items-center gap-1">
										<BuildingIcon class="w-4 h-4" />
										{request.organisatie || 'Geen organisatie'}
									</div>
									{#if request.telefoon}
										<div class="flex items-center gap-1">
											<PhoneIcon class="w-4 h-4" />
											{request.telefoon}
										</div>
									{/if}
									{#if request.aantal_deelnemers}
										<div class="flex items-center gap-1">
											<UsersIcon class="w-4 h-4" />
											{request.aantal_deelnemers} deelnemers
										</div>
									{/if}
								</div>
								{#if request.datum_voorkeur}
									<div class="flex items-center gap-1 text-sm text-muted-foreground mb-2">
										<CalendarIcon class="w-4 h-4" />
										Voorkeursdatum: {new Date(request.datum_voorkeur).toLocaleDateString('nl-NL')}
									</div>
								{/if}
								{#if request.opmerkingen}
									<p class="text-sm text-muted-foreground line-clamp-2">
										{request.opmerkingen}
									</p>
								{/if}
							</div>
							<div class="flex flex-col gap-2 ml-4">
								<Button 
									size="sm" 
									variant="outline"
									on:click={(e) => {
										e.stopPropagation();
										updateRequestStatus(request.$id, 'geaccepteerd');
									}}
									disabled={request.status === 'geaccepteerd'}
								>
									Accepteren
								</Button>
								<Button 
									size="sm" 
									variant="outline"
									on:click={(e) => {
										e.stopPropagation();
										updateRequestStatus(request.$id, 'afgewezen');
									}}
									disabled={request.status === 'afgewezen'}
								>
									Afwijzen
								</Button>
							</div>
						</div>
						<div class="text-xs text-muted-foreground mt-3 pt-3 border-t">
							Ontvangen: {new Date(request.$createdAt).toLocaleString('nl-NL')}
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>

		{#if filteredRequests.length === 0}
			<Card class="py-12">
				<CardContent class="text-center">
					<MailIcon class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
					<h3 class="text-lg font-semibold mb-2">Geen aanvragen gevonden</h3>
					<p class="text-muted-foreground">
						{requests.length === 0 ? 'Er zijn nog geen aanvragen ontvangen.' : 'Probeer je zoekfilters aan te passen.'}
					</p>
				</CardContent>
			</Card>
		{/if}

		<!-- Request Details Dialog -->
		<Dialog.Root bind:open={showRequestDialog}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Aanvraag Details</Dialog.Title>
			<Dialog.Description>
				Volledige informatie over deze aanvraag
			</Dialog.Description>
		</Dialog.Header>
		{#if selectedRequest}
			<div class="grid gap-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label>Naam</Label>
						<p class="text-sm font-medium">{selectedRequest.naam}</p>
					</div>
					<div>
						<Label>Email</Label>
						<p class="text-sm font-medium">{selectedRequest.email}</p>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label>Organisatie</Label>
						<p class="text-sm font-medium">{selectedRequest.organisatie || 'Niet opgegeven'}</p>
					</div>
					<div>
						<Label>Telefoon</Label>
						<p class="text-sm font-medium">{selectedRequest.telefoon || 'Niet opgegeven'}</p>
					</div>
				</div>
				<div>
					<Label>Onderwerp</Label>
					<p class="text-sm font-medium">{selectedRequest.onderwerp}</p>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<Label>Aantal deelnemers</Label>
						<p class="text-sm font-medium">{selectedRequest.aantal_deelnemers || 'Niet opgegeven'}</p>
					</div>
					<div>
						<Label>Voorkeursdatum</Label>
						<p class="text-sm font-medium">
							{selectedRequest.datum_voorkeur ? 
								new Date(selectedRequest.datum_voorkeur).toLocaleDateString('nl-NL') : 
								'Niet opgegeven'}
						</p>
					</div>
				</div>
				{#if selectedRequest.opmerkingen}
					<div>
						<Label>Opmerkingen</Label>
						<p class="text-sm whitespace-pre-wrap">{selectedRequest.opmerkingen}</p>
					</div>
				{/if}
				<div class="flex gap-2">
					<Badge class={`text-white ${getStatusBadgeColor(selectedRequest.status)}`}>
						{statusOptions.find(s => s.value === selectedRequest.status)?.label || selectedRequest.status}
					</Badge>
					{#if selectedRequest.prioriteit}
						<Badge variant="outline" class={getPriorityBadgeColor(selectedRequest.prioriteit)}>
							{priorityOptions.find(p => p.value === selectedRequest.prioriteit)?.label || selectedRequest.prioriteit}
						</Badge>
					{/if}
				</div>
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" on:click={() => showRequestDialog = false}>Sluiten</Button>
		</Dialog.Footer>
		</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>