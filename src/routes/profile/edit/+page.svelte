<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { databases } from '$lib/appwrite';
	import { user } from '$lib/stores/auth.js';
	import { ArrowLeft } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

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
			isEditing = true; // Always start in edit mode
			
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


	async function cancelEdit() {
		// Go back to profile instead of just canceling
		goBack();
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

			saveSuccess = true;
			// Redirect back to profile after a short delay
			setTimeout(() => { 
				saveSuccess = false;
				if ($user?.$id) {
					goto(`/profile/${$user.$id}`);
				}
			}, 2000);
		} catch (error) {
			console.error('Error saving profile:', error);
			saveError = $_('profile.save_error');
		} finally {
			saving = false;
		}
	}


	function getRoleDisplayName(role: string): string {
		switch (role) {
			case 'vakdocent': return $_('role.vakdocent');
			case 'teacher': return $_('role.teacher');
			case 'student': return $_('role.student');
			default: return $_('role.unknown');
		}
	}

	function goBack() {
		// Go back to user's profile page
		if ($user?.$id) {
			goto(`/profile/${$user.$id}`);
		} else {
			history.back();
		}
	}
</script>

<svelte:head>
	<title>{$_('profile.edit_title')} - Toekomst.school</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	<!-- Header with back button -->
	<div class="flex items-center justify-between mb-6">
		<button class="back-button" on:click={goBack}>
			<ArrowLeft size={20} />
			{$_('profile.back_to_profile')}
		</button>
	</div>
	<div class="bg-card rounded-lg border p-6">
		<div class="mb-6">
			<h1 class="text-2xl font-bold">{$_('profile.edit_title')}</h1>
		</div>

		{#if saveSuccess}
			<div class="mb-4 p-3 bg-green-100 border border-green-300 rounded-md text-green-800">
				{$_('profile.save_success')}
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
				<h2 class="text-lg font-semibold mb-3">{$_('profile.basic_info')}</h2>
				
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium mb-1">{$_('profile.name')}</label>
						<input 
							type="text" 
							bind:value={editedName}
							class="w-full px-3 py-2 border border-input rounded-md bg-background"
							placeholder={$_('profile.full_name')}
						/>
					</div>

					<div>
						<label class="block text-sm font-medium mb-1">{$_('profile.email')}</label>
						<input 
							type="email" 
							bind:value={editedEmail}
							class="w-full px-3 py-2 border border-input rounded-md bg-background"
							placeholder={$_('profile.email_address')}
						/>
					</div>

					<div>
						<label class="block text-sm font-medium mb-1">{$_('profile.role')}</label>
						<p class="px-3 py-2 bg-muted rounded-md">{getRoleDisplayName(userRole)}</p>
					</div>
				</div>
			</div>

			<!-- Extended Information (for vakdocenten and teachers) -->
			{#if isVakdocent}
				{#if loadingVakdocentProfile}
					<div class="text-center py-4">
						<p class="text-muted-foreground">{$_('messages.loading')}</p>
					</div>
				{:else}
					<div class="border-b pb-4">
						<h2 class="text-lg font-semibold mb-3">{$_('profile.vakdocent_info')}</h2>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium mb-1">{$_('profile.phone')}</label>
								<input 
									type="tel" 
									bind:value={editedPhone}
									class="w-full px-3 py-2 border border-input rounded-md bg-background"
									placeholder={$_('profile.phone_number')}
								/>
							</div>

							<div>
								<label class="block text-sm font-medium mb-1">{$_('profile.address')}</label>
								<input 
									type="text" 
									bind:value={editedAddress}
									class="w-full px-3 py-2 border border-input rounded-md bg-background"
									placeholder={$_('profile.address')}
								/>
							</div>

							<div class="md:col-span-2">
								<label class="block text-sm font-medium mb-1">{$_('profile.qualifications')}</label>
								<input 
									type="text" 
									bind:value={editedQualifications}
									class="w-full px-3 py-2 border border-input rounded-md bg-background"
									placeholder={$_('profile.qualifications_placeholder')}
								/>
							</div>

							<div class="md:col-span-2">
								<label class="block text-sm font-medium mb-1">{$_('profile.bio')}</label>
								<textarea 
									bind:value={editedBio}
									rows="3"
									class="w-full px-3 py-2 border border-input rounded-md bg-background"
									placeholder={$_('profile.bio_placeholder')}
								></textarea>
							</div>

							<div class="md:col-span-2">
								<label class="block text-sm font-medium mb-1">{$_('profile.photo_url')}</label>
								<input 
									type="url" 
									bind:value={editedPhoto}
									class="w-full px-3 py-2 border border-input rounded-md bg-background"
									placeholder={$_('profile.photo_url_placeholder')}
								/>
								{#if editedPhoto}
									<img 
										src={editedPhoto} 
										alt={$_('profile.photo_preview')} 
										class="mt-2 w-24 h-24 object-cover rounded-lg"
									/>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-2 pt-4">
				<button 
					class="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium disabled:opacity-50"
					on:click={saveProfile} 
					disabled={saving}
				>
					{saving ? $_('messages.saving') : $_('forms.save')}
				</button>
				<button 
					class="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md font-medium disabled:opacity-50"
					on:click={cancelEdit} 
					disabled={saving}
				>
					{$_('forms.cancel')}
				</button>
			</div>
		</div>
	</div>

</div>

<style>
	.back-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: none;
		border: 1px solid var(--border);
		color: var(--foreground);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.back-button:hover {
		background: var(--muted);
	}
</style>