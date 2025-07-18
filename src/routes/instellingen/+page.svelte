<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { locale } from 'svelte-i18n';
	import { supportedLocales, setLanguage, saveLanguageToProfile, getLanguageFromUser } from '$lib/i18n/utils';
	import { user } from '$lib/stores/auth.js';
	import { teamStore } from '$lib/stores/team.js';
	import { account } from '$lib/appwrite';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Globe, Bell, Eye, Shield, Download, Users } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let currentLanguage = $locale;
	let notifications = true;
	let emailNotifications = true;
	let dataCollection = false;
	let autoSave = true;
	let isSaving = false;
	let hasUnsavedChanges = false;
	let selectedTeamId: string | null = null;
	let loadingTeams = false;

	onMount(async () => {
		try {
			// Reload latest user data from server
			const freshUser = await account.get();
			console.log('Fresh user profile:', freshUser);
			console.log('Fresh user preferences:', freshUser.prefs);
			
			const prefs = freshUser.prefs || {};
			currentLanguage = getLanguageFromUser(freshUser);
			notifications = prefs.notifications ?? true;
			emailNotifications = prefs.emailNotifications ?? true;
			dataCollection = prefs.dataCollection ?? false;
			autoSave = prefs.autoSave ?? true;
			selectedTeamId = prefs.selectedTeamId || null;
			
			// Load teams if user has access
			await loadTeams();
		} catch (error) {
			console.error('Error loading fresh user settings:', error);
			// Fallback to existing user store if fetch fails
			if ($user) {
				console.log('Falling back to cached user profile:', $user);
				const prefs = $user.prefs || {};
				currentLanguage = getLanguageFromUser($user);
				notifications = prefs.notifications ?? true;
				emailNotifications = prefs.emailNotifications ?? true;
				dataCollection = prefs.dataCollection ?? false;
				autoSave = prefs.autoSave ?? true;
				selectedTeamId = prefs.selectedTeamId || null;
				
				// Load teams if user has access
				await loadTeams();
			}
		}
	});

	async function loadTeams() {
		if (!$user) return;
		
		loadingTeams = true;
		try {
			const response = await fetch(`/api/teams?userId=${$user.$id}`);
			const data = await response.json();
			
			if (data.success && data.teams) {
				teamStore.setTeams(data.teams);
			}
		} catch (error) {
			console.error('Error loading teams:', error);
		} finally {
			loadingTeams = false;
		}
	}

	function handleLanguageChange(value: string) {
		console.log('Selected language:', value);
		currentLanguage = value;
		hasUnsavedChanges = true;
	}

	function handleTeamChange(value: string) {
		selectedTeamId = value;
		hasUnsavedChanges = true;
	}


	async function saveAllSettings() {
		alert('Save button clicked!');
		console.log('Save button clicked');
		console.log('User:', $user);
		console.log('Has unsaved changes:', hasUnsavedChanges);
		
		if (!$user) {
			console.error('No user found');
			return;
		}
		
		isSaving = true;
		try {
			const settings = {
				locale: currentLanguage,
				notifications,
				emailNotifications,
				dataCollection,
				autoSave,
				selectedTeamId
			};
			
			console.log('Current user before save:', $user);
			console.log('Saving settings to prefs:', settings);
			
			await account.updatePrefs(settings);
			console.log('Settings saved successfully to Appwrite user prefs');
			
			// Refresh user data to see updated prefs
			const updatedUser = await account.get();
			console.log('Updated user profile:', updatedUser);
			console.log('Updated user preferences:', updatedUser.prefs);
			
			// Apply settings after successful save
			setLanguage(currentLanguage);
			
			hasUnsavedChanges = false;
			console.log('Settings applied');
		} catch (error) {
			console.error('Failed to save settings:', error);
			alert($_('settings.save_error') + ': ' + error.message);
		} finally {
			isSaving = false;
		}
	}

	function exportData() {
		// Placeholder for data export functionality
		alert('Export data functionality not yet implemented');
	}

	// Track changes on individual settings
	function handleSettingChange() {
		console.log('Setting changed, marking as unsaved');
		hasUnsavedChanges = true;
	}
</script>

<div class="container mx-auto py-8 px-4 max-w-4xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground mb-2">
			{$_('settings.title')}
		</h1>
		<p class="text-muted-foreground">
			{$_('settings.description')}
		</p>
	</div>

	<div class="space-y-6">
		<!-- Language Settings -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Globe size={20} />
					{$_('settings.language.title')}
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<Label>{$_('settings.language.label')}</Label>
						<p class="text-sm text-gray-600 dark:text-gray-300">
							{$_('settings.language.description')}
						</p>
					</div>
					<Select.Root type="single" bind:value={currentLanguage} onValueChange={handleLanguageChange}>
						<Select.Trigger class="w-48">
							{supportedLocales.find(lang => lang.code === currentLanguage)?.flag} {supportedLocales.find(lang => lang.code === currentLanguage)?.name || "Select language"}
						</Select.Trigger>
						<Select.Content>
							{#each supportedLocales as lang}
								<Select.Item value={lang.code}>
									{lang.flag} {lang.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</CardContent>
		</Card>

		<!-- Team Settings -->
		{#if $teamStore.teams.length > 1}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Users size={20} />
					Standaard Team
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<Label>Selecteer je standaard team</Label>
						<p class="text-sm text-gray-600 dark:text-gray-300">
							Dit team wordt automatisch geselecteerd wanneer je de applicatie opent
						</p>
					</div>
					{#if loadingTeams}
						<div class="w-48 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
					{:else}
						<Select.Root type="single" bind:value={selectedTeamId} onValueChange={handleTeamChange}>
							<Select.Trigger class="w-48">
								{$teamStore.teams.find(team => team.$id === selectedTeamId)?.name || "Selecteer een team"}
							</Select.Trigger>
							<Select.Content>
								{#each $teamStore.teams as team}
									<Select.Item value={team.$id}>
										{team.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{/if}
				</div>
			</CardContent>
		</Card>
		{/if}

		<!-- Notification Settings -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Bell size={20} />
					{$_('settings.notifications.title')}
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<Label>{$_('settings.notifications.push_notifications')}</Label>
						<p class="text-sm text-gray-600 dark:text-gray-300">
							{$_('settings.notifications.push_description')}
						</p>
					</div>
					<Switch bind:checked={notifications} onCheckedChange={handleSettingChange} class="bg-gray-200 dark:bg-gray-700" />
				</div>
				
				<Separator />
				
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<Label>{$_('settings.notifications.email_notifications')}</Label>
						<p class="text-sm text-gray-600 dark:text-gray-300">
							{$_('settings.notifications.email_description')}
						</p>
					</div>
					<Switch bind:checked={emailNotifications} onCheckedChange={handleSettingChange} class="bg-gray-200 dark:bg-gray-700" />
				</div>
			</CardContent>
		</Card>

		<!-- Privacy Settings -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Shield size={20} />
					{$_('settings.privacy.title')}
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<Label>{$_('settings.privacy.data_collection')}</Label>
						<p class="text-sm text-gray-600 dark:text-gray-300">
							{$_('settings.privacy.data_collection_description')}
						</p>
					</div>
					<Switch bind:checked={dataCollection} onCheckedChange={handleSettingChange} class="bg-gray-200 dark:bg-gray-700" />
				</div>
			</CardContent>
		</Card>

		<!-- Data Management -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Download size={20} />
					{$_('settings.data.title')}
				</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<Label>{$_('settings.data.auto_save')}</Label>
						<p class="text-sm text-gray-600 dark:text-gray-300">
							{$_('settings.data.auto_save_description')}
						</p>
					</div>
					<Switch bind:checked={autoSave} onCheckedChange={handleSettingChange} class="bg-gray-200 dark:bg-gray-700" />
				</div>
				
				<Separator />
				
				<div class="flex items-center justify-between">
					<div class="space-y-1">
						<Label>{$_('settings.data.export_data')}</Label>
						<p class="text-sm text-gray-600 dark:text-gray-300">
							{$_('settings.data.export_description')}
						</p>
					</div>
					<Button variant="outline" on:click={exportData}>
						<Download size={16} class="mr-2" />
						{$_('settings.data.export_button')}
					</Button>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Save Button -->
	<div class="flex justify-end mt-8 pt-4 border-t">
		<button 
			on:click={saveAllSettings}
			disabled={!hasUnsavedChanges || isSaving}
			class="min-w-32 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
		>
			{#if isSaving}
				{$_('settings.saving')}...
			{:else}
				{$_('settings.save')}
			{/if}
		</button>
	</div>
</div>