<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { databases } from '$lib/appwrite';
	import { user } from '$lib/stores/auth.js';

	let isEditing = false;
	let editedName = '';
	let editedEmail = '';
	let editedBio = '';
	let editedPhone = '';
	let editedAddress = '';
	let editedQualifications = '';
	let editedPhoto = '';
	let saving = false;
	let saveError = '';
	let saveSuccess = false;
	let vakdocentProfile: any = null;
	let loadingVakdocentProfile = false;

	$: userRole = $user?.labels?.[0] || 'student';
	$: isVakdocent = userRole === 'vakdocent';
	$: isTeacher = userRole === 'teacher' || userRole === 'vakdocent';

	onMount(async () => {
		if ($user) {
			editedName = $user.name || '';
			editedEmail = $user.email || '';
			
			// If user is a vakdocent, try to load their team profile
			if (isVakdocent) {
				await loadVakdocentProfile();
			}
		}
	});

	async function loadVakdocentProfile() {
		if (!$user || !isVakdocent) return;
		
		loadingVakdocentProfile = true;
		try {
			// Search for vakdocent profile by email
			const response = await databases.listDocuments('lessen', 'vakdocent');
			vakdocentProfile = response.documents.find(doc => doc.email === $user.email);
			
			// If profile exists, populate fields
			if (vakdocentProfile) {
				editedBio = vakdocentProfile.bio || '';
				editedPhone = vakdocentProfile.phone || '';
				editedAddress = vakdocentProfile.address || '';
				editedQualifications = vakdocentProfile.qualifications || '';
				editedPhoto = vakdocentProfile.photo || '';
			}
		} catch (error) {
			console.error('Error loading vakdocent profile:', error);
		} finally {
			loadingVakdocentProfile = false;
		}
	}

	async function startEdit() {
		console.log('startEdit called, current isEditing:', isEditing);
		isEditing = true;
		saveError = '';
		saveSuccess = false;
		console.log('after setting, isEditing:', isEditing);
	}

	async function cancelEdit() {
		isEditing = false;
		// Reset to original values
		if ($user) {
			editedName = $user.name || '';
			editedEmail = $user.email || '';
			if (vakdocentProfile) {
				editedBio = vakdocentProfile.bio || '';
				editedPhone = vakdocentProfile.phone || '';
				editedAddress = vakdocentProfile.address || '';
				editedQualifications = vakdocentProfile.qualifications || '';
				editedPhoto = vakdocentProfile.photo || '';
			}
		}
	}

	async function saveProfile() {
		if (!$user) return;
		
		saving = true;
		saveError = '';
		saveSuccess = false;

		try {
			// For vakdocenten, save to team database
			if (isVakdocent) {
				const profileData = {
					name: editedName,
					email: editedEmail,
					bio: editedBio,
					phone: editedPhone,
					address: editedAddress,
					qualifications: editedQualifications,
					photo: editedPhoto
				};

				if (vakdocentProfile) {
					// Update existing profile
					await databases.updateDocument('lessen', 'vakdocent', vakdocentProfile.$id, profileData);
				} else {
					// Create new profile
					vakdocentProfile = await databases.createDocument('lessen', 'vakdocent', 'unique()', profileData);
				}
			}

			// Update user store (optimistic update)
			user.update(currentUser => ({
				...currentUser,
				name: editedName,
				email: editedEmail
			}));

			isEditing = false;
			saveSuccess = true;
			setTimeout(() => { saveSuccess = false; }, 3000);
		} catch (error) {
			console.error('Error saving profile:', error);
			saveError = 'Kon profiel niet opslaan. Probeer opnieuw.';
		} finally {
			saving = false;
		}
	}


	function getRoleDisplayName(role: string): string {
		switch (role) {
			case 'vakdocent': return 'Vakdocent';
			case 'teacher': return 'Docent';
			case 'student': return 'Leerling';
			default: return 'Onbekend';
		}
	}
</script>

<div class="max-w-2xl mx-auto">
	<div class="bg-card rounded-lg border p-6">
		<div class="flex items-center justify-between mb-6">
			<h1 class="text-2xl font-bold">Mijn Profiel</h1>
			{#if !isEditing}
				<button 
					class="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium"
					on:click={startEdit}
				>
					Bewerken
				</button>
			{/if}
		</div>

		{#if saveSuccess}
			<div class="mb-4 p-3 bg-green-100 border border-green-300 rounded-md text-green-800">
				Profiel succesvol opgeslagen!
			</div>
		{/if}

		{#if saveError}
			<div class="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
				{saveError}
			</div>
		{/if}

		<div class="space-y-4">
			<!-- Basic Information -->
			<div class="border-b pb-4">
				<h2 class="text-lg font-semibold mb-3">Basisinformatie</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium mb-1">Naam</label>
						{#if isEditing}
							<input 
								type="text" 
								bind:value={editedName}
								class="w-full px-3 py-2 border border-input rounded-md bg-background"
								placeholder="Volledige naam"
							/>
						{:else}
							<p class="px-3 py-2 bg-muted rounded-md">{$user?.name || 'Niet ingesteld'}</p>
						{/if}
					</div>

					<div>
						<label class="block text-sm font-medium mb-1">E-mail</label>
						{#if isEditing}
							<input 
								type="email" 
								bind:value={editedEmail}
								class="w-full px-3 py-2 border border-input rounded-md bg-background"
								placeholder="E-mailadres"
							/>
						{:else}
							<p class="px-3 py-2 bg-muted rounded-md">{$user?.email || 'Niet ingesteld'}</p>
						{/if}
					</div>

					<div>
						<label class="block text-sm font-medium mb-1">Rol</label>
						<p class="px-3 py-2 bg-muted rounded-md">{getRoleDisplayName(userRole)}</p>
					</div>
				</div>
			</div>

			<!-- Extended Information (for vakdocenten and teachers) -->
			{#if isVakdocent}
				{#if loadingVakdocentProfile}
					<div class="text-center py-4">
						<p class="text-muted-foreground">Profiel laden...</p>
					</div>
				{:else}
					<div class="border-b pb-4">
						<h2 class="text-lg font-semibold mb-3">Vakdocent Informatie</h2>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium mb-1">Telefoon</label>
								{#if isEditing}
									<input 
										type="tel" 
										bind:value={editedPhone}
										class="w-full px-3 py-2 border border-input rounded-md bg-background"
										placeholder="Telefoonnummer"
									/>
								{:else}
									<p class="px-3 py-2 bg-muted rounded-md">{editedPhone || 'Niet ingesteld'}</p>
								{/if}
							</div>

							<div>
								<label class="block text-sm font-medium mb-1">Adres</label>
								{#if isEditing}
									<input 
										type="text" 
										bind:value={editedAddress}
										class="w-full px-3 py-2 border border-input rounded-md bg-background"
										placeholder="Adres"
									/>
								{:else}
									<p class="px-3 py-2 bg-muted rounded-md">{editedAddress || 'Niet ingesteld'}</p>
								{/if}
							</div>

							<div class="md:col-span-2">
								<label class="block text-sm font-medium mb-1">Kwalificaties</label>
								{#if isEditing}
									<input 
										type="text" 
										bind:value={editedQualifications}
										class="w-full px-3 py-2 border border-input rounded-md bg-background"
										placeholder="Diploma's, certificaten, etc."
									/>
								{:else}
									<p class="px-3 py-2 bg-muted rounded-md">{editedQualifications || 'Niet ingesteld'}</p>
								{/if}
							</div>

							<div class="md:col-span-2">
								<label class="block text-sm font-medium mb-1">Bio</label>
								{#if isEditing}
									<textarea 
										bind:value={editedBio}
										rows="3"
										class="w-full px-3 py-2 border border-input rounded-md bg-background"
										placeholder="Korte beschrijving van jezelf..."
									></textarea>
								{:else}
									<p class="px-3 py-2 bg-muted rounded-md min-h-[80px]">{editedBio || 'Niet ingesteld'}</p>
								{/if}
							</div>

							<div class="md:col-span-2">
								<label class="block text-sm font-medium mb-1">Foto (URL)</label>
								{#if isEditing}
									<input 
										type="url" 
										bind:value={editedPhoto}
										class="w-full px-3 py-2 border border-input rounded-md bg-background"
										placeholder="Link naar profielfoto"
									/>
									{#if editedPhoto}
										<img 
											src={editedPhoto} 
											alt="Profielfoto preview" 
											class="mt-2 w-24 h-24 object-cover rounded-lg"
										/>
									{/if}
								{:else}
									<div class="flex items-center gap-4">
										<p class="px-3 py-2 bg-muted rounded-md flex-1">{editedPhoto || 'Niet ingesteld'}</p>
										{#if editedPhoto}
											<img 
												src={editedPhoto} 
												alt="Profielfoto" 
												class="w-16 h-16 object-cover rounded-lg"
											/>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			{/if}

			<!-- Action Buttons -->
			{#if isEditing}
				<div class="flex gap-2 pt-4">
					<button 
						class="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium disabled:opacity-50"
						on:click={saveProfile} 
						disabled={saving}
					>
						{saving ? 'Opslaan...' : 'Opslaan'}
					</button>
					<button 
						class="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md font-medium disabled:opacity-50"
						on:click={cancelEdit} 
						disabled={saving}
					>
						Annuleren
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Additional Information for Teachers -->
	{#if isTeacher}
		<div class="mt-6 bg-card rounded-lg border p-6">
			<h2 class="text-lg font-semibold mb-3">Team Informatie</h2>
			<p class="text-muted-foreground mb-4">
				{#if isVakdocent}
					Als vakdocent kun je je volledige profiel beheren en wordt je informatie getoond aan andere teamleden.
				{:else}
					Als docent kun je de vakdocenten in het team bekijken via de Team pagina.
				{/if}
			</p>
			<button 
				class="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md font-medium"
				on:click={() => goto('/team')}
			>
				Ga naar Team
			</button>
		</div>
	{/if}
</div>