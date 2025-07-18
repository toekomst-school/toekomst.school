<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { announcementActions, announcementTargets, isLoading, error } from '$lib/stores/announcements';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Loader2, Send, Save, X, Calendar, Clock, AlertTriangle } from 'lucide-svelte';
	import type { Announcement, AnnouncementCreateRequest } from '$lib/types/announcements';

	const dispatch = createEventDispatcher<{
		success: Announcement;
		cancel: void;
	}>();

	// Props
	export let announcement: Announcement | null = null;
	export let isEdit = false;

	// Form data
	let formData: AnnouncementCreateRequest = {
		title: '',
		content: '',
		targetType: 'team',
		targetId: '',
		visibility: 'all',
		priority: 'normal',
		expiresAt: '',
		scheduledAt: '',
		attachments: [],
		tags: []
	};

	// UI state
	let selectedTarget: any = null;
	let submitting = false;
	let formErrors: Record<string, string> = {};

	// Priority options
	const priorityOptions = [
		{ value: 'low', label: 'Laag', color: 'bg-gray-100 text-gray-800' },
		{ value: 'normal', label: 'Normaal', color: 'bg-blue-100 text-blue-800' },
		{ value: 'high', label: 'Hoog', color: 'bg-orange-100 text-orange-800' },
		{ value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
	];

	// Visibility options
	const visibilityOptions = [
		{ value: 'all', label: 'Iedereen' },
		{ value: 'teachers-only', label: 'Alleen leraren' },
		{ value: 'students-only', label: 'Alleen leerlingen' }
	];

	onMount(async () => {
		try {
			// Load targets
			await announcementActions.fetchTargets();

			// If editing, populate form
			if (isEdit && announcement) {
				formData = {
					title: announcement.title,
					content: announcement.content,
					targetType: announcement.targetType,
					targetId: announcement.targetId,
					visibility: announcement.visibility,
					priority: announcement.priority,
					expiresAt: announcement.expiresAt || '',
					scheduledAt: announcement.scheduledAt || '',
					attachments: announcement.attachments || [],
					tags: announcement.tags || []
				};

				// Set selected target
				selectedTarget = $announcementTargets.find(t => t.id === announcement.targetId);
			}
		} catch (error) {
			console.error('Error loading announcement form:', error);
		}
	});

	function validateForm(): boolean {
		formErrors = {};

		if (!formData.title.trim()) {
			formErrors.title = 'Titel is verplicht';
		}

		if (!formData.content.trim()) {
			formErrors.content = 'Inhoud is verplicht';
		}

		if (!formData.targetId) {
			formErrors.targetId = 'Doelgroep is verplicht';
		}

		return Object.keys(formErrors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		submitting = true;
		try {
			let result;
			if (isEdit && announcement) {
				result = await announcementActions.updateAnnouncement(announcement.$id, formData);
			} else {
				result = await announcementActions.createAnnouncement(formData);
			}

			dispatch('success', result);
		} catch (err) {
			// Error is handled by the store
		} finally {
			submitting = false;
		}
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleTargetChange(target: any) {
		selectedTarget = target;
		formData.targetId = target.id;
		formData.targetType = target.type;
	}

	function getPriorityBadgeClass(priority: string) {
		return priorityOptions.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800';
	}

	// Format datetime for input
	function formatDateTimeForInput(dateString: string): string {
		if (!dateString) return '';
		return new Date(dateString).toISOString().slice(0, 16);
	}

	function handleDateTimeChange(field: 'expiresAt' | 'scheduledAt', value: string) {
		if (value) {
			formData[field] = new Date(value).toISOString();
		} else {
			formData[field] = '';
		}
	}
</script>

<Card.Root class="w-full max-w-2xl mx-auto">
	<Card.Header>
		<Card.Title class="flex items-center gap-2">
			<Send size={20} class="text-primary" />
			{isEdit ? 'Mededeling bewerken' : 'Nieuwe mededeling'}
		</Card.Title>
	</Card.Header>

	<Card.Content class="space-y-6">
		{#if $error}
			<div class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
				{$error}
			</div>
		{/if}

		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Titel*</Label>
				<Input
					id="title"
					bind:value={formData.title}
					placeholder="Voer de titel van de mededeling in..."
					class={formErrors.title ? 'border-red-300' : ''}
				/>
				{#if formErrors.title}
					<p class="text-sm text-red-600">{formErrors.title}</p>
				{/if}
			</div>

			<!-- Content -->
			<div class="space-y-2">
				<Label for="content">Inhoud*</Label>
				<Textarea
					id="content"
					bind:value={formData.content}
					placeholder="Schrijf hier je mededeling..."
					rows={4}
					class={formErrors.content ? 'border-red-300' : ''}
				/>
				{#if formErrors.content}
					<p class="text-sm text-red-600">{formErrors.content}</p>
				{/if}
			</div>

			<!-- Target Selection -->
			<div class="space-y-2">
				<Label>Doelgroep*</Label>
				<select 
					bind:value={formData.targetId} 
					on:change={(e) => {
						const target = $announcementTargets.find(t => t.id === e.target.value);
						if (target) handleTargetChange(target);
					}}
					class="w-full h-10 px-3 py-2 border rounded-md bg-background {formErrors.targetId ? 'border-red-300' : ''}"
				>
					<option value="">Selecteer doelgroep...</option>
					{#each $announcementTargets as target}
						<option value={target.id}>
							{target.type === 'team' ? 'Team' : target.type === 'class' ? 'Klas' : 'School'}: {target.name} ({target.memberCount} leden)
						</option>
					{/each}
				</select>
				{#if formErrors.targetId}
					<p class="text-sm text-red-600">{formErrors.targetId}</p>
				{/if}
			</div>

			<!-- Priority and Visibility -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Priority -->
				<div class="space-y-2">
					<Label>Prioriteit</Label>
					<select bind:value={formData.priority} class="w-full h-10 px-3 py-2 border rounded-md bg-background">
						{#each priorityOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- Visibility -->
				<div class="space-y-2">
					<Label>Zichtbaarheid</Label>
					<select bind:value={formData.visibility} class="w-full h-10 px-3 py-2 border rounded-md bg-background">
						{#each visibilityOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Schedule and Expiry -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<!-- Scheduled At -->
				<div class="space-y-2">
					<Label for="scheduledAt" class="flex items-center gap-2">
						<Clock size={14} />
						Geplande publicatie
					</Label>
					<Input
						id="scheduledAt"
						type="datetime-local"
						value={formatDateTimeForInput(formData.scheduledAt || '')}
						on:input={(e) => handleDateTimeChange('scheduledAt', e.target.value)}
					/>
				</div>

				<!-- Expires At -->
				<div class="space-y-2">
					<Label for="expiresAt" class="flex items-center gap-2">
						<Calendar size={14} />
						Vervaldatum
					</Label>
					<Input
						id="expiresAt"
						type="datetime-local"
						value={formatDateTimeForInput(formData.expiresAt || '')}
						on:input={(e) => handleDateTimeChange('expiresAt', e.target.value)}
					/>
				</div>
			</div>

			<!-- Priority Warning -->
			{#if formData.priority === 'urgent'}
				<div class="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200">
					<AlertTriangle size={16} class="text-orange-600 mt-0.5 flex-shrink-0" />
					<div class="text-sm">
						<p class="font-medium text-orange-800">Urgente mededeling</p>
						<p class="text-orange-700">Deze mededeling krijgt hoge prioriteit en wordt prominenter weergegeven.</p>
					</div>
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex gap-3 pt-4">
				<Button type="submit" disabled={submitting} class="flex-1">
					{#if submitting}
						<Loader2 size={16} class="mr-2 animate-spin" />
					{:else}
						<Send size={16} class="mr-2" />
					{/if}
					{isEdit ? 'Bijwerken' : 'Versturen'}
				</Button>
				
				<Button type="button" variant="outline" on:click={handleCancel}>
					<X size={16} class="mr-2" />
					Annuleren
				</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>