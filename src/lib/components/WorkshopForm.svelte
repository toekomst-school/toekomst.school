<script context="module" lang="ts">
	export interface Option {
		value: string | number;
		label: string;
	}
	export interface Session {
		start: string;
		end: string;
		title?: string;
		type: 'session' | 'break';
		duration?: number;
		lesson?: string;
		group?: string;
	}
	
	export interface WorkshopFormValues {
		lesson?: string;
		school?: string;
		group?: string;
		teacher?: string;
		length?: number;
		materialen?: string;
		status?: string;
		description?: string;
		start?: string;
		sessions?: Session[];
		totalDuration?: number;
		eventType?: 'schooldag' | 'event';
		title?: string;
		assignedTeams?: string[];
	}
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SvelteSelect from 'svelte-select';
	import { DatePicker } from '$lib/components/ui/date-picker/index.js';
	import { TimePicker } from '$lib/components/ui/time-picker/index.js';
	import Switch from "$lib/components/ui/switch/switch.svelte";
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import X from '@lucide/svelte/icons/x';
	import { teamStore } from '$lib/stores/team.js';

	export let lessonOptions: Option[] = [];
	export let schoolOptions: Option[] = [];
	export let groupOptions: Option[] = [];
	export let teacherOptions: Option[] = [];
	export let statusOptions: Option[] = [];
	export let teamOptions: Option[] = [];
	export let isEdit: boolean = false;
	export let initialValues: WorkshopFormValues = {};

	// Form fields
	export let selectedSchool: Option | null = null;
	export let selectedTeacher: Option | null = null;
	export let lessonLength: number = 45;
	export let materialen: string = '';
	export let status: string = 'concept';
	export let description: string = '';
	export let editEventStart: Date | null = null;
	export let startTime: { hour: number; minute: number } | undefined = undefined;
	export let sessions: Session[] = [];
	export let eventType: 'schooldag' | 'event' = 'schooldag';
	export let title: string = '';
	export let selectedTeams: Option[] = [];
	
	let switchChecked = false;
	let teamSelectOpen = false;

	const dispatch = createEventDispatcher();

	$: if (initialValues && Object.keys(initialValues).length > 0) {
		selectedSchool = schoolOptions.find((opt) => opt.value === initialValues.school) || null;
		selectedTeacher = teacherOptions.find((opt) => opt.value === initialValues.teacher) || null;
		lessonLength = initialValues.length ?? 45;
		materialen = initialValues.materialen ?? '';
		status = initialValues.status ?? 'concept';
		description = initialValues.description ?? '';
		editEventStart = initialValues.start ? new Date(initialValues.start) : null;
		sessions = initialValues.sessions ?? [];
		eventType = initialValues.eventType ?? 'schooldag';
		title = initialValues.title ?? '';
		switchChecked = (initialValues.eventType ?? 'schooldag') === 'event';
		
		// Initialize selected teams
		if (initialValues.assignedTeams && teamOptions.length > 0) {
			selectedTeams = teamOptions.filter(opt => initialValues.assignedTeams?.includes(opt.value as string));
		}
	}
	
	// Auto-select default team for new workshops (when no initial values)
	$: if (!isEdit && teamOptions.length > 0 && selectedTeams.length === 0 && $teamStore.selectedTeam) {
		const defaultTeam = teamOptions.find(opt => opt.value === $teamStore.selectedTeam?.$id);
		if (defaultTeam) {
			selectedTeams = [defaultTeam];
		}
	}

	// Update eventType when switch changes
	$: eventType = switchChecked ? 'event' : 'schooldag';

	$: endTime = (() => {
		if (sessions.length === 0) return '';
		const lastSession = sessions[sessions.length - 1];
		if (!lastSession.end) return '';
		return new Date(lastSession.end).toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' });
	})();
	
	$: totalDuration = sessions
		.filter(s => s.type === 'session')
		.reduce((total, session) => total + (session.duration || 0), 0);

	// Initialize with default sessions when start date is set
	$: if (sessions.length === 0 && editEventStart instanceof Date) {
		// Initialize startTime if not set
		if (!startTime) {
			startTime = { hour: 8, minute: 30 };
		}
		
		// Create date in local timezone, not UTC
		const year = editEventStart.getFullYear();
		const month = editEventStart.getMonth();
		const day = editEventStart.getDate();
		
		const workshopStartDate = new Date(year, month, day, startTime.hour, startTime.minute, 0, 0);
		
		const prepStartDate = new Date(workshopStartDate.getTime() - 30 * 60000); // 30 min before
		const sessionEndDate = new Date(workshopStartDate.getTime() + 90 * 60000);
		
		sessions = [
			{
				start: toLocalISOString(prepStartDate),
				end: toLocalISOString(workshopStartDate),
				type: 'session',
				title: 'Voorbereiding op locatie',
				duration: 30
				// No lesson or group for preparation
			},
			{
				start: toLocalISOString(workshopStartDate),
				end: toLocalISOString(sessionEndDate),
				type: 'session',
				title: 'Sessie 1',
				duration: 90
				// lesson and group will be set per session
			}
		];
	}
	
	// Track if we're updating to prevent infinite loops
	let isUpdating = false;
	
	// Update session times when start date, time, or session durations change
	$: if (editEventStart instanceof Date && startTime && sessions.length > 0 && !isUpdating) {
		updateSessionTimes();
	}

	function addSession() {
		const lastSession = sessions[sessions.length - 1];
		const startTime = lastSession?.end || (editEventStart instanceof Date ? editEventStart.toISOString() : null);
		
		if (!startTime) return;
		
		// Find the last actual session to copy lesson, group, and duration from
		const lastActualSession = sessions.filter(s => s.type === 'session').pop();
		
		// Add a 15-minute break after the last session
		const breakStart = startTime;
		const breakEnd = toLocalISOString(new Date(new Date(breakStart).getTime() + 15 * 60000));
		
		// Get duration from last session, default to 90 if none exists
		const sessionDuration = lastActualSession?.duration || 90;
		
		// Add new session after the break
		const sessionStart = breakEnd;
		const sessionEnd = toLocalISOString(new Date(new Date(sessionStart).getTime() + sessionDuration * 60000));
		
		// Count actual sessions (not preparation)
		const actualSessionCount = sessions.filter(s => s.type === 'session' && s.title !== 'Voorbereiding op locatie').length;
		
		sessions = [
			...sessions,
			{
				start: breakStart,
				end: breakEnd,
				type: 'break',
				title: 'Pauze',
				duration: 15
			},
			{
				start: sessionStart,
				end: sessionEnd,
				type: 'session',
				title: `Sessie ${actualSessionCount + 1}`,
				duration: sessionDuration,
				lesson: lastActualSession?.lesson,
				group: lastActualSession?.group
			}
		];
	}

	function removeSession(index: number) {
		// Find the session being removed
		const sessionToRemove = sessions[index];
		
		if (sessionToRemove.type === 'session') {
			// Look for a break immediately before this session
			const breakIndex = index - 1;
			if (breakIndex >= 0 && sessions[breakIndex].type === 'break') {
				// Remove both the break and the session
				sessions = sessions.filter((_, i) => i !== breakIndex && i !== index);
			} else {
				// Just remove the session
				sessions = sessions.filter((_, i) => i !== index);
			}
		} else {
			// If removing a break, just remove it
			sessions = sessions.filter((_, i) => i !== index);
		}
		
		// Recalculate times for remaining sessions
		updateSessionTimes();
	}

	function updateSessionTimes() {
		if (sessions.length === 0 || !(editEventStart instanceof Date) || !startTime || isUpdating) {
			return;
		}
		
		isUpdating = true;
		
		// Create the actual workshop start time from date + time picker in local timezone
		const year = editEventStart.getFullYear();
		const month = editEventStart.getMonth();
		const day = editEventStart.getDate();
		const workshopStartTime = new Date(year, month, day, startTime.hour, startTime.minute, 0, 0);
		
		// If first session is preparation, start 30 minutes before the workshop time
		let currentTime = sessions[0].title === 'Voorbereiding op locatie' 
			? toLocalISOString(new Date(workshopStartTime.getTime() - 30 * 60000))
			: toLocalISOString(workshopStartTime);
		
		sessions = sessions.map(session => {
			const start = currentTime;
			const endDate = new Date(new Date(start).getTime() + (session.duration || 0) * 60000);
			const end = toLocalISOString(endDate);
			currentTime = end;
			return { ...session, start, end };
		});
		
		// Reset the flag after a short delay to allow reactivity to settle
		setTimeout(() => {
			isUpdating = false;
		}, 10);
	}

	function updateSessionDuration(index: number, duration: number) {
		sessions[index].duration = duration;
		sessions = [...sessions];
	}

	function updateSessionLesson(index: number, lessonValue: string | number | undefined) {
		if (sessions[index].type === 'session') {
			sessions[index].lesson = lessonValue?.toString();
			sessions = [...sessions];
		}
	}

	function updateSessionGroup(index: number, groupValue: string | undefined) {
		if (sessions[index].type === 'session') {
			sessions[index].group = groupValue;
			sessions = [...sessions];
		}
	}

	$: totalSessionTimeFormatted = (() => {
		const hours = Math.floor(totalDuration / 60);
		const minutes = totalDuration % 60;
		
		if (hours === 0) {
			return `${minutes} minuten`;
		} else if (minutes === 0) {
			return `${hours} ${hours === 1 ? 'uur' : 'uur'}`;
		} else {
			return `${hours} ${hours === 1 ? 'uur' : 'uur'} en ${minutes} ${minutes === 1 ? 'minuut' : 'minuten'}`;
		}
	})();


	// Helper function to create local timezone ISO string
	function toLocalISOString(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
	}

	// Computed start and end times from sessions
	$: computedStart = sessions.length > 0 ? sessions[0].start : (editEventStart instanceof Date ? toLocalISOString(editEventStart) : '');
	$: computedEnd = sessions.length > 0 ? sessions[sessions.length - 1].end : (editEventStart instanceof Date ? toLocalISOString(editEventStart) : '');

	function handleSubmit(e: Event) {
		e.preventDefault();
		dispatch('submit', {
			selectedSchool: selectedSchool ? selectedSchool.value : '',
			selectedTeacher: selectedTeacher ? selectedTeacher.value : '',
			lessonLength,
			materialen,
			status,
			description,
			editEventStart: editEventStart instanceof Date ? editEventStart.toISOString() : '',
			sessions,
			totalDuration: totalDuration,
			eventType,
			title,
			computedStart,
			computedEnd,
			assignedTeams: selectedTeams.map(team => team.value as string)
		});
	}
	function handleCancel() {
		dispatch('cancel');
	}

	function handleTeamSelect(teamValue: string | number) {
		console.log('handleTeamSelect called with:', teamValue);
		console.log('Current selectedTeams:', selectedTeams);
		console.log('Available teamOptions:', teamOptions);
		
		const team = teamOptions.find(t => t.value === teamValue);
		console.log('Found team:', team);
		
		if (team && !selectedTeams.find(st => st.value === team.value)) {
			selectedTeams = [...selectedTeams, team];
			console.log('Updated selectedTeams:', selectedTeams);
		} else {
			console.log('Team not added - either not found or already selected');
		}
		teamSelectOpen = false;
	}

	function removeTeam(teamValue: string | number) {
		selectedTeams = selectedTeams.filter(t => t.value !== teamValue);
	}

	function handleRemoveTeam(event: Event, teamValue: string | number) {
		event.stopPropagation();
		removeTeam(teamValue);
	}
</script>

<form on:submit|preventDefault={handleSubmit}>
	<h2>{isEdit ? 'Edit Event' : 'Workshop toevoegen'}</h2>
	<div class="type-switch-container">
		<div class="type-switch-label">
			<span class="type-label {eventType === 'schooldag' ? 'active' : ''}">Schooldag</span>
			<Switch bind:checked={switchChecked} class="switch-custom" />
			<span class="type-label {eventType === 'event' ? 'active' : ''}">Event</span>
		</div>
	</div>
	{#if eventType === 'event'}
		<label>
			Titel:
			<input 
				type="text" 
				bind:value={title} 
				placeholder="Voer een titel in..." 
				required
			/>
		</label>
	{/if}
	{#if eventType === 'schooldag'}
		<label>
			School:
			<SvelteSelect
				items={schoolOptions}
				bind:value={selectedSchool}
				placeholder="Kies een school..."
				required
			/>
		</label>
	{/if}
	<label>
		Vakdocent:
		<SvelteSelect
			items={teacherOptions}
			bind:value={selectedTeacher}
			placeholder="Kies een vakdocent (optioneel)"
			clearable={true}
		/>
	</label>
	<div class="date-time-container">
		<label>
			Start datum:
			<DatePicker 
				bind:value={editEventStart}
				placeholder="Selecteer datum..."
			/>
		</label>
		<label>
			Eerste workshop start:
			<TimePicker 
				bind:value={startTime}
				placeholder="Selecteer tijd..."
			/>
		</label>
	</div>
	
		<div style="grid-column: 1 / -1;">
			<h3>Workshops en pauzes</h3>
			{#each sessions as session, index}
				<div class="session-item {session.type}">
					<div class="session-header">
						<span class="session-title">
							{session.type === 'session' ? '📚' : '☕'} {session.title}
						</span>
						{#if session.type === 'session' && session.title !== 'Voorbereiding op locatie' && session.title !== 'Sessie 1' && sessions.filter(s => s.type === 'session').length > 2}
							<button type="button" class="remove-btn" on:click={() => removeSession(index)}>×</button>
						{/if}
					</div>
					<div class="session-details">
						{#if session.start && session.end}
							<span class="session-time">
								{new Date(session.start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - 
								{new Date(session.end).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
							</span>
						{:else}
							<span class="session-time">Selecteer eerst een starttijd</span>
						{/if}
						<input 
							type="number" 
							min="5" 
							step="5" 
							bind:value={session.duration} 
							on:input={(e) => {
								const newDuration = parseInt(e.target.value) || 0;
								updateSessionDuration(index, newDuration);
							}}
							class="duration-input"
							placeholder="min"
						/>
					</div>
					{#if session.type === 'session' && session.title !== 'Voorbereiding op locatie'}
						<div class="session-overrides">
							<div class="session-override-row">
								<div class="session-override-field">
									<label class="session-override-label">Workshop:</label>
									<SvelteSelect
										items={lessonOptions}
										value={lessonOptions.find(opt => opt.value === session.lesson)}
										on:change={(event) => updateSessionLesson(index, event.detail?.value)}
										placeholder="Selecteer workshop"
										clearable={true}
									/>
								</div>
								<div class="session-override-field">
									<label class="session-override-label">Groep/lokaal:</label>
									<input
										type="text"
										bind:value={session.group}
										on:input={() => updateSessionGroup(index, session.group)}
										placeholder="Groep/lokaal"
										class="session-group-input"
									/>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
			<button type="button" class="add-session-btn" on:click={addSession}>
				+ Workshop toevoegen
			</button>
		</div>
	
	<div style="grid-column: 1 / -1; font-size: 1rem; color: var(--accent); margin-bottom: 0.5rem;">
		Eindtijd: {endTime} (Totale workshoptijd: {totalSessionTimeFormatted})
	</div>
	<label>
		Beschrijving/opmerkingen:
		<textarea bind:value={description} rows="2" placeholder="Bijv. bijzonderheden, extra info..."
		></textarea>
	</label>
	<label>
		Materialen:
		<textarea bind:value={materialen} rows="2" placeholder="Bijv. laptops, robotkits, werkbladen..."
		></textarea>
	</label>
	<div class="form-row">
		<label>
			Status:
			<select bind:value={status} required>
				{#each statusOptions as opt}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>
		</label>
		
		<label>
			Vakdocenten Teams:
			<div class="space-y-2">
				<Select.Root bind:open={teamSelectOpen} onValueChange={handleTeamSelect}>
					<Select.Trigger class="w-full min-h-[40px] h-auto">
						<div class="flex-1 flex flex-wrap gap-1 items-center">
							{#if selectedTeams.length === 0}
								<span class="text-muted-foreground">Selecteer team(s)...</span>
							{:else}
								{#each selectedTeams as team}
									<Badge 
										variant="secondary" 
										class="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1"
									>
										{team.label}
										<Button
											variant="ghost"
											size="sm"
											class="h-4 w-4 p-0 hover:bg-blue-300 rounded-full"
											on:click={(e) => handleRemoveTeam(e, team.value)}
										>
											<X size={12} />
										</Button>
									</Badge>
								{/each}
							{/if}
						</div>
					</Select.Trigger>
					<Select.Content class="max-h-[200px] overflow-y-auto">
						{#if teamOptions.length === 0}
							<Select.Item value="" disabled>Geen teams beschikbaar</Select.Item>
						{:else}
							<!-- Group vakdocenten teams -->
							{@const vakdocentenTeams = teamOptions.filter(team => team.group === 'Vakdocenten Teams')}
							{@const otherTeams = teamOptions.filter(team => team.group !== 'Vakdocenten Teams')}
							
							{#if vakdocentenTeams.length > 0}
								<Select.Group>
									<Select.Label>Vakdocenten Teams</Select.Label>
									{#each vakdocentenTeams as team}
										{#if !selectedTeams.find(st => st.value === team.value)}
											<Select.Item value={team.value}>
												{team.label}
											</Select.Item>
										{/if}
									{/each}
								</Select.Group>
							{/if}
							
							{#if otherTeams.length > 0}
								{#if vakdocentenTeams.length > 0}
									<Select.Separator />
								{/if}
								<Select.Group>
									<Select.Label>Andere Teams</Select.Label>
									{#each otherTeams as team}
										{#if !selectedTeams.find(st => st.value === team.value)}
											<Select.Item value={team.value}>
												{team.label}
											</Select.Item>
										{/if}
									{/each}
								</Select.Group>
							{/if}
						{/if}
					</Select.Content>
				</Select.Root>
			</div>
		</label>
	</div>
	<div class="modal-actions">
		<button type="submit">{isEdit ? 'Save' : 'Toevoegen'}</button>
		<button type="button" on:click={handleCancel}>{isEdit ? 'Cancel' : 'Annuleren'}</button>
	</div>
</form>

<style>
	form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 2rem;
	}
	@media (max-width: 600px) {
		form {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}
	}
	h2 {
		grid-column: 1 / -1;
		margin-bottom: 0.5rem;
		font-size: 1.3rem;
		font-weight: bold;
		letter-spacing: 0.02em;
	}
	label {
		display: flex;
		flex-direction: column;
		font-weight: bold;
		font-size: 1rem;
		gap: 0.25rem;
	}
	input,
	select,
	textarea {
		font-size: 1rem;
		padding: 0.5em 0.75em;
		border-radius: var(--radius);
		border: 1px solid var(--color-ash-grey);
		background: transparent;
		color: var(--foreground);
		width: 100%;
		box-sizing: border-box;
		font-family: inherit;
	}
	textarea {
		resize: vertical;
		min-height: 2.5em;
	}
	.form-row {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 2rem;
	}
	@media (max-width: 600px) {
		.form-row {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}
	}
	.modal-actions {
		grid-column: 1 / -1;
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 1rem;
	}
	@media (max-width: 600px) {
		.modal-actions {
			flex-direction: column;
			gap: 0.5rem;
			margin-top: 0.5rem;
		}
	}

	/* Session builder styles */

	.session-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		border-radius: var(--radius);
		border: 1px solid #ddd;
	}

	.session-item.session {
		border-color: var(--accent);
	}

	.session-item.break {
		border-color: var(--warning);
	}

	.session-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.session-title {
		font-weight: bold;
		font-size: 0.9rem;
	}

	.session-details {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.session-time {
		font-size: 0.8rem;
		color: #666;
	}

	.duration-input {
		width: 80px;
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
	}

	.remove-btn {
		background: transparent;
		color: currentColor;
		border: none;
		border-radius: 4px;
		width: 24px;
		height: 24px;
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.remove-btn:hover {
		background: var(--muted, #f3f4f6);
	}

	.add-session-btn {
		background: var(--accent);
		color: white;
		border: none;
		border-radius: var(--radius);
		padding: 0.5rem 1rem;
		cursor: pointer;
		font-size: 0.9rem;
		margin-top: 0.5rem;
		width: 100%;
	}

	.add-session-btn:hover {
		background: var(--warning);
		color: white;
	}

	h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: bold;
	}

	.date-time-container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		grid-column: 1 / -1;
	}

	.session-overrides {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid #e5e5e5;
	}

	.session-override-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.session-override-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.session-override-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: #666;
	}

	.session-group-input {
		font-size: 0.9rem;
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius);
		border: 1px solid var(--color-ash-grey);
		background: transparent;
		color: var(--foreground);
		box-sizing: border-box;
	}

	@media (max-width: 600px) {
		.session-override-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
	}

	.total-time-display {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		margin: 1rem 0;
		background: var(--muted, #f8f9fa);
		border-radius: var(--radius);
		border: 1px solid #e5e5e5;
	}

	.total-time-label {
		font-weight: 600;
		color: var(--color-blackened-steel);
	}

	.total-time-value {
		font-size: 1.1rem;
		font-weight: bold;
		color: var(--accent);
		font-family: monospace;
	}

	@media (max-width: 600px) {
		.date-time-container {
			grid-template-columns: 1fr;
		}
	}

	/* Type switch styles */
	.type-switch-container {
		grid-column: 1 / -1;
		margin-bottom: 1rem;
	}

	.type-switch-label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		font-weight: bold;
		font-size: 1rem;
		flex-direction: row;
	}

	.type-label {
		transition: color 0.2s ease;
		color: var(--muted-foreground);
	}

	.type-label.active {
		color: var(--accent);
		font-weight: bold;
	}

	/* Custom switch styling */
	:global(.switch-custom[data-state="checked"]) {
		background-color: var(--foreground) !important;
	}

	:global(.switch-custom[data-state="unchecked"]) {
		background-color: var(--muted) !important;
	}

	/* Switch thumb (ball) styling */
	:global(.switch-custom[data-state="checked"] [data-slot="switch-thumb"]) {
		background-color: var(--background) !important;
	}

	:global(.switch-custom[data-state="unchecked"] [data-slot="switch-thumb"]) {
		background-color: var(--foreground) !important;
	}

</style>
