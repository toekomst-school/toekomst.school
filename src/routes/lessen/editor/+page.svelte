<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { databases } from '$lib/appwrite';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { writable, derived } from 'svelte/store';
	import { EditorView, basicSetup } from 'codemirror';
	import { markdown } from '@codemirror/lang-markdown';
	import { EditorState } from '@codemirror/state';
	import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
	import { tags } from '@lezer/highlight';
	import { marked } from 'marked';

	// Database constants
	const databaseId = 'lessen';
	const collectionId = 'les';

	// UI State
	let activeTab = 'lesson'; // 'lesson' | 'slides' | 'preview'
	let loading = true;
	let saving = false;
	let error = '';

	// Lesson editing mode
	let editing = false;
	let lessonId = '';

	// Lesson form data (from original nieuw page)
	let lesnummer = '';
	let onderwerp = '';
	let doelgroep_min = 3;
	let doelgroep_max = 8;
	let duur = 45;
	let waarom = '';
	let doel = '';
	let cursus = '';
	let cursusOptions: { value: string; label: string }[] = [];
	let cursusLoading = true;
	let kerndoelenSelected: string[] = [];
	let intro = '';
	let kern = '';
	let reflectie = '';
	let evaluatie = '';
	let feedback = '';
	let aanvullend = '';
	let videoUrl = '';
	let videoThumbnail = '';

	// Slides data
	let slidesMarkdown = '';
	let parsedSlides: string[] = [];
	let currentSlideIndex = 0;

	// CodeMirror
	let editorContainer: HTMLElement;
	let editorView: EditorView | null = null;

	// Reveal.js
	let previewContainer: HTMLElement;
	let revealInstance: any;

	// Curriculum standards options (from original)
	const kerndoelenOpties = [
		{
			group: 'Digitale systemen',
			options: [
				{ value: 'ds1', label: 'Digitale systemen' },
				{ value: 'ds2', label: 'Digitale media en informatie' },
				{ value: 'ds3', label: 'Veiligheid en privacy' },
				{ value: 'ds4', label: 'Artificiële intelligentie (AI)' }
			]
		},
		{
			group: 'Ontwerpen en maken',
			options: [{ value: 'om5', label: 'Creëren met digitale technologie' }]
		},
		{
			group: 'Wisselwerking tussen digitale technologie, digitale media, de mens en de samenleving',
			options: [
				{ value: 'ws6', label: 'Digitale technologie, jezelf en de ander' },
				{ value: 'ws6b', label: 'Digitale technologie, jezelf, de ander en de samenleving' }
			]
		}
	];

	const groupOptions = [
		{ value: 1, label: 'Groep 1' },
		{ value: 2, label: 'Groep 2' },
		{ value: 3, label: 'Groep 3' },
		{ value: 4, label: 'Groep 4' },
		{ value: 5, label: 'Groep 5' },
		{ value: 6, label: 'Groep 6' },
		{ value: 7, label: 'Groep 7' },
		{ value: 8, label: 'Groep 8' },
		{ value: 9, label: 'Brugklas' },
		{ value: 10, label: 'Klas 2' },
		{ value: 11, label: 'Klas 3' },
		{ value: 12, label: 'Klas 4' },
		{ value: 13, label: 'Klas 5' },
		{ value: 14, label: 'Klas 6' }
	];

	// Default slides template - generates from lesson data
	function generateDefaultSlides(): string {
		return `# ${onderwerp || 'Nieuwe Les'}

Welkom bij deze les!

---

## Leerdoelen

Aan het einde van deze les kun je:
- ${doel || 'Lesdoelen worden hier getoond...'}

Note:
Dit zijn de hoofddoelen voor deze les.
Houd deze in gedachte tijdens de les.

---

## Waarom deze les?

${waarom || 'Leg hier uit waarom deze les relevant is...'}

--

## Introductie

${intro || 'Les introductie komt hier...'}

Note:
Stel een vraag of geef een voorbeeld om nieuwsgierigheid te wekken.

---

## Kernactiviteit

${kern || 'Hoofdactiviteit beschrijving komt hier...'}

--

### Praktijkopdracht

Hands-on activiteit voor de leerlingen

---

## Reflectie & Afronding  

${reflectie || 'Reflectie activiteit komt hier...'}

Note:
Zorg ervoor dat alle leerdoelen zijn behaald.
Vraag naar feedback van de leerlingen.

---

## Evaluatie

${evaluatie || 'Evaluatie methode komt hier...'}

---

## Bedankt!

🎉 Einde van de les!

Note:
Bedank de leerlingen voor hun deelname.
Geef een vooruitblik op de volgende les.`;
	}

	// Initialize the editor
	async function initializeApp() {
		loading = true;
		try {
			// Fetch course options
			await fetchCursusOptions();

			// Check if we're editing an existing lesson
			const urlParams = $page.url.searchParams;
			const paramLessonId = urlParams.get('id') || urlParams.get('lessonId');

			if (paramLessonId) {
				editing = true;
				lessonId = paramLessonId;
				await loadExistingLesson();
			} else {
				// New lesson - set defaults
				initializeNewLesson(urlParams);
			}

			// Initialize slides if empty
			if (!slidesMarkdown.trim()) {
				slidesMarkdown = generateDefaultSlides();
			}
		} catch (e) {
			error = 'Kon editor niet initialiseren.';
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function fetchCursusOptions() {
		cursusLoading = true;
		try {
			const res = await databases.listDocuments('lessen', 'cursus');
			cursusOptions = res.documents.map((c: any) => ({ value: c.$id, label: c.name }));
		} catch (e) {
			console.error('Could not fetch courses:', e);
		} finally {
			cursusLoading = false;
		}
	}

	async function loadExistingLesson() {
		try {
			const lesson = await databases.getDocument(databaseId, collectionId, lessonId);

			// Load lesson data
			lesnummer = lesson.lesnummer || '';
			onderwerp = lesson.onderwerp || '';
			doelgroep_min = lesson.doelgroep_min ?? 3;
			doelgroep_max = lesson.doelgroep_max ?? 8;
			duur = lesson.duur ?? 45;
			waarom = lesson.waarom || '';
			doel = lesson.doel || '';
			cursus = lesson.cursus || '';
			kerndoelenSelected = lesson.kerndoelen
				? Array.isArray(lesson.kerndoelen)
					? lesson.kerndoelen
					: lesson.kerndoelen.split(',')
				: [];
			intro = lesson.intro || '';
			kern = lesson.kern || '';
			reflectie = lesson.reflectie || '';
			evaluatie = lesson.evaluatie || '';
			feedback = lesson.feedback || '';
			aanvullend = lesson.aanvullend || '';
			videoUrl = lesson.videoUrl || '';
			videoThumbnail = lesson.videoThumbnail || '';

			// Load slides markdown from existing slides field
			slidesMarkdown = lesson.slides || '';
		} catch (e) {
			error = 'Kon les niet laden.';
			console.error(e);
		}
	}

	function initializeNewLesson(urlParams: URLSearchParams) {
		// Prefill some defaults
		doel = 'Aan het einde van deze les kun je ';

		// Prefill cursus from query param if present
		const cursusParam = urlParams.get('cursus');
		if (cursusParam) {
			cursus = cursusParam;
		}

		// Initialize default slides
		slidesMarkdown = generateDefaultSlides();
	}

	// Parse slides for preview (keeping Reveal.js structure)
	function parseSlides(markdown: string): string[] {
		if (!markdown.trim()) return [];

		// For counting purposes, we'll flatten the structure
		// But Reveal.js will handle the actual horizontal/vertical structure
		const horizontalSlides = markdown.split(/^---$/gm).filter((slide) => slide.trim());

		let totalSlideCount = 0;

		horizontalSlides.forEach((horizontalSlide) => {
			if (horizontalSlide.includes('\n--\n')) {
				// This horizontal slide has vertical slides
				const verticalSlides = horizontalSlide.split(/^--$/gm).filter((slide) => slide.trim());
				totalSlideCount += verticalSlides.length;
			} else {
				// Single horizontal slide
				totalSlideCount += 1;
			}
		});

		// Return array with correct count (for UI display)
		return new Array(totalSlideCount).fill('').map((_, i) => `Slide ${i + 1}`);
	}

	// Extract speaker notes from markdown
	function extractSpeakerNotes(markdown: string): string[] {
		const notes: string[] = [];
		const slides = markdown.split(/^---$/gm);

		slides.forEach((slide) => {
			if (!slide.trim()) return;

			if (slide.includes('\n--\n')) {
				// Handle vertical slides
				const verticalSlides = slide.split(/^--$/gm);
				verticalSlides.forEach((verticalSlide) => {
					if (verticalSlide.trim()) {
						const noteMatch = verticalSlide.match(/\nNote:\s*([\s\S]*?)(?=\n---|$)/);
						notes.push(noteMatch ? noteMatch[1].trim() : '');
					}
				});
			} else {
				// Single horizontal slide
				const noteMatch = slide.match(/\nNote:\s*([\s\S]*?)(?=\n---|$)/);
				notes.push(noteMatch ? noteMatch[1].trim() : '');
			}
		});

		return notes;
	}

	// Save lesson and slides
	async function saveLesson() {
		if (!validateLessonForm()) return;

		saving = true;
		error = '';

		try {
			const lessonData = {
				lesnummer,
				onderwerp,
				doelgroep_min,
				doelgroep_max,
				duur,
				waarom,
				doel,
				cursus,
				kerndoelen: kerndoelenSelected.join(','),
				intro,
				kern,
				reflectie,
				evaluatie,
				feedback,
				aanvullend,
				videoUrl,
				videoThumbnail,
				slides: slidesMarkdown // Use existing 'slides' field for markdown content
			};

			if (editing) {
				await databases.updateDocument(databaseId, collectionId, lessonId, lessonData);
			} else {
				const newLesson = await databases.createDocument(
					databaseId,
					collectionId,
					'unique()',
					lessonData
				);
				lessonId = newLesson.$id;
				editing = true;
				// Update URL to reflect we're now editing
				const url = new URL(window.location.href);
				url.searchParams.set('id', lessonId);
				window.history.replaceState({}, '', url.toString());
			}

			console.log(editing ? 'Lesson updated successfully' : 'Lesson created successfully');
		} catch (e) {
			error = editing ? 'Kon les niet bijwerken.' : 'Kon les niet aanmaken.';
			console.error(e);
		} finally {
			saving = false;
		}
	}

	function validateLessonForm(): boolean {
		if (!onderwerp.trim()) {
			error = 'Onderwerp is verplicht.';
			activeTab = 'lesson';
			return false;
		}
		if (!cursus.trim()) {
			error = 'Selecteer een cursus.';
			activeTab = 'lesson';
			return false;
		}
		return true;
	}

	// Reveal.js markdown highlighting theme
	const revealHighlightStyle = HighlightStyle.define([
		{ tag: tags.heading1, color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.4em' },
		{ tag: tags.heading2, color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2em' },
		{ tag: tags.heading3, color: 'var(--accent)', fontWeight: 'bold' },
		{ tag: tags.strong, color: 'var(--accent)', fontWeight: 'bold' },
		{ tag: tags.emphasis, color: 'var(--warning)', fontStyle: 'italic' },
		{ tag: tags.link, color: 'var(--primary)', textDecoration: 'underline' },
		{
			tag: tags.monospace,
			backgroundColor: 'var(--muted)',
			padding: '0.2em 0.4em',
			borderRadius: '4px'
		},
		{
			tag: tags.contentSeparator,
			color: 'var(--warning)',
			fontWeight: 'bold',
			backgroundColor: 'var(--muted)'
		}
	]);

	// Initialize CodeMirror editor
	function initializeCodeMirror() {
		if (!editorContainer || editorView) return;

		const state = EditorState.create({
			doc: slidesMarkdown,
			extensions: [
				basicSetup,
				markdown(),
				syntaxHighlighting(revealHighlightStyle),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						slidesMarkdown = update.state.doc.toString();
						updatePreview();
						scheduleAutoSave();
					}
				}),
				EditorView.theme({
					'&': {
						height: '100%',
						backgroundColor: 'var(--background)',
						color: 'var(--foreground)'
					},
					'.cm-content': {
						backgroundColor: 'var(--background)',
						color: 'var(--foreground)',
						caretColor: 'var(--accent)',
						fontSize: '14px',
						lineHeight: '1.6',
						padding: '1rem'
					},
					'.cm-focused': {
						outline: 'none'
					},
					'.cm-editor': {
						backgroundColor: 'var(--background)',
						height: '100%'
					},
					'.cm-scroller': {
						fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
						backgroundColor: 'var(--background)'
					},
					'.cm-gutters': {
						backgroundColor: 'var(--card)',
						color: 'var(--muted-foreground)',
						borderRight: '1px solid var(--border)'
					},
					// Highlight slide separators
					'.cm-line': {
						'&:has(.cm-separator)': {
							backgroundColor: 'var(--muted)',
							fontWeight: 'bold'
						}
					}
				})
			]
		});

		editorView = new EditorView({
			state,
			parent: editorContainer
		});
	}

	// Update Reveal.js preview
	function updatePreview() {
		parsedSlides = parseSlides(slidesMarkdown);

		if (previewContainer && typeof window !== 'undefined' && activeTab === 'preview') {
			initializeRevealPreview();
		}
	}

	async function initializeRevealPreview() {
		if (!previewContainer) return;

		// Load Reveal.js if not already loaded
		if (typeof window !== 'undefined' && !(window as any).Reveal) {
			await loadRevealJS();
		}

		// Clear existing content
		previewContainer.innerHTML = '';

		// Create reveal container
		const revealDiv = document.createElement('div');
		revealDiv.className = 'reveal';

		const slidesDiv = document.createElement('div');
		slidesDiv.className = 'slides';

		// Process markdown with native Reveal.js markdown structure
		const horizontalSlides = slidesMarkdown.split(/^---$/gm).filter((slide) => slide.trim());

		horizontalSlides.forEach((horizontalSlide, hIndex) => {
			if (horizontalSlide.includes('\n--\n')) {
				// This horizontal slide contains vertical slides
				const verticalSlides = horizontalSlide.split(/^--$/gm).filter((slide) => slide.trim());

				verticalSlides.forEach((verticalSlide, vIndex) => {
					const section = document.createElement('section');

					// Extract content without speaker notes for display
					const slideContent = verticalSlide.replace(/\nNote:\s*[\s\S]*?(?=\n---|$)/g, '');
					section.innerHTML = marked(slideContent.trim());

					// Extract and add speaker notes as data attribute
					const noteMatch = verticalSlide.match(/\nNote:\s*([\s\S]*?)(?=\n---|$)/);
					if (noteMatch) {
						section.setAttribute('data-notes', noteMatch[1].trim());
					}

					// Set data attributes for Reveal.js
					section.setAttribute('data-slide-number', `${hIndex}-${vIndex}`);

					slidesDiv.appendChild(section);
				});
			} else {
				// Single horizontal slide
				const section = document.createElement('section');

				// Extract content without speaker notes
				const slideContent = horizontalSlide.replace(/\nNote:\s*[\s\S]*?(?=\n---|$)/g, '');
				section.innerHTML = marked(slideContent.trim());

				// Extract and add speaker notes
				const noteMatch = horizontalSlide.match(/\nNote:\s*([\s\S]*?)(?=\n---|$)/);
				if (noteMatch) {
					section.setAttribute('data-notes', noteMatch[1].trim());
				}

				section.setAttribute('data-slide-number', hIndex.toString());

				slidesDiv.appendChild(section);
			}
		});

		revealDiv.appendChild(slidesDiv);
		previewContainer.appendChild(revealDiv);

		// Initialize Reveal.js
		if ((window as any).Reveal && revealDiv) {
			if (revealInstance) {
				revealInstance.destroy();
			}

			const Reveal = (window as any).Reveal;
			revealInstance = new Reveal(revealDiv, {
				hash: false,
				center: true,
				transition: 'slide',
				transitionSpeed: 'default',
				backgroundTransition: 'fade',
				controls: true,
				controlsLayout: 'bottom-right',
				controlsBackArrows: 'faded',
				progress: true,
				keyboard: true,
				touch: true,
				fragments: true,
				fragmentInURL: false,
				embedded: true,
				width: '100%',
				height: '100%',
				margin: 0.1,
				minScale: 0.2,
				maxScale: 2.0,
				// Enable speaker notes
				showNotes: false, // Don't show in preview, but data is available
				dependencies: []
			});

			await revealInstance.initialize();

			// Add event listener for slide changes to update counter
			revealInstance.addEventListener('slidechanged', (event: any) => {
				currentSlideIndex = event.indexh + (event.indexv || 0);
			});
		}
	}

	// Load Reveal.js dynamically
	async function loadRevealJS(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (typeof window !== 'undefined' && (window as any).Reveal) {
				resolve();
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.js';
			script.onload = () => resolve();
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	// Auto-save functionality
	let autoSaveTimeout: number;
	function scheduleAutoSave() {
		clearTimeout(autoSaveTimeout);
		autoSaveTimeout = setTimeout(() => {
			if (editing && lessonId) {
				saveLesson();
			}
		}, 2000);
	}

	// Tab switching
	function switchTab(tab: string) {
		activeTab = tab;

		// Initialize components when switching to their tabs
		if (tab === 'slides') {
			// Regenerate slides template if slides are empty or default
			if (!slidesMarkdown.trim() || slidesMarkdown === generateDefaultSlides()) {
				slidesMarkdown = generateDefaultSlides();
			}

			if (!editorView) {
				setTimeout(() => initializeCodeMirror(), 100);
			} else {
				// Update editor content if it exists
				const transaction = editorView.state.update({
					changes: { from: 0, to: editorView.state.doc.length, insert: slidesMarkdown }
				});
				editorView.dispatch(transaction);
			}
		} else if (tab === 'preview') {
			setTimeout(() => updatePreview(), 100);
		}
	}

	// Lifecycle
	onMount(() => {
		initializeApp();
	});

	onDestroy(() => {
		if (revealInstance) {
			revealInstance.destroy();
		}
		if (editorView) {
			editorView.destroy();
		}
		clearTimeout(autoSaveTimeout);
	});
</script>

<svelte:head>
	<title>{editing ? 'Les Bewerken' : 'Nieuwe Les'} - Toekomst School</title>

	<!-- Reveal.js CSS -->
	{#if activeTab === 'preview'}
		<link
			rel="stylesheet"
			href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.css"
		/>
		<link
			rel="stylesheet"
			href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/theme/white.min.css"
		/>
	{/if}
</svelte:head>

<div class="lesson-editor">
	<!-- Header -->
	<header class="editor-header">
		<div class="header-content">
			<div class="header-left">
				<h1>{editing ? 'Les Bewerken' : 'Nieuwe Les'}</h1>
				{#if onderwerp}
					<p class="lesson-title">{onderwerp}</p>
				{/if}
			</div>

			<div class="header-actions">
				{#if lessonId}
					<button class="btn secondary" on:click={() => goto(`/lessen/${lessonId}`)}>
						← Terug naar Les
					</button>
				{:else}
					<button class="btn secondary" on:click={() => goto('/lessen')}>
						← Terug naar Lessen
					</button>
				{/if}
				<button class="btn primary" on:click={saveLesson} disabled={saving || loading}>
					{#if saving}
						<div class="spinner"></div>
					{/if}
					{editing ? 'Bijwerken' : 'Aanmaken'}
				</button>
			</div>
		</div>

		<!-- Tab Navigation -->
		<nav class="tab-nav">
			<button
				class="tab-btn"
				class:active={activeTab === 'lesson'}
				on:click={() => switchTab('lesson')}
			>
				📝 Les Details
			</button>
			<button
				class="tab-btn"
				class:active={activeTab === 'slides'}
				on:click={() => switchTab('slides')}
			>
				🎯 Slides (Markdown)
			</button>
			<button
				class="tab-btn"
				class:active={activeTab === 'preview'}
				on:click={() => switchTab('preview')}
			>
				👁️ Preview
			</button>
		</nav>
	</header>

	<!-- Error Display -->
	{#if error}
		<div class="error-banner">
			⚠️ {error}
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading}
		<div class="loading-container">
			<div class="spinner large"></div>
			<p>Editor laden...</p>
		</div>
	{:else}
		<!-- Tab Content -->
		<main class="tab-content">
			<!-- Lesson Details Tab -->
			{#if activeTab === 'lesson'}
				<div class="lesson-form-container">
					<form class="lesson-form" on:submit|preventDefault={saveLesson}>
						<!-- Basic Info Section -->
						<section class="form-section">
							<h2>Basis Informatie</h2>
							<div class="form-grid">
								<div class="form-field">
									<label for="cursus">Cursus *</label>
									{#if cursusLoading}
										<div class="loading-text">Cursussen laden...</div>
									{:else if cursusOptions.length === 0}
										<select id="cursus" disabled>
											<option>Geen cursussen beschikbaar</option>
										</select>
										<small class="error">Maak eerst een cursus aan.</small>
									{:else}
										<select id="cursus" bind:value={cursus} required>
											<option value="">Selecteer een cursus...</option>
											{#each cursusOptions as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									{/if}
								</div>

								<div class="form-field">
									<label for="lesnummer">Lesnummer</label>
									<input
										id="lesnummer"
										type="text"
										bind:value={lesnummer}
										placeholder="1, 2, 3..."
										required
									/>
								</div>
							</div>

							<div class="form-field">
								<label for="onderwerp">Onderwerp van de les *</label>
								<input
									id="onderwerp"
									type="text"
									bind:value={onderwerp}
									placeholder="Bijvoorbeeld: Veilig online communiceren"
									required
								/>
							</div>

							<div class="form-field">
								<label>Doelgroep</label>
								<div class="doelgroep-selector">
									<div class="group-select">
										<label>Van:</label>
										<select bind:value={doelgroep_min}>
											{#each groupOptions as opt}
												<option value={opt.value} disabled={opt.value > doelgroep_max}>
													{opt.label}
												</option>
											{/each}
										</select>
									</div>
									<div class="group-select">
										<label>Tot:</label>
										<select bind:value={doelgroep_max}>
											{#each groupOptions as opt}
												<option value={opt.value} disabled={opt.value < doelgroep_min}>
													{opt.label}
												</option>
											{/each}
										</select>
									</div>
								</div>
								<small class="help-text">
									{doelgroep_min === doelgroep_max
										? `${groupOptions.find((g) => g.value === doelgroep_min)?.label} (${doelgroep_min + 3}-${doelgroep_min + 4} jaar)`
										: `${groupOptions.find((g) => g.value === doelgroep_min)?.label} tot ${groupOptions.find((g) => g.value === doelgroep_max)?.label}`}
								</small>
							</div>

							<div class="form-field">
								<label for="duur">Duur (minuten)</label>
								<div class="duration-input">
									<input id="duur" type="range" min="15" max="180" step="5" bind:value={duur} />
									<input
										type="number"
										min="15"
										max="180"
										step="5"
										bind:value={duur}
										class="duration-number"
									/>
									<span class="duration-display">
										{duur} min ({Math.floor(duur / 60)}u {duur % 60}m)
									</span>
								</div>
							</div>
						</section>

						<!-- Learning Objectives Section -->
						<section class="form-section">
							<h2>Leerdoelen & Relevantie</h2>

							<div class="form-field">
								<label for="waarom">Waarom deze les?</label>
								<textarea
									id="waarom"
									bind:value={waarom}
									placeholder="Leg kort uit waarom deze les relevant is..."
									required
								></textarea>
							</div>

							<div class="form-field">
								<label for="doel">Doel van de les</label>
								<textarea
									id="doel"
									bind:value={doel}
									placeholder="Aan het einde van deze les kun je..."
									required
								></textarea>
							</div>

							<div class="form-field">
								<label>Kerndoelen</label>
								<div class="kerndoelen-grid">
									{#each kerndoelenOpties as groep}
										<div class="kerndoel-group">
											<h4>{groep.group}</h4>
											{#each groep.options as optie}
												<label class="checkbox-label">
													<input
														type="checkbox"
														value={optie.value}
														bind:group={kerndoelenSelected}
													/>
													{optie.label}
												</label>
											{/each}
										</div>
									{/each}
								</div>
							</div>
						</section>

						<!-- Lesson Structure Section -->
						<section class="form-section">
							<h2>Les Structuur</h2>

							<div class="form-field">
								<label for="intro">Introductie (5-10 min)</label>
								<textarea
									id="intro"
									bind:value={intro}
									placeholder="Korte uitleg van de les en de doelen..."
									required
								></textarea>
							</div>

							<div class="form-field">
								<label for="kern">Kernactiviteit (20-30 min)</label>
								<textarea
									id="kern"
									bind:value={kern}
									placeholder="Beschrijving van de hoofdactiviteit(en)..."
									required
								></textarea>
							</div>

							<div class="form-field">
								<label for="reflectie">Reflectie en Afronding (5-10 min)</label>
								<textarea
									id="reflectie"
									bind:value={reflectie}
									placeholder="Bespreek wat ze hebben geleerd..."
									required
								></textarea>
							</div>
						</section>

						<!-- Assessment Section -->
						<section class="form-section">
							<h2>Evaluatie & Feedback</h2>

							<div class="form-field">
								<label for="evaluatie">Evaluatie van Leerlingen</label>
								<textarea
									id="evaluatie"
									bind:value={evaluatie}
									placeholder="Hoe toets je of de leerlingen het doel hebben bereikt?"
									required
								></textarea>
							</div>

							<div class="form-field">
								<label for="feedback">Feedback voor de Les</label>
								<textarea
									id="feedback"
									bind:value={feedback}
									placeholder="Reflectie voor de leraar: Wat ging goed? Wat kan beter?"
									required
								></textarea>
							</div>

							<div class="form-field">
								<label for="aanvullend">Aanvullende Opdrachten (optioneel)</label>
								<textarea
									id="aanvullend"
									bind:value={aanvullend}
									placeholder="Suggesties voor leerlingen die extra uitdaging nodig hebben..."
								></textarea>
							</div>
						</section>

						<!-- Media Section -->
						<section class="form-section">
							<h2>Media & Bronnen</h2>

							<div class="form-field">
								<label for="videoUrl">Video URL (optioneel)</label>
								<input
									id="videoUrl"
									type="url"
									bind:value={videoUrl}
									placeholder="https://edflix.nl/videos/watch/xyz"
								/>
								<small class="help-text">Voeg een Edflix.nl (Peertube) video-URL toe.</small>
								{#if videoUrl}
									<div class="video-preview">
										<video
											src={videoUrl}
											controls
											poster={videoThumbnail}
											style="max-width: 100%; max-height: 200px;"
										></video>
									</div>
								{/if}
							</div>

							<div class="form-field">
								<label for="videoThumbnail">Video Thumbnail URL (optioneel)</label>
								<input
									id="videoThumbnail"
									type="url"
									bind:value={videoThumbnail}
									placeholder="URL naar preview afbeelding"
								/>
								{#if videoThumbnail}
									<div class="thumbnail-preview">
										<img
											src={videoThumbnail}
											alt="Video preview"
											style="max-width: 100%; max-height: 120px; border-radius: 8px;"
										/>
									</div>
								{/if}
							</div>
						</section>
					</form>
				</div>
			{/if}

			<!-- Slides Tab -->
			{#if activeTab === 'slides'}
				<div class="slides-editor-container">
					<div class="slides-toolbar">
						<div class="toolbar-group">
							<button
								class="btn small"
								on:click={() => {
									if (editorView) {
										const pos = editorView.state.selection.main.head;
										editorView.dispatch({
											changes: {
												from: pos,
												insert: '\n\n---\n\n# Nieuwe Slide\n\nInhoud hier...\n'
											}
										});
									}
								}}
							>
								+ Horizontale Slide
							</button>
							<button
								class="btn small"
								on:click={() => {
									if (editorView) {
										const pos = editorView.state.selection.main.head;
										editorView.dispatch({
											changes: {
												from: pos,
												insert: '\n\n--\n\n## Verticale Slide\n\nInhoud hier...\n'
											}
										});
									}
								}}
							>
								+ Verticale Slide
							</button>
							<button
								class="btn small"
								on:click={() => {
									if (editorView) {
										const pos = editorView.state.selection.main.head;
										editorView.dispatch({
											changes: { from: pos, insert: '\n\nNote:\nSprekers notities hier...\n' }
										});
									}
								}}
							>
								+ Speaker Notes
							</button>
							<button
								class="btn small"
								on:click={() => {
									// Regenerate slides from current lesson data
									const newSlides = generateDefaultSlides();
									slidesMarkdown = newSlides;
									if (editorView) {
										const transaction = editorView.state.update({
											changes: { from: 0, to: editorView.state.doc.length, insert: newSlides }
										});
										editorView.dispatch(transaction);
									}
								}}
							>
								🔄 Sync met Les Data
							</button>
						</div>

						<div class="toolbar-group">
							<span class="slide-count">
								{parsedSlides.length} slides
							</span>
						</div>
					</div>

					<div class="slides-editor" bind:this={editorContainer}></div>

					<div class="slides-help">
						<details>
							<summary>📖 Markdown Hulp</summary>
							<div class="help-content">
								<h4>Slide Scheiders:</h4>
								<p><code>---</code> = Nieuwe horizontale slide</p>
								<p><code>--</code> = Nieuwe verticale slide (sub-slide)</p>

								<h4>Speaker Notes:</h4>
								<p><code>Note:<br />Jouw notities hier...</code></p>

								<h4>Fragments (stapsgewijze onthulling):</h4>
								<p><code>&lt;!-- .element: class="fragment" --&gt;</code></p>
							</div>
						</details>
					</div>
				</div>
			{/if}

			<!-- Preview Tab -->
			{#if activeTab === 'preview'}
				<div class="preview-container-wrapper">
					<div class="preview-toolbar">
						<div class="toolbar-group">
							<span class="slide-counter">
								Slide 1 van {parsedSlides.length}
							</span>
						</div>

						<div class="toolbar-group">
							<button
								class="btn primary"
								on:click={() => {
									if (lessonId) {
										goto(`/present?lesson=${lessonId}`);
									}
								}}
								disabled={!lessonId}
							>
								🎯 Start Presentatie
							</button>
						</div>
					</div>

					<div class="preview-container" bind:this={previewContainer}>
						{#if parsedSlides.length === 0}
							<div class="empty-preview">
								<h3>Geen slides beschikbaar</h3>
								<p>Ga naar de "Slides" tab om slides toe te voegen.</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</main>
	{/if}
</div>

<style>
	.lesson-editor {
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--background);
		color: var(--foreground);
	}

	/* Header */
	.editor-header {
		background: var(--card);
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.header-left h1 {
		margin: 0;
		font-size: 1.5rem;
		color: var(--foreground);
	}

	.lesson-title {
		margin: 0.25rem 0 0 0;
		color: var(--muted-foreground);
		font-size: 0.9rem;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	/* Tab Navigation */
	.tab-nav {
		display: flex;
		background: var(--muted);
		border-top: 1px solid var(--border);
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.tab-btn {
		background: none;
		border: none;
		padding: 1rem 1.5rem;
		cursor: pointer;
		color: var(--muted-foreground);
		font-weight: 500;
		border-bottom: 3px solid transparent;
		transition: all 0.2s ease;
	}

	.tab-btn:hover {
		color: var(--foreground);
		background: var(--card);
	}

	.tab-btn.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
		background: var(--background);
	}

	/* Content */
	.tab-content {
		flex: 1;
		overflow: auto;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
	}

	/* Error Banner */
	.error-banner {
		background: var(--destructive);
		color: white;
		padding: 1rem 2rem;
		text-align: center;
		font-weight: 500;
	}

	/* Loading */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: 1rem;
	}

	/* Lesson Form */
	.lesson-form-container {
		padding: 2rem;
	}

	.lesson-form {
		max-width: 800px;
		margin: 0 auto;
	}

	.form-section {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.form-section h2 {
		margin: 0 0 1.5rem 0;
		color: var(--accent);
		font-size: 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--muted);
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-field label {
		font-weight: 600;
		color: var(--foreground);
	}

	.form-field input,
	.form-field textarea,
	.form-field select {
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--input);
		color: var(--foreground);
		font-size: 1rem;
		transition: border-color 0.2s ease;
	}

	.form-field input:focus,
	.form-field textarea:focus,
	.form-field select:focus {
		outline: none;
		border-color: var(--accent);
	}

	.form-field textarea {
		resize: vertical;
		min-height: 100px;
	}

	.help-text,
	.form-field small {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.error {
		color: var(--destructive);
	}

	/* Doelgroep Selector */
	.doelgroep-selector {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.group-select {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.group-select label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	/* Duration Input */
	.duration-input {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.duration-input input[type='range'] {
		flex: 1;
	}

	.duration-number {
		width: 80px;
		text-align: center;
	}

	.duration-display {
		font-weight: 600;
		color: var(--accent);
		min-width: 120px;
	}

	/* Kerndoelen */
	.kerndoelen-grid {
		display: grid;
		gap: 1.5rem;
	}

	.kerndoel-group h4 {
		margin: 0 0 0.75rem 0;
		color: var(--accent);
		font-size: 1rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		font-weight: normal;
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		width: auto;
		margin: 0;
	}

	/* Media Preview */
	.video-preview,
	.thumbnail-preview {
		margin-top: 0.5rem;
		border-radius: var(--radius);
		overflow: hidden;
	}

	/* Slides Editor */
	.slides-editor-container {
		height: calc(100vh - 200px);
		display: flex;
		flex-direction: column;
		padding: 1rem 2rem;
	}

	.slides-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-bottom: none;
		border-radius: var(--radius) var(--radius) 0 0;
	}

	.toolbar-group {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.slides-editor {
		flex: 1;
		border: 1px solid var(--border);
		background: var(--card);
	}

	.slides-help {
		background: var(--card);
		border: 1px solid var(--border);
		border-top: none;
		border-radius: 0 0 var(--radius) var(--radius);
		padding: 1rem;
	}

	.slides-help details {
		cursor: pointer;
	}

	.slides-help summary {
		font-weight: 600;
		color: var(--accent);
	}

	.help-content {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.help-content h4 {
		margin: 0 0 0.5rem 0;
		color: var(--foreground);
	}

	.help-content p {
		margin: 0.25rem 0;
		font-family: 'Monaco', 'Menlo', monospace;
	}

	.help-content code {
		background: var(--muted);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.slide-count {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	/* Preview */
	.preview-container-wrapper {
		height: calc(100vh - 200px);
		display: flex;
		flex-direction: column;
		padding: 1rem 2rem;
	}

	.preview-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-bottom: none;
		border-radius: var(--radius) var(--radius) 0 0;
	}

	.preview-container {
		flex: 1;
		border: 1px solid var(--border);
		border-radius: 0 0 var(--radius) var(--radius);
		background: var(--card);
		overflow: hidden;
	}

	.empty-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--muted-foreground);
		text-align: center;
	}

	.slide-counter {
		font-size: 0.9rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--card-foreground);
		text-decoration: none;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.btn:hover {
		background: var(--muted);
	}

	.btn.primary {
		background: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
	}

	.btn.primary:hover {
		background: var(--accent);
		border-color: var(--accent);
	}

	.btn.secondary {
		background: var(--muted);
		color: var(--muted-foreground);
	}

	.btn.small {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn:disabled:hover {
		background: var(--card);
	}

	.btn.primary:disabled:hover {
		background: var(--primary);
	}

	/* Spinner */
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.spinner.large {
		width: 32px;
		height: 32px;
		border-width: 3px;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Responsive */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.tab-nav {
			padding: 0 1rem;
		}

		.tab-content {
			padding: 1rem;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.doelgroep-selector {
			flex-direction: column;
			align-items: stretch;
		}

		.slides-editor-container,
		.preview-container-wrapper {
			padding: 1rem;
			height: calc(100vh - 250px);
		}
	}
</style>
