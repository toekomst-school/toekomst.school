<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { marked } from 'marked';
	import { animate } from 'animejs';
	import { EditorView, basicSetup } from 'codemirror';
	import { markdown } from '@codemirror/lang-markdown';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorState } from '@codemirror/state';

	let markdownContent = `# Welcome to the Advanced Slideshow Editor
	
Create professional presentations with animations and interactive elements.

---

## Features

- Live preview with animations
- Markdown-based editing
- Custom animation controls
- Professional themes
- Export capabilities

---

## Getting Started

1. Write your slides in Markdown
2. Separate slides with \`---\`  
3. Preview in real-time
4. Add animations and effects
5. Present or export

---

## Animation Examples

<div class="fragment fade-in">This text fades in</div>
<div class="fragment slide-up">This slides up</div>
<div class="fragment scale-in">This scales in</div>

---

## Thank You!

Ready to create amazing presentations?`;

	let parsedSlides: string[] = [];
	let currentSlideIndex = 0;
	let previewMode = 'edit'; // 'edit' or 'fullscreen'
	let selectedTheme = 'white';
	let animationPreset = 'fade';
	let revealInstance: any;
	let previewContainer: HTMLElement;
	let editorContainer: HTMLElement;
	let editorView: EditorView | null = null;
	let sidebarCollapsed = false;
	
	// Animation presets
	const animationPresets = {
		fade: 'Fade In',
		slide: 'Slide In',
		zoom: 'Zoom In',
		flip: 'Flip In'
	};
	
	const themes = {
		white: 'White',
		black: 'Black', 
		beige: 'Beige',
		sky: 'Sky',
		night: 'Night'
	};

	// Parse markdown into slides
	function parseSlides(markdown: string): string[] {
		const slides = markdown.split('---').map(slide => {
			const trimmed = slide.trim();
			return marked(trimmed);
		}).filter(slide => slide.length > 0);
		
		return slides;
	}

	// Initialize and update preview
	function updatePreview() {
		parsedSlides = parseSlides(markdownContent);
		
		if (previewContainer && typeof window !== 'undefined') {
			// Clear existing content
			previewContainer.innerHTML = '';
			
			// Create reveal container
			const revealDiv = document.createElement('div');
			revealDiv.className = 'reveal';
			
			const slidesDiv = document.createElement('div');
			slidesDiv.className = 'slides';
			
			// Add parsed slides
			parsedSlides.forEach((slide, index) => {
				const section = document.createElement('section');
				section.innerHTML = slide;
				section.setAttribute('data-slide-number', index.toString());
				slidesDiv.appendChild(section);
			});
			
			revealDiv.appendChild(slidesDiv);
			previewContainer.appendChild(revealDiv);
			
			// Initialize or reinitialize Reveal.js
			initializeReveal(revealDiv);
		}
	}

	// Initialize Reveal.js for preview
	async function initializeReveal(container: HTMLElement) {
		if (revealInstance) {
			revealInstance.destroy();
		}
		
		// Load Reveal.js if not already loaded
		if (typeof window !== 'undefined' && !(window as any).Reveal) {
			await loadRevealJS();
		}
		
		if ((window as any).Reveal) {
			const Reveal = (window as any).Reveal;
			revealInstance = new Reveal(container, {
				hash: false,
				center: true,
				transition: animationPreset === 'fade' ? 'fade' : 
				           animationPreset === 'slide' ? 'slide' : 
				           animationPreset === 'zoom' ? 'zoom' : 'fade',
				transitionSpeed: 'default',
				backgroundTransition: 'fade',
				controls: true,
				progress: true,
				keyboard: true,
				touch: true,
				fragments: true,
				embedded: previewMode === 'edit',
				theme: selectedTheme,
				width: previewMode === 'edit' ? '100%' : 960,
				height: previewMode === 'edit' ? '100%' : 700,
				minScale: previewMode === 'edit' ? 0.5 : 0.2,
				maxScale: previewMode === 'edit' ? 1.2 : 2.0
			});
			
			await revealInstance.initialize();
			
			// Go to current slide
			if (currentSlideIndex < parsedSlides.length) {
				revealInstance.slide(currentSlideIndex);
			}
			
			// Listen for slide changes in preview
			revealInstance.addEventListener('slidechanged', (event: any) => {
				currentSlideIndex = event.indexh;
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

	// Navigate slides in editor
	function goToSlide(index: number) {
		currentSlideIndex = index;
		if (revealInstance) {
			revealInstance.slide(index);
		}
	}

	function previousSlide() {
		if (currentSlideIndex > 0) {
			goToSlide(currentSlideIndex - 1);
		}
	}

	function nextSlide() {
		if (currentSlideIndex < parsedSlides.length - 1) {
			goToSlide(currentSlideIndex + 1);
		}
	}

	// Add new slide
	function addSlide() {
		const newSlide = '\n\n---\n\n## New Slide\n\nAdd your content here...\n';
		markdownContent += newSlide;
		if (editorView) {
			// Update the editor content
			const transaction = editorView.state.update({
				changes: {from: editorView.state.doc.length, insert: newSlide}
			});
			editorView.dispatch(transaction);
		}
		updatePreview();
		// Go to the new slide
		setTimeout(() => {
			goToSlide(parsedSlides.length - 1);
		}, 100);
	}

	// Initialize CodeMirror editor
	function initializeCodeMirror() {
		if (!editorContainer || editorView) return;
		
		const state = EditorState.create({
			doc: markdownContent,
			extensions: [
				basicSetup,
				markdown(),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						markdownContent = update.state.doc.toString();
						updatePreview();
						scheduleAutoSave();
					}
				}),
				EditorView.theme({
					'&': {height: '100%'},
					'.cm-scroller': {fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace'},
					'.cm-focused': {outline: 'none'}
				})
			]
		});
		
		editorView = new EditorView({
			state,
			parent: editorContainer
		});
	}

	// Export presentation
	function exportPresentation() {
		const blob = new Blob([markdownContent], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'presentation.md';
		a.click();
		URL.revokeObjectURL(url);
	}

	// Toggle preview mode
	function togglePreviewMode() {
		previewMode = previewMode === 'edit' ? 'fullscreen' : 'edit';
		updatePreview();
	}

	// Auto-save functionality
	let autoSaveTimeout: number;
	function scheduleAutoSave() {
		clearTimeout(autoSaveTimeout);
		autoSaveTimeout = setTimeout(() => {
			// In a real app, this would save to a backend
			localStorage.setItem('slideshow-draft', markdownContent);
			console.log('Auto-saved presentation');
		}, 2000);
	}

	// Load saved draft
	function loadDraft() {
		const saved = localStorage.getItem('slideshow-draft');
		if (saved) {
			markdownContent = saved;
		}
	}

	// Handle theme change
	function handleThemeChange() {
		updatePreview();
	}

	// Handle animation preset change
	function handleAnimationChange() {
		updatePreview();
	}

	onMount(() => {
		loadDraft();
		updatePreview();
		// Initialize CodeMirror after DOM is ready
		setTimeout(initializeCodeMirror, 100);
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

<!-- Include Reveal.js CSS -->
<svelte:head>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.css" />
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/theme/{selectedTheme}.min.css" />
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css" />
	<style>
		.editor-container {
			height: 100vh;
			display: flex;
			overflow: hidden;
		}
		
		.sidebar {
			width: 280px;
			background: #f8f9fa;
			border-right: 1px solid #e9ecef;
			display: flex;
			flex-direction: column;
			transition: width 0.3s ease;
		}
		
		.sidebar.collapsed {
			width: 60px;
		}
		
		.sidebar-header {
			padding: 1rem;
			border-bottom: 1px solid #e9ecef;
			background: white;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		
		.main-content {
			flex: 1;
			display: flex;
			flex-direction: column;
		}
		
		.editor-toolbar {
			display: flex;
			align-items: center;
			gap: 1rem;
			padding: 0.75rem 1rem;
			background: white;
			border-bottom: 1px solid #e9ecef;
			flex-wrap: wrap;
		}
		
		.editor-panes {
			flex: 1;
			display: flex;
			overflow: hidden;
		}
		
		.editor-pane {
			flex: 1;
			display: flex;
			flex-direction: column;
		}
		
		.preview-pane {
			flex: 1;
			border-left: 1px solid #e9ecef;
			position: relative;
		}
		
		.editor-codemirror {
			flex: 1;
			overflow: hidden;
			background: #fafafa;
		}
		
		.preview-container {
			height: 100%;
			overflow: hidden;
			background: white;
		}
		
		.slide-thumbnails {
			padding: 1rem;
			overflow-y: auto;
		}
		
		.thumbnail {
			width: 100%;
			height: 60px;
			border: 2px solid #e9ecef;
			border-radius: 4px;
			margin-bottom: 0.5rem;
			cursor: pointer;
			background: white;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 12px;
			color: #666;
			transition: all 0.2s ease;
		}
		
		.thumbnail:hover {
			border-color: #007bff;
		}
		
		.thumbnail.active {
			border-color: #007bff;
			background: #e3f2fd;
		}
		
		.btn {
			padding: 0.5rem 1rem;
			border: 1px solid #dee2e6;
			background: white;
			color: #495057;
			cursor: pointer;
			border-radius: 4px;
			transition: all 0.2s ease;
		}
		
		.btn:hover {
			background: #f8f9fa;
		}
		
		.btn.primary {
			background: #007bff;
			color: white;
			border-color: #007bff;
		}
		
		.btn.primary:hover {
			background: #0056b3;
		}
		
		.btn.success {
			background: #28a745;
			color: white;
			border-color: #28a745;
		}
		
		.btn.success:hover {
			background: #1e7e34;
		}
		
		select {
			padding: 0.5rem;
			border: 1px solid #dee2e6;
			border-radius: 4px;
			background: white;
		}
		
		.collapse-btn {
			background: none;
			border: none;
			font-size: 1.2rem;
			cursor: pointer;
			color: #666;
		}
		
		.slide-counter {
			color: #666;
			font-size: 0.9rem;
		}
	</style>
</svelte:head>

<div class="editor-container">
	<!-- Sidebar -->
	<div class="sidebar" class:collapsed={sidebarCollapsed}>
		<div class="sidebar-header">
			{#if !sidebarCollapsed}
				<h3 style="margin: 0; font-size: 1.1rem;">Slides</h3>
			{/if}
			<button class="collapse-btn" on:click={() => sidebarCollapsed = !sidebarCollapsed}>
				{sidebarCollapsed ? '→' : '←'}
			</button>
		</div>
		
		{#if !sidebarCollapsed}
			<div class="slide-thumbnails">
				{#each parsedSlides as slide, index}
					<button 
						class="thumbnail" 
						class:active={index === currentSlideIndex}
						on:click={() => goToSlide(index)}
						title="Slide {index + 1}"
					>
						Slide {index + 1}
					</button>
				{/each}
				
				<button class="btn" style="width: 100%; margin-top: 0.5rem;" on:click={addSlide}>
					+ Add Slide
				</button>
			</div>
		{/if}
	</div>

	<!-- Main Content -->
	<div class="main-content">
		<!-- Toolbar -->
		<div class="editor-toolbar">
			<select bind:value={selectedTheme} on:change={handleThemeChange}>
				{#each Object.entries(themes) as [value, label]}
					<option {value}>{label}</option>
				{/each}
			</select>
			
			<select bind:value={animationPreset} on:change={handleAnimationChange}>
				{#each Object.entries(animationPresets) as [value, label]}
					<option {value}>{label}</option>
				{/each}
			</select>
			
			<div style="flex: 1;"></div>
			
			<span class="slide-counter">
				Slide {currentSlideIndex + 1} of {parsedSlides.length}
			</span>
			
			<button class="btn" on:click={previousSlide} disabled={currentSlideIndex === 0}>
				← Previous
			</button>
			
			<button class="btn" on:click={nextSlide} disabled={currentSlideIndex >= parsedSlides.length - 1}>
				Next →
			</button>
			
			<button class="btn primary" on:click={togglePreviewMode}>
				{previewMode === 'edit' ? 'Fullscreen' : 'Edit Mode'}
			</button>
			
			<button class="btn success" on:click={exportPresentation}>
				Export
			</button>
		</div>

		<!-- Editor Panes -->
		<div class="editor-panes">
			{#if previewMode === 'edit'}
				<!-- Split view: Editor + Preview -->
				<div class="editor-pane">
					<div bind:this={editorContainer} class="editor-codemirror"></div>
				</div>
				
				<div class="preview-pane">
					<div bind:this={previewContainer} class="preview-container"></div>
				</div>
			{:else}
				<!-- Fullscreen preview -->
				<div class="preview-pane" style="border-left: none;">
					<div bind:this={previewContainer} class="preview-container"></div>
				</div>
			{/if}
		</div>
	</div>
</div>