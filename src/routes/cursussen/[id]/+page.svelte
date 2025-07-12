<script lang="ts">
	import { onMount } from 'svelte';
	import { databases } from '$lib/appwrite';
	import { page } from '$app/stores';
	import { get, writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { Query } from 'appwrite';

	const databaseId = 'lessen';
	const cursusCollection = 'cursus';
	const lessonCollection = 'les';

	let cursus: any = null;
	let lessons: any[] = [];
	let loading = true;
	let error = '';
	let removing = '';

	async function fetchCursusAndLessons(id: string) {
		loading = true;
		try {
			cursus = await databases.getDocument(databaseId, cursusCollection, id);
			const res = await databases.listDocuments(databaseId, lessonCollection, [
				Query.equal('cursus', [id])
			]);
			lessons = res.documents;
		} catch (e) {
			error = 'Kon cursus of lessen niet ophalen.';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const params = get(page).params;
		fetchCursusAndLessons(params.id);
	});

	function addLesson() {
		goto(`/lessen/nieuw?cursus=${cursus.$id}`);
	}

	async function removeLessonFromCourse(lessonId: string) {
		if (!confirm('Weet je zeker dat je deze les uit deze cursus wilt verwijderen?')) return;
		removing = lessonId;
		try {
			await databases.updateDocument(databaseId, lessonCollection, lessonId, { cursus: '' });
			await fetchCursusAndLessons(cursus.$id);
		} catch (e) {
			error = 'Kon les niet verwijderen uit cursus.';
			console.error(e);
		} finally {
			removing = '';
		}
	}
</script>

{#if loading}
	<div class="cursus-view-card"><p>Bezig met laden...</p></div>
{:else if error}
	<div class="cursus-view-card"><p class="text-red-500">{error}</p></div>
{:else if cursus}
	<div class="cursus-view-card">
		<button class="add-btn" on:click={addLesson}>Nieuwe les toevoegen aan deze cursus</button>
		<h1>{cursus.name}</h1>
		{#if cursus.description}
			<div class="cursus-subtitle">{cursus.description}</div>
		{/if}
		<div class="cursus-info-grid">
			<details class="cursus-details-tab">
				<summary>Lessen in deze cursus</summary>
				{#if lessons.length === 0}
					<div class="text-gray-500">Nog geen lessen in deze cursus.</div>
				{:else}
					<div class="cursus-lessons-list">
						{#each lessons as lesson}
							<div class="cursus-lesson-row">
								<a href={`/lessen/${lesson.$id}`} class="cursus-lesson-link"
									>{lesson.onderwerp || 'Les zonder titel'}</a
								>
								<span class="cursus-lesson-nr">Lesnummer: {lesson.lesnummer}</span>
								<button
									class="remove-btn"
									on:click={() => removeLessonFromCourse(lesson.$id)}
									disabled={removing === lesson.$id}
								>
									{removing === lesson.$id ? 'Verwijderen...' : 'Verwijder uit cursus'}
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</details>
		</div>
	</div>
{/if}

<style>
	.cursus-view-card {
		max-width: 700px;
		margin: 2rem auto;
		background: var(--background);
		color: var(--foreground);
		border-radius: 12px;
		box-shadow: 0 2px 16px var(--divider, rgba(0, 0, 0, 0.08));
		padding: 2.5rem 2rem 2rem 2rem;
		position: relative;
	}
	.cursus-view-card h1 {
		margin-bottom: 2rem;
		font-size: 2.2rem;
		color: var(--accent);
	}
	.cursus-subtitle {
		margin-top: -1.2rem;
		margin-bottom: 2rem;
		font-size: 1.15rem;
		color: var(--accent);
		font-weight: 500;
		letter-spacing: 0.01em;
	}
	.cursus-info-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.2rem 2rem;
		font-size: 1.1rem;
	}
	.add-btn {
		position: absolute;
		right: 2rem;
		top: 1.5rem;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: 0.5em 1.5em;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}
	.add-btn:hover {
		background: var(--warning);
		color: var(--foreground);
	}
	.cursus-details-tab {
		grid-column: 1 / -1;
		margin-top: 1.5rem;
		background: var(--background);
		border-radius: 8px;
		border: 1px solid var(--divider);
		padding: 0.5rem 1rem 1rem 1rem;
	}
	.cursus-details-tab summary {
		font-weight: bold;
		font-size: 1.1rem;
		color: var(--accent);
		cursor: pointer;
		outline: none;
		margin-bottom: 0.5rem;
	}
	.cursus-details-tab[open] summary {
		margin-bottom: 1rem;
	}
	.cursus-details-tab div {
		margin-bottom: 0.5rem;
	}
	.cursus-lessons-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.cursus-lesson-row {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		background: var(--background);
		border-radius: 6px;
		border: 1px solid var(--divider);
		padding: 0.5rem 1rem;
	}
	.cursus-lesson-link {
		font-weight: bold;
		color: var(--accent);
		text-decoration: underline;
	}
	.cursus-lesson-nr {
		color: var(--foreground);
		font-size: 0.95rem;
	}
	.remove-btn {
		background: var(--warning);
		color: var(--foreground);
		border: none;
		border-radius: var(--radius);
		padding: 0.4em 1em;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}
	.remove-btn:hover {
		background: var(--accent);
		color: #fff;
	}
	@media (max-width: 600px) {
		.cursus-info-grid {
			grid-template-columns: 1fr;
		}
		.cursus-view-card {
			padding: 1.2rem 0.5rem 1.5rem 0.5rem;
		}
		.add-btn {
			right: 0.5rem;
			top: 1rem;
		}
		.cursus-lesson-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
	}
</style>
