<script context="module" lang="ts">
	export interface TeacherFormValues {
		name?: string;
		email?: string;
		address?: string;
		phone?: string;
		qualifications?: string;
		bio?: string;
		photo?: string;
	}
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let initialValues: TeacherFormValues = {};
	export let isEdit: boolean = false;

	// Form fields
	export let name: string = '';
	export let email: string = '';
	export let address: string = '';
	export let phone: string = '';
	export let qualifications: string = '';
	export let bio: string = '';
	export let photo: string = '';

	const dispatch = createEventDispatcher();

	$: if (initialValues && Object.keys(initialValues).length > 0) {
		name = initialValues.name ?? '';
		email = initialValues.email ?? '';
		address = initialValues.address ?? '';
		phone = initialValues.phone ?? '';
		qualifications = initialValues.qualifications ?? '';
		bio = initialValues.bio ?? '';
		photo = initialValues.photo ?? '';
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		// Basic validation
		if (!name || !email) {
			alert('Naam en e-mail zijn verplicht.');
			return;
		}
		dispatch('submit', {
			name,
			email,
			address,
			phone,
			qualifications,
			bio,
			photo
		});
	}
	function handleCancel() {
		dispatch('cancel');
	}
</script>

<form on:submit|preventDefault={handleSubmit} class="teacher-form">
	<h2>{isEdit ? 'Vakdocent bewerken' : 'Vakdocent toevoegen'}</h2>
	<label>
		Naam:
		<input type="text" bind:value={name} required placeholder="Naam" />
	</label>
	<label>
		E-mail:
		<input type="email" bind:value={email} required placeholder="E-mail" />
	</label>
	<label>
		Adres:
		<input type="text" bind:value={address} placeholder="Adres" />
	</label>
	<label>
		Telefoonnummer:
		<input type="tel" bind:value={phone} placeholder="Telefoonnummer" />
	</label>
	<label>
		Kwalificaties:
		<input
			type="text"
			bind:value={qualifications}
			placeholder="Kwalificaties (bijv. diploma's, certificaten)"
		/>
	</label>
	<label>
		Bio / Opmerkingen:
		<textarea bind:value={bio} rows="2" placeholder="Korte bio of opmerkingen..."></textarea>
	</label>
	<label>
		Foto (URL):
		<input type="url" bind:value={photo} placeholder="URL naar foto (optioneel)" />
		{#if photo}
			<img
				src={photo}
				alt="Foto vakdocent"
				style="max-width: 120px; margin-top: 0.5rem; border-radius: 0.5rem;"
			/>
		{/if}
	</label>
	<div class="modal-actions">
		<button type="submit">{isEdit ? 'Opslaan' : 'Toevoegen'}</button>
		<button type="button" on:click={handleCancel}>Annuleren</button>
	</div>
</form>

<style>
	.teacher-form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 2rem;
		max-width: 600px;
	}
	@media (max-width: 600px) {
		.teacher-form {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}
	}
	.teacher-form h2 {
		grid-column: 1 / -1;
		margin-bottom: 0.5rem;
		font-size: 1.3rem;
		font-weight: bold;
		letter-spacing: 0.02em;
	}
	.teacher-form label {
		display: flex;
		flex-direction: column;
		font-weight: bold;
		font-size: 1rem;
		gap: 0.25rem;
	}
	.teacher-form input,
	.teacher-form textarea {
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
	.teacher-form textarea {
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
