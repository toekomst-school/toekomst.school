<script lang="ts">
	import { onMount } from 'svelte';
	import { databases } from '$lib/appwrite';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { courseSchema } from '$lib/validation/schema';
	import { toastStore } from '$lib/stores/toast';
	import FormField from '$lib/components/ui/form-field.svelte';
	import AutoSaveIndicator from '$lib/components/ui/auto-save-indicator.svelte';
	import { Button } from '$lib/components/ui/button';
	import { autoSaveStore } from '$lib/stores/auto-save';
	import type { ZodError } from 'zod';
	import { Query } from 'appwrite';

	const databaseId = 'lessen';
	const collectionId = 'cursus';
	const lessonCollection = 'les';

	let courseId = '';
	let name = '';
	let description = '';
	let image = '';
	let price = '';
	let loading = true;
	let saving = false;
	let errors: ZodError['errors'] = [];
	let lessons: any[] = [];

	// Get URL parameters
	$: {
		const urlParams = new URLSearchParams($page.url.search);
		courseId = urlParams.get('id') || '';
		name = urlParams.get('name') || '';
		description = urlParams.get('description') || '';
		image = urlParams.get('image') || '';
		price = urlParams.get('price') || '';
	}

	async function fetchLessons() {
		if (!courseId) return;
		try {
			const res = await databases.listDocuments(databaseId, lessonCollection, [
				Query.equal('cursus', [courseId])
			]);
			lessons = res.documents;
		} catch (e) {
			console.error('Could not fetch lessons:', e);
		}
	}

	onMount(async () => {
		if (courseId) {
			try {
				const course = await databases.getDocument(databaseId, collectionId, courseId);
				name = course.name || '';
				description = course.description || '';
				image = course.image || '';
				price = course.price?.toString() || '';
				await fetchLessons();
			} catch (e) {
				toastStore.error(
					'Kon cursus niet laden',
					'Probeer opnieuw of ga terug naar de cursussen lijst.'
				);
				console.error(e);
			}
		}
		loading = false;
	});

	function validateForm() {
		try {
			courseSchema.parse({
				title: name,
				description: description || undefined,
				price: price ? parseFloat(price) : undefined,
				thumbnail: image || undefined,
				status: 'draft' as const,
				learningObjectives: ['Default learning objective'] // Required by schema
			});
			errors = [];
			return true;
		} catch (error) {
			if (error instanceof Error && 'errors' in error) {
				errors = (error as ZodError).errors;
			}
			return false;
		}
	}

	async function saveCourse() {
		if (!validateForm()) {
			toastStore.error(
				'Formulier bevat fouten',
				'Corrigeer de fouten hieronder en probeer opnieuw.'
			);
			return;
		}

		saving = true;
		autoSaveStore.startSaving();

		try {
			const courseData = {
				name,
				description: description || '',
				image: image || '',
				price: price ? parseFloat(price) : undefined
			};

			if (courseId) {
				// Update existing course
				await databases.updateDocument(databaseId, collectionId, courseId, courseData);
				toastStore.success('Cursus bijgewerkt', `"${name}" is succesvol bijgewerkt.`);
				autoSaveStore.markSaved();
			} else {
				// Create new course
				const newCourse = await databases.createDocument(
					databaseId,
					collectionId,
					'unique()',
					courseData
				);
				toastStore.success('Cursus aangemaakt', `"${name}" is succesvol aangemaakt.`);
				autoSaveStore.markSaved();
				goto(`/cursussen/${newCourse.$id}`);
				return;
			}
		} catch (e) {
			console.error(e);
			const errorMessage = courseId ? 'Kon cursus niet bijwerken' : 'Kon cursus niet aanmaken';
			toastStore.error(errorMessage, 'Probeer het opnieuw of neem contact op met ondersteuning.');
			autoSaveStore.markError(errorMessage);
		} finally {
			saving = false;
		}
	}

	async function handleAutoSave() {
		if (!name.trim()) return; // Don't auto-save if no name

		autoSaveStore.autoSave(async () => {
			if (validateForm() && courseId) {
				const courseData = {
					name,
					description: description || '',
					image: image || '',
					price: price ? parseFloat(price) : undefined
				};
				await databases.updateDocument(databaseId, collectionId, courseId, courseData);
			}
		});
	}

	// Trigger auto-save when fields change
	$: if (name || description || image || price) {
		autoSaveStore.markChanged();
		handleAutoSave();
	}

	function handleCancel() {
		console.log('Cancel clicked, courseId:', courseId);
		if (courseId) {
			goto(`/cursussen/${courseId}`);
		} else {
			goto('/cursussen');
		}
	}

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 's') {
			event.preventDefault();
			saveCourse();
		}
	}

	// Page title
	$: pageTitle = courseId ? `Bewerk Cursus: ${name || 'Naamloos'}` : 'Nieuwe Cursus';
</script>

<svelte:window on:keydown={handleKeydown} />
<svelte:head>
	<title>{pageTitle} - Toekomst School</title>
</svelte:head>

<!-- Header -->
<div class="editor-header">
	<div class="header-content">
		<div class="header-left">
			<h1 class="page-title">
				{courseId ? 'Cursus Bewerken' : 'Nieuwe Cursus'}
			</h1>
		</div>

		<div class="header-actions">
			<AutoSaveIndicator showRetry showDetails />
			<div class="action-buttons">
				<button type="button" class="cancel-button" on:click={handleCancel}> Annuleren </button>
				<Button on:click={saveCourse} disabled={saving || !name.trim()} class="save-button">
					{#if saving}
						<div class="spinner"></div>
					{/if}
					{courseId ? 'Opslaan' : 'Cursus Aanmaken'}
				</Button>
			</div>
		</div>
	</div>
</div>

{#if loading}
	<!-- Loading State -->
	<div class="editor-content">
		<div class="form-container loading">
			<div class="form-section">
				<div class="skeleton-title"></div>
				<div class="form-grid">
					{#each Array(4) as _}
						<div class="form-field-skeleton">
							<div class="skeleton-label"></div>
							<div class="skeleton-input"></div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{:else}
	<!-- Form Content -->
	<div class="editor-content">
		<form class="form-container" on:submit|preventDefault={saveCourse}>
			<!-- Basic Information -->
			<div class="form-section">
				<h2 class="section-title">Basis Informatie</h2>
				<div class="form-grid">
					<FormField
						label="Cursus Naam"
						name="name"
						bind:value={name}
						placeholder="Bijv. JavaScript Fundamentals"
						required
						{errors}
						helpText="Een beschrijvende naam voor je cursus"
					/>

					<FormField
						label="Prijs"
						name="price"
						type="number"
						bind:value={price}
						placeholder="99.99"
						min={0}
						step={0.01}
						{errors}
						helpText="Laat leeg voor een gratis cursus"
					/>
				</div>

				<FormField
					label="Beschrijving"
					name="description"
					type="textarea"
					bind:value={description}
					placeholder="Beschrijf waar deze cursus over gaat..."
					rows={4}
					{errors}
					helpText="Een uitgebreide beschrijving helpt studenten begrijpen wat ze kunnen verwachten"
				/>

				<FormField
					label="Cursus Afbeelding"
					name="image"
					type="url"
					bind:value={image}
					placeholder="https://example.com/cursus-afbeelding.jpg"
					{errors}
					helpText="Een URL naar een afbeelding die de cursus representeert"
				/>
			</div>

			<!-- Preview Section -->
			{#if name || description || image}
				<div class="form-section">
					<h2 class="section-title">Voorvertoning</h2>
					<div class="course-preview">
						<div class="preview-image">
							{#if image}
								<img src={image} alt="Cursus voorvertoning" loading="lazy" />
							{:else}
								<div class="placeholder-icon">
									<svg
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
									>
										<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
										<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
									</svg>
								</div>
							{/if}
						</div>
						<div class="preview-content">
							<h3 class="preview-title">{name || 'Cursus Naam'}</h3>
							{#if description}
								<p class="preview-description">{description}</p>
							{/if}
							<div class="preview-meta">
								<div class="preview-stat">
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
										<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
									</svg>
									0 lessen
								</div>
								{#if price}
									<div class="preview-price">€ {Number(price).toFixed(2)}</div>
								{:else}
									<div class="preview-price free">Gratis</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Lessons Section -->
			{#if courseId}
				<div class="form-section">
					<h2 class="section-title">Lessen Beheren</h2>
					<div class="lessons-management">
						<div class="section-actions">
							<button
								class="add-lesson-btn"
								on:click={() => goto(`/lessen/editor?cursus=${courseId}`)}
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<line x1="12" y1="5" x2="12" y2="19"></line>
									<line x1="5" y1="12" x2="19" y2="12"></line>
								</svg>
								Nieuwe Les Toevoegen
							</button>
						</div>

						{#if lessons.length > 0}
							<div class="lessons-list">
								<h3 class="lessons-count">{lessons.length} lessen</h3>
								<div class="lessons-list-view">
									{#each lessons as lesson}
										<div
											class="lesson-item"
											on:click={() => goto(`/lessen/editor?id=${lesson.$id}`)}
											on:keydown={(e) =>
												e.key === 'Enter' && goto(`/lessen/editor?id=${lesson.$id}`)}
											role="button"
											tabindex="0"
										>
											<div class="lesson-content">
												<h4 class="lesson-title">{lesson.onderwerp || 'Naamloos les'}</h4>
												{#if lesson.doel}
													<p class="lesson-description">{lesson.doel}</p>
												{/if}
												<div class="lesson-meta">
													{#if lesson.duur}
														<span class="lesson-duration">{lesson.duur}</span>
													{/if}
													{#if lesson.lesnummer}
														<span class="lesson-number">Les {lesson.lesnummer}</span>
													{/if}
												</div>
											</div>
											<div class="lesson-arrow">
												<svg
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<path d="M9 18l6-6-6-6"></path>
												</svg>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<p class="section-description">
								Voeg lessen toe en beheer de inhoud van je cursus. Lessen worden automatisch
								gekoppeld aan deze cursus.
							</p>
						{/if}
					</div>
				</div>
			{/if}
		</form>
	</div>
{/if}

<style>
	.editor-header {
		background: var(--background);
		border-bottom: 1px solid var(--border);
		padding: 1.5rem 2rem;
		position: sticky;
		top: 0;
		z-index: 10;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	.page-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
		color: var(--foreground);
		letter-spacing: -0.025em;
	}

	.header-actions {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 1rem;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
	}

	.save-button {
		min-width: 120px;
	}

	.cancel-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 40px;
		padding: 0.5rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-button:hover {
		background: var(--muted);
		border-color: var(--border);
	}

	.editor-content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		background: var(--background);
		min-height: calc(100vh - 120px);
	}

	.form-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.form-container.loading {
		pointer-events: none;
		opacity: 0.7;
	}

	.form-section {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 2rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
		transition: box-shadow 0.2s ease;
	}

	.form-section:hover {
		box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.08);
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 1.5rem 0;
		color: var(--foreground);
		letter-spacing: -0.025em;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--muted);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.form-grid :global(.form-field:last-child:nth-child(odd)) {
		grid-column: 1 / -1;
	}

	/* Course Preview */
	.course-preview {
		display: flex;
		gap: 1.5rem;
		padding: 1.5rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.preview-image {
		width: 120px;
		height: 120px;
		border-radius: var(--radius);
		overflow: hidden;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--muted);
	}

	.preview-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder-icon {
		color: var(--muted-foreground);
		opacity: 0.6;
	}

	.preview-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
		flex: 1;
	}

	.preview-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		color: var(--foreground);
	}

	.preview-description {
		color: var(--muted-foreground);
		line-height: 1.5;
		margin: 0;
	}

	.preview-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
	}

	.preview-stat {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.preview-price {
		font-weight: 600;
		color: var(--primary);
	}

	.preview-price.free {
		color: var(--muted-foreground);
		font-weight: 500;
	}

	/* Loading Skeletons */
	.skeleton-title {
		height: 1.75rem;
		background: var(--muted);
		border-radius: var(--radius);
		width: 40%;
		margin-bottom: 1.5rem;
		animation: skeleton-pulse 1.5s ease-in-out infinite alternate;
	}

	.form-field-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-label {
		height: 1rem;
		background: var(--muted);
		border-radius: var(--radius);
		width: 30%;
		animation: skeleton-pulse 1.5s ease-in-out infinite alternate;
	}

	.skeleton-input {
		height: 2.5rem;
		background: var(--muted);
		border-radius: var(--radius);
		width: 100%;
		animation: skeleton-pulse 1.5s ease-in-out infinite alternate;
	}

	@keyframes skeleton-pulse {
		0% {
			opacity: 0.6;
		}
		100% {
			opacity: 1;
		}
	}

	/* Spinner */
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 0.5rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Lessons Management Section */
	.lessons-management {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.add-lesson-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--primary);
		color: var(--primary-foreground);
		border: none;
		border-radius: var(--radius);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-lesson-btn:hover {
		background: var(--primary-hover, var(--primary));
		transform: translateY(-1px);
		box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.1);
	}

	.section-description {
		color: var(--muted-foreground);
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0;
	}

	/* Lessons Display */
	.lessons-list {
		margin-top: 1.5rem;
	}

	.lessons-count {
		font-size: 1rem;
		font-weight: 600;
		color: var(--foreground);
		margin: 0 0 1rem 0;
	}

	.lessons-list-view {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.lesson-item {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.lesson-item:hover {
		background: var(--muted);
		border-color: var(--primary);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
	}

	.lesson-item:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 2px rgba(var(--primary), 0.2);
	}

	.lesson-content {
		flex: 1;
		min-width: 0;
	}

	.lesson-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--foreground);
		margin: 0 0 0.5rem 0;
		line-height: 1.2;
	}

	.lesson-description {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		line-height: 1.4;
		margin: 0 0 0.75rem 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.lesson-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.lesson-duration,
	.lesson-number {
		background: var(--card);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
	}

	.lesson-arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted-foreground);
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.lesson-item:hover .lesson-arrow {
		color: var(--primary);
		transform: translateX(2px);
	}

	/* Responsive Design */
	@media (max-width: 968px) {
		.header-content {
			flex-direction: column;
			align-items: stretch;
		}

		.header-actions {
			align-items: stretch;
		}

		.action-buttons {
			justify-content: stretch;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.editor-header {
			padding: 1rem;
		}

		.editor-content {
			padding: 1rem;
		}

		.form-section {
			padding: 1.5rem;
		}

		.course-preview {
			flex-direction: column;
		}

		.preview-image {
			width: 100%;
			height: 150px;
		}
	}
</style>
