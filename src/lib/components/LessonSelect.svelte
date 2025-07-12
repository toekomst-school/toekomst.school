<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { databases } from '$lib/appwrite';

	// Replace with your actual database and collection IDs
	const databaseId = 'lessen';
	const collectionId = 'les';

	let search = '';
	let lessons: any[] = [];
	let filtered: any[] = [];
	let loading = false;
	let error = '';

	const dispatch = createEventDispatcher();

	async function fetchLessons() {
		loading = true;
		try {
			const response = await databases.listDocuments(databaseId, collectionId);
			lessons = response.documents;
			filterLessons();
		} catch (e) {
			error = 'Kon lessen niet ophalen.';
			lessons = [];
		} finally {
			loading = false;
		}
	}

	function filterLessons() {
		if (!search) {
			filtered = lessons;
		} else {
			const s = search.toLowerCase();
			filtered = lessons.filter(
				(l) =>
					(l.onderwerp || '').toLowerCase().includes(s) ||
					(l.lesnummer || '').toLowerCase().includes(s)
			);
		}
	}

	function selectLesson(lesson: any) {
		dispatch('select', { lesson });
	}

	$: filterLessons();

	onMount(fetchLessons);
</script>

<div class="lesson-select">
	<input
		type="text"
		placeholder="Zoek les..."
		bind:value={search}
		class="mb-2 w-full rounded border p-2"
		on:input={filterLessons}
		disabled={loading}
	/>
	{#if loading}
		<div>Laden...</div>
	{:else if error}
		<div class="text-red-500">{error}</div>
	{:else if filtered.length === 0}
		<div>Geen lessen gevonden.</div>
	{:else}
		<ul class="dark:bg-sidebar max-h-60 overflow-auto rounded border bg-white p-0">
			{#each filtered as lesson}
				<li class="hover:bg-accent cursor-pointer p-2" on:click={() => selectLesson(lesson)}>
					<strong>{lesson.lesnummer}</strong>: {lesson.onderwerp}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.lesson-select {
		max-width: 400px;
	}
</style>
