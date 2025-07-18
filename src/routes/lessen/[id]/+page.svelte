<script lang="ts">
	import { onMount } from 'svelte';
	import { databases } from '$lib/appwrite';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';

	const databaseId = 'lessen';
	const collectionId = 'les';

	let lesson: any = null;
	let error = '';
	let loading = true;

	onMount(async () => {
		const params = get(page).params;
		try {
			lesson = await databases.getDocument(databaseId, collectionId, params.id);
		} catch (e) {
			error = 'Kon les niet ophalen.';
			console.error(e);
		} finally {
			loading = false;
		}
	});

	function editLesson() {
		goto(`/lessen/nieuw/${lesson.$id}`);
	}

	function startLesson() {
		// Redirect to connect page with lesson info (connect will load lesson and connect to present)
		goto(`/connect?lesson=${lesson.$id}`);
	}
</script>

{#if loading}
	<div class="lesson-view-card"><p>Bezig met laden...</p></div>
{:else if error}
	<div class="lesson-view-card"><p class="text-red-500">{error}</p></div>
{:else if lesson}
	<div class="lesson-view-card">
		{#if lesson.videoUrl}
			<div class="lesson-video-preview">
				<iframe
					title={lesson.onderwerp || 'Lesvideo'}
					width="560"
					height="315"
					src={lesson.videoUrl}
					frameborder="0"
					allowfullscreen
					sandbox="allow-same-origin allow-scripts allow-popups"
					style="width: 100%; max-width: 640px; aspect-ratio: 16/9; height: auto; margin-bottom: 1.5rem; border-radius: 12px; border: none; background: #000;"
				></iframe>
			</div>
		{:else if lesson.videoThumbnail}
			<div class="lesson-video-preview">
				<img
					src={lesson.videoThumbnail}
					alt="Video preview"
					style="max-width: 100%; max-height: 180px; margin-bottom: 1.5rem; border-radius: 12px;"
				/>
			</div>
		{/if}
		<div class="lesson-title-row">
			<h1>{lesson.onderwerp || 'Les zonder titel'}</h1>
			<div class="lesson-actions">
				<button class="edit-btn" on:click={editLesson}>Bewerk deze les</button>
				{#if $user}
					<button class="start-lesson-btn" on:click={startLesson}>Start Les</button>
				{/if}
			</div>
		</div>
		<div class="lesson-info-grid">
			<div><span>Lesnummer:</span> {lesson.lesnummer}</div>
			<div><span>Doelgroep/Leerjaar:</span> {lesson.doelgroep}</div>
			<div><span>Duur van de les:</span> {lesson.duur}</div>
			<div><span>Introductie (5-10 min):</span> {lesson.intro}</div>
			<div><span>Kernactiviteit (20-30 min):</span> {lesson.kern}</div>
			<div><span>Reflectie en Afronding (5-10 min):</span> {lesson.reflectie}</div>
			<div><span>Materialen en Middelen:</span> {lesson.materialen}</div>
			<div><span>Evaluatie van Leerlingen:</span> {lesson.evaluatie}</div>
			<div><span>Feedback voor de Les:</span> {lesson.feedback}</div>
			{#if lesson.aanvullend}
				<div><span>Aanvullende Opdrachten:</span> {lesson.aanvullend}</div>
			{/if}
			<details class="lesson-details-tab">
				<summary>Overige info</summary>
				<div><span>Waarom deze les?</span> {lesson.waarom}</div>
				<div><span>Doel van de les (voor leerlingen):</span> {lesson.doel}</div>
				<div><span>Leerdoelen (voor leraren):</span> {lesson.leerdoelen}</div>
			</details>
		</div>
	</div>
{/if}

<style>
	.lesson-view-card {
		max-width: 700px;
		margin: 2rem auto;
		background: var(--background);
		color: var(--foreground);
		border-radius: 12px;
		box-shadow: 0 2px 16px var(--divider, rgba(0, 0, 0, 0.08));
		padding: 2.5rem 2rem 2rem 2rem;
		position: relative;
	}
	.lesson-view-card h1 {
		margin-bottom: 0;
		font-size: 2.2rem;
		color: var(--accent);
	}
	.lesson-info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.2rem 2rem;
		font-size: 1.1rem;
	}
	.lesson-info-grid span {
		font-weight: 600;
		color: var(--foreground);
		margin-right: 0.5rem;
	}
	.lesson-title-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.lesson-actions {
		display: flex;
		gap: 0.5rem;
	}
	.edit-btn {
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: 0.5em 1.5em;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
		font-size: 1rem;
	}
	.edit-btn:hover {
		background: var(--warning);
		color: var(--foreground);
	}
	.start-lesson-btn {
		background: #2ecc71;
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: 0.5em 1.5em;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
		font-size: 1rem;
	}
	.start-lesson-btn:hover {
		background: #27ae60;
	}
	.lesson-details-tab {
		grid-column: 1 / -1;
		margin-top: 1.5rem;
		background: var(--background);
		border-radius: 8px;
		border: 1px solid var(--divider);
		padding: 0.5rem 1rem 1rem 1rem;
	}
	.lesson-details-tab summary {
		font-weight: bold;
		font-size: 1.1rem;
		color: var(--accent);
		cursor: pointer;
		outline: none;
		margin-bottom: 0.5rem;
	}
	.lesson-details-tab[open] summary {
		margin-bottom: 1rem;
	}
	.lesson-details-tab div {
		margin-bottom: 0.5rem;
	}
	@media (max-width: 600px) {
		.lesson-info-grid {
			grid-template-columns: 1fr;
		}
		.lesson-view-card {
			padding: 1.2rem 0.5rem 1.5rem 0.5rem;
		}
		.edit-btn {
			right: 0.5rem;
			top: 1rem;
		}
	}
</style>
