<script context="module" lang="ts">
	export interface Option {
		value: string | number;
		label: string;
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
	}
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SvelteSelect from 'svelte-select';

	export let lessonOptions: Option[] = [];
	export let schoolOptions: Option[] = [];
	export let groupOptions: Option[] = [];
	export let teacherOptions: Option[] = [];
	export let statusOptions: Option[] = [];
	export let isEdit: boolean = false;
	export let initialValues: WorkshopFormValues = {};

	// Form fields
	export let selectedLesson: Option | null = null;
	export let selectedSchool: Option | null = null;
	export let selectedGroup: string = '';
	export let selectedTeacher: Option | null = null;
	export let lessonLength: number = 45;
	export let materialen: string = '';
	export let status: string = 'pending';
	export let description: string = '';
	export let editEventStart: string = '';

	const dispatch = createEventDispatcher();

	$: if (initialValues && Object.keys(initialValues).length > 0) {
		selectedLesson = lessonOptions.find((opt) => opt.value === initialValues.lesson) || null;
		selectedSchool = schoolOptions.find((opt) => opt.value === initialValues.school) || null;
		selectedGroup = initialValues.group ?? '';
		selectedTeacher = teacherOptions.find((opt) => opt.value === initialValues.teacher) || null;
		lessonLength = initialValues.length ?? 45;
		materialen = initialValues.materialen ?? '';
		status = initialValues.status ?? 'pending';
		description = initialValues.description ?? '';
		editEventStart = initialValues.start ? initialValues.start.slice(0, 16) : '';
	}

	function getEndTime() {
		if (!editEventStart || !lessonLength) return '';
		const totalMinutes = Number(lessonLength);
		const end = new Date(new Date(editEventStart).getTime() + totalMinutes * 60000);
		return end.toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' });
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		dispatch('submit', {
			selectedLesson: selectedLesson ? selectedLesson.value : '',
			selectedSchool: selectedSchool ? selectedSchool.value : '',
			selectedGroup,
			selectedTeacher: selectedTeacher ? selectedTeacher.value : '',
			lessonLength,
			materialen,
			status,
			description,
			editEventStart
		});
	}
	function handleCancel() {
		dispatch('cancel');
	}
</script>

<form on:submit|preventDefault={handleSubmit}>
	<h2>{isEdit ? 'Edit Event' : 'Workshop toevoegen'}</h2>
	<label>
		Les:
		<SvelteSelect
			items={lessonOptions}
			bind:value={selectedLesson}
			placeholder="Kies een les..."
			required
		/>
	</label>
	<label>
		School:
		<SvelteSelect
			items={schoolOptions}
			bind:value={selectedSchool}
			placeholder="Kies een school..."
			required
		/>
	</label>
	<label>
		Klas/Groep:
		<input type="text" bind:value={selectedGroup} placeholder="Klas of groep..." />
	</label>
	<label>
		Vakdocent:
		<SvelteSelect
			items={teacherOptions}
			bind:value={selectedTeacher}
			placeholder="Kies een vakdocent (optioneel)"
			clearable={true}
		/>
	</label>
	<label>
		Start tijd en datum:
		<input type="datetime-local" bind:value={editEventStart} required />
	</label>
	<label>
		Lengte les (minuten):
		<input type="number" min="5" step="5" bind:value={lessonLength} required />
	</label>
	<div style="grid-column: 1 / -1; font-size: 1rem; color: var(--accent); margin-bottom: 0.5rem;">
		Eindtijd: {getEndTime()}
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
	<label>
		Status:
		<select bind:value={status} required>
			{#each statusOptions as opt}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	</label>
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
		background: #fff;
		color: var(--color-blackened-steel);
		width: 100%;
		box-sizing: border-box;
		font-family: inherit;
	}
	textarea {
		resize: vertical;
		min-height: 2.5em;
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
</style>
