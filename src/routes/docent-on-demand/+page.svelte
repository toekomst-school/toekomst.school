<script lang="ts">
	import { onMount } from 'svelte';
	import { databases } from '$lib/appwrite';
	import { user } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { Query } from 'appwrite';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import SvelteSelect from 'svelte-select';
	import { DatePicker } from '$lib/components/ui/date-picker/index.js';
	import { CalendarIcon, UserPlus, Clock, Users } from 'lucide-svelte';

	const databaseId = 'lessen';
	const requestsCollectionId = 'aanvragen';
	const lessonsCollectionId = 'les';
	const schoolsCollectionId = 'school';

	// Check if user is a teacher
	$: isTeacher = $user?.labels?.includes('teacher');
	$: if (!isTeacher && $user) {
		// Redirect non-teachers to appropriate page
		goto('/');
	}

	let loading = false;
	let error = '';
	let success = '';
	let myRequests: any[] = [];
	let loadingRequests = true;
	
	// Form state
	let workshopOptions: any[] = [];
	let selectedWorkshops: any[] = [];
	let preferredDate: Date | null = null;
	let numberOfSessions = 1;
	let numberOfStudents = '';
	let classGroup = '';
	let additionalInfo = '';
	let urgency = 'normaal';
	
	// User school info
	let userSchool: any = null;

	// Urgency options
	const urgencyOptions = [
		{ value: 'hoog', label: 'Urgent (binnen 1 week)' },
		{ value: 'normaal', label: 'Normaal (2-4 weken)' },
		{ value: 'laag', label: 'Flexibel (1-2 maanden)' }
	];

	async function loadWorkshops() {
		try {
			const response = await databases.listDocuments(databaseId, lessonsCollectionId, [
				Query.orderAsc('name')
			]);
			workshopOptions = response.documents.map(doc => ({
				value: doc.$id,
				label: doc.name
			}));
		} catch (e) {
			console.error('Error loading workshops:', e);
		}
	}

	async function loadUserSchool() {
		if (!$user?.prefs?.school) return;
		
		try {
			userSchool = await databases.getDocument(databaseId, schoolsCollectionId, $user.prefs.school);
		} catch (e) {
			console.error('Error loading school info:', e);
		}
	}

	async function loadMyRequests() {
		loadingRequests = true;
		try {
			const response = await databases.listDocuments(databaseId, requestsCollectionId, [
				Query.equal('user_id', [$user.$id]),
				Query.orderDesc('$createdAt')
			]);
			myRequests = response.documents;
		} catch (e) {
			console.error('Error loading requests:', e);
		} finally {
			loadingRequests = false;
		}
	}

	async function submitRequest() {
		if (!selectedWorkshops.length) {
			error = 'Selecteer minimaal één workshop';
			return;
		}
		if (!preferredDate) {
			error = 'Selecteer een voorkeursdatum';
			return;
		}
		if (!classGroup.trim()) {
			error = 'Vul de klas/groep in';
			return;
		}
		if (!numberOfStudents.trim()) {
			error = 'Vul het aantal leerlingen in';
			return;
		}

		loading = true;
		error = '';

		try {
			const requestData = {
				// Contact info from user profile
				naam: $user.name,
				email: $user.email,
				telefoon: $user.prefs?.phone || null,
				organisatie: userSchool?.name || $user.prefs?.schoolName || 'Onbekende school',
				
				// Request details
				request_type: 'docent_on_demand',
				requester_role: 'teacher',
				user_id: $user.$id,
				school_id: $user.prefs?.school || null,
				
				// Workshop details
				onderwerp: selectedWorkshops.map(w => w.label).join(', '),
				workshop_ids: selectedWorkshops.map(w => w.value),
				datum_voorkeur: preferredDate.toISOString(),
				aantal_sessies: numberOfSessions,
				aantal_deelnemers: parseInt(numberOfStudents),
				groep: classGroup,
				
				// Additional info
				opmerkingen: additionalInfo,
				prioriteit: urgency,
				status: 'nieuw'
			};

			await databases.createDocument(databaseId, requestsCollectionId, 'unique()', requestData);

			success = 'Aanvraag succesvol ingediend! Een vakdocent zal spoedig contact met je opnemen.';
			
			// Reset form
			selectedWorkshops = [];
			preferredDate = null;
			numberOfSessions = 1;
			numberOfStudents = '';
			classGroup = '';
			additionalInfo = '';
			urgency = 'normaal';
			
			// Reload requests
			await loadMyRequests();
			
		} catch (e) {
			error = `Fout bij indienen van aanvraag: ${e}`;
			console.error('Error creating request:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadWorkshops();
		loadUserSchool();
		loadMyRequests();
	});

	// Status color helper
	function getStatusColor(status: string) {
		switch (status) {
			case 'nieuw': return 'bg-blue-500';
			case 'in_behandeling': return 'bg-yellow-500';
			case 'geaccepteerd': return 'bg-green-500';
			case 'afgewezen': return 'bg-red-500';
			default: return 'bg-gray-500';
		}
	}
</script>

<div class="container mx-auto p-6 max-w-4xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
			<UserPlus class="w-8 h-8 text-teal-600" />
			Docent on Demand
		</h1>
		<p class="text-muted-foreground mt-2">
			Vraag een vakdocent aan voor je klas. Vul het formulier in en wij zorgen voor de rest!
		</p>
	</div>

	{#if !isTeacher}
		<Card>
			<CardContent class="py-12 text-center">
				<p class="text-muted-foreground">
					Deze pagina is alleen beschikbaar voor docenten.
				</p>
			</CardContent>
		</Card>
	{:else}
		<!-- Request Form -->
		<Card class="mb-8">
			<CardHeader>
				<CardTitle>Nieuwe Aanvraag</CardTitle>
				<CardDescription>
					Vraag een vakdocent aan voor workshops in je klas
				</CardDescription>
			</CardHeader>
			<CardContent>
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

				<form on:submit|preventDefault={submitRequest} class="space-y-4">
					<!-- School Info (Read-only) -->
					<div class="p-4 bg-muted rounded-lg">
						<p class="text-sm font-medium">School: {userSchool?.name || 'Onbekende school'}</p>
						<p class="text-sm text-muted-foreground">Docent: {$user.name}</p>
					</div>

					<!-- Workshop Selection -->
					<div>
						<Label for="workshops">Welke workshop(s) wil je aanvragen? *</Label>
						<SvelteSelect
							items={workshopOptions}
							bind:value={selectedWorkshops}
							multiple={true}
							placeholder="Selecteer één of meerdere workshops..."
							--list-background="var(--background)"
							--item-hover-color="var(--color-digital-amber)"
						/>
					</div>

					<!-- Date and Sessions -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label for="date">Voorkeursdatum *</Label>
							<DatePicker bind:value={preferredDate} placeholder="Selecteer datum..." />
						</div>
						<div>
							<Label for="sessions">Aantal sessies</Label>
							<Input
								id="sessions"
								type="number"
								bind:value={numberOfSessions}
								min="1"
								max="10"
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Class Details -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label for="group">Klas/Groep *</Label>
							<Input
								id="group"
								bind:value={classGroup}
								placeholder="Bijv. 2A, Groep 7"
								required
								disabled={loading}
							/>
						</div>
						<div>
							<Label for="students">Aantal leerlingen *</Label>
							<Input
								id="students"
								type="number"
								bind:value={numberOfStudents}
								placeholder="Bijv. 25"
								min="1"
								required
								disabled={loading}
							/>
						</div>
					</div>

					<!-- Urgency -->
					<div>
						<Label for="urgency">Urgentie</Label>
						<select 
							bind:value={urgency}
							disabled={loading}
							class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#each urgencyOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<!-- Additional Info -->
					<div>
						<Label for="info">Aanvullende informatie</Label>
						<Textarea
							id="info"
							bind:value={additionalInfo}
							placeholder="Bijzonderheden, specifieke wensen, beschikbare lokalen..."
							rows={3}
							disabled={loading}
						/>
					</div>

					<Button type="submit" disabled={loading} class="w-full bg-teal-600 hover:bg-teal-700">
						{#if loading}
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
						{/if}
						Aanvraag Indienen
					</Button>
				</form>
			</CardContent>
		</Card>

		<!-- My Requests -->
		<Card>
			<CardHeader>
				<CardTitle>Mijn Aanvragen</CardTitle>
				<CardDescription>
					Overzicht van je ingediende aanvragen
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if loadingRequests}
					<div class="flex justify-center py-8">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
					</div>
				{:else if myRequests.length === 0}
					<p class="text-center text-muted-foreground py-8">
						Je hebt nog geen aanvragen ingediend.
					</p>
				{:else}
					<div class="space-y-4">
						{#each myRequests as request}
							<div class="border rounded-lg p-4">
								<div class="flex items-start justify-between mb-2">
									<h4 class="font-semibold">{request.onderwerp}</h4>
									<Badge class={`text-white ${getStatusColor(request.status)}`}>
										{request.status === 'nieuw' ? 'Nieuw' :
										 request.status === 'in_behandeling' ? 'In behandeling' :
										 request.status === 'geaccepteerd' ? 'Geaccepteerd' :
										 request.status === 'afgewezen' ? 'Afgewezen' : request.status}
									</Badge>
								</div>
								<div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
									<div class="flex items-center gap-1">
										<CalendarIcon class="w-4 h-4" />
										{new Date(request.datum_voorkeur).toLocaleDateString('nl-NL')}
									</div>
									<div class="flex items-center gap-1">
										<Users class="w-4 h-4" />
										{request.groep} ({request.aantal_deelnemers} leerlingen)
									</div>
									<div class="flex items-center gap-1">
										<Clock class="w-4 h-4" />
										{request.aantal_sessies} sessie{request.aantal_sessies > 1 ? 's' : ''}
									</div>
								</div>
								{#if request.assigned_vakdocent}
									<div class="mt-2 text-sm">
										<span class="font-medium">Toegewezen vakdocent:</span> {request.assigned_vakdocent_name}
									</div>
								{/if}
								<div class="text-xs text-muted-foreground mt-2">
									Ingediend: {new Date(request.$createdAt).toLocaleString('nl-NL')}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>