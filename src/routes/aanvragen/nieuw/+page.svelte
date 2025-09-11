<script lang="ts">
	import { goto } from '$app/navigation';
	import { databases } from '$lib/appwrite';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { ArrowLeftIcon } from 'lucide-svelte';

	const databaseId = 'lessen';
	const collectionId = 'aanvragen';

	let loading = false;
	let error = '';
	let success = '';

	// Form fields
	let naam = '';
	let email = '';
	let telefoon = '';
	let organisatie = '';
	let onderwerp = '';
	let datumVoorkeur = '';
	let aantalDeelnemers = '';
	let opmerkingen = '';
	let prioriteit = 'normaal';

	const priorityOptions = [
		{ value: 'hoog', label: 'Hoog' },
		{ value: 'normaal', label: 'Normaal' },
		{ value: 'laag', label: 'Laag' }
	];

	async function submitRequest() {
		// Validation
		if (!naam.trim()) {
			error = 'Naam is verplicht';
			return;
		}
		if (!email.trim()) {
			error = 'Email is verplicht';
			return;
		}
		if (!onderwerp.trim()) {
			error = 'Onderwerp is verplicht';
			return;
		}

		// Email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			error = 'Ongeldig email adres';
			return;
		}

		loading = true;
		error = '';

		try {
			const requestData = {
				naam: naam.trim(),
				email: email.trim(),
				telefoon: telefoon.trim() || null,
				organisatie: organisatie.trim() || null,
				onderwerp: onderwerp.trim(),
				datum_voorkeur: datumVoorkeur || null,
				aantal_deelnemers: aantalDeelnemers ? parseInt(aantalDeelnemers) : null,
				opmerkingen: opmerkingen.trim() || null,
				status: 'nieuw',
				prioriteit: prioriteit
			};

			await databases.createDocument(databaseId, collectionId, 'unique()', requestData);

			success = 'Aanvraag succesvol ingediend!';
			
			// Reset form
			naam = '';
			email = '';
			telefoon = '';
			organisatie = '';
			onderwerp = '';
			datumVoorkeur = '';
			aantalDeelnemers = '';
			opmerkingen = '';
			prioriteit = 'normaal';

			// Redirect after short delay
			setTimeout(() => {
				goto('/aanvragen');
			}, 2000);

		} catch (e) {
			error = `Fout bij indienen van aanvraag: ${e}`;
			console.error('Error creating request:', e);
		} finally {
			loading = false;
		}
	}
</script>

<div class="container mx-auto p-6 max-w-2xl">
	<div class="flex items-center gap-4 mb-6">
		<Button variant="outline" size="sm" on:click={() => goto('/aanvragen')}>
			<ArrowLeftIcon class="w-4 h-4 mr-2" />
			Terug
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Nieuwe Aanvraag</h1>
			<p class="text-muted-foreground">
				Dien een nieuwe aanvraag in voor een workshop of les
			</p>
		</div>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Aanvraag Details</CardTitle>
			<CardDescription>
				Vul alle benodigde informatie in voor uw aanvraag
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Success/Error Messages -->
			{#if success}
				<div class="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
					{success}
				</div>
			{/if}
			
			{#if error}
				<div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
					{error}
				</div>
			{/if}

			<form on:submit|preventDefault={submitRequest} class="space-y-4">
				<!-- Contact Information -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label for="naam">Naam *</Label>
						<Input
							id="naam"
							bind:value={naam}
							placeholder="Uw naam"
							required
							disabled={loading}
						/>
					</div>
					<div>
						<Label for="email">Email *</Label>
						<Input
							id="email"
							type="email"
							bind:value={email}
							placeholder="uw.email@example.com"
							required
							disabled={loading}
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label for="telefoon">Telefoon</Label>
						<Input
							id="telefoon"
							bind:value={telefoon}
							placeholder="06-12345678"
							disabled={loading}
						/>
					</div>
					<div>
						<Label for="organisatie">Organisatie</Label>
						<Input
							id="organisatie"
							bind:value={organisatie}
							placeholder="School of bedrijf"
							disabled={loading}
						/>
					</div>
				</div>

				<!-- Request Details -->
				<div>
					<Label for="onderwerp">Onderwerp *</Label>
					<Input
						id="onderwerp"
						bind:value={onderwerp}
						placeholder="Onderwerp van de gewenste workshop/les"
						required
						disabled={loading}
					/>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label for="datum-voorkeur">Voorkeursdatum</Label>
						<Input
							id="datum-voorkeur"
							type="date"
							bind:value={datumVoorkeur}
							disabled={loading}
						/>
					</div>
					<div>
						<Label for="aantal-deelnemers">Aantal deelnemers</Label>
						<Input
							id="aantal-deelnemers"
							type="number"
							bind:value={aantalDeelnemers}
							placeholder="Bijv. 25"
							min="1"
							disabled={loading}
						/>
					</div>
				</div>

				<div>
					<Label for="prioriteit">Prioriteit</Label>
					<select 
						bind:value={prioriteit}
						disabled={loading}
						class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#each priorityOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<div>
					<Label for="opmerkingen">Opmerkingen</Label>
					<Textarea
						id="opmerkingen"
						bind:value={opmerkingen}
						placeholder="Aanvullende informatie, wensen of vragen..."
						rows={4}
						disabled={loading}
					/>
				</div>

				<div class="flex gap-4 pt-4">
					<Button type="submit" disabled={loading} class="bg-teal-600 hover:bg-teal-700">
						{#if loading}
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
						{/if}
						Aanvraag Indienen
					</Button>
					<Button type="button" variant="outline" on:click={() => goto('/aanvragen')} disabled={loading}>
						Annuleren
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>