<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { cn } from '$lib/utils';
	import { Button } from './button';
	import { Plus, Trash2, Copy, Eye, MoreVertical } from 'lucide-svelte';
	import { SortableList } from './sortable-list.svelte';

	interface Slide {
		id: string;
		title: string;
		content: string;
		type?: 'title' | 'content' | 'image' | 'video' | 'code';
		thumbnail?: string;
		order: number;
		notes?: string;
	}

	let {
		slides = $bindable([]),
		currentSlideId = $bindable(''),
		class: className,
		allowReorder = true,
		allowEdit = true,
		showAddButton = true,
		compact = false,
		...restProps
	}: {
		slides?: Slide[];
		currentSlideId?: string;
		class?: string;
		allowReorder?: boolean;
		allowEdit?: boolean;
		showAddButton?: boolean;
		compact?: boolean;
	} = $props();

	const dispatch = createEventDispatcher<{
		slideSelect: Slide;
		slideAdd: { type: Slide['type']; afterSlide?: string };
		slideDelete: Slide;
		slideDuplicate: Slide;
		slideReorder: { slides: Slide[]; from: number; to: number };
		slidePreview: Slide;
	}>();

	let draggedSlide: Slide | null = $state(null);

	function generateThumbnail(slide: Slide): string {
		// Generate a simple SVG thumbnail based on slide content
		const title = slide.title || 'Untitled Slide';
		const content = slide.content?.substring(0, 100) || '';

		// Create a basic thumbnail representation
		return `data:image/svg+xml,${encodeURIComponent(`
			<svg width="120" height="68" viewBox="0 0 120 68" xmlns="http://www.w3.org/2000/svg">
				<rect width="120" height="68" fill="#f8f9fa" stroke="#e9ecef" stroke-width="1"/>
				<text x="6" y="16" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#212529">
					${title.substring(0, 15)}${title.length > 15 ? '...' : ''}
				</text>
				<text x="6" y="28" font-family="Arial, sans-serif" font-size="6" fill="#6c757d">
					${content.substring(0, 20)}${content.length > 20 ? '...' : ''}
				</text>
				<text x="6" y="38" font-family="Arial, sans-serif" font-size="6" fill="#6c757d">
					${content.substring(20, 40)}${content.length > 40 ? '...' : ''}
				</text>
				<text x="6" y="48" font-family="Arial, sans-serif" font-size="6" fill="#6c757d">
					${content.substring(40, 60)}${content.length > 60 ? '...' : ''}
				</text>
			</svg>
		`)}`;
	}

	function getSlideTypeIcon(type: Slide['type']) {
		switch (type) {
			case 'title':
				return '📊';
			case 'image':
				return '🖼️';
			case 'video':
				return '🎥';
			case 'code':
				return '💻';
			default:
				return '📄';
		}
	}

	function getSlideTypeColor(type: Slide['type']) {
		switch (type) {
			case 'title':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
			case 'image':
				return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
			case 'video':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
			case 'code':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
			default:
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
		}
	}

	function handleSlideClick(slide: Slide) {
		currentSlideId = slide.id;
		dispatch('slideSelect', slide);
	}

	function handleAddSlide(type: Slide['type'] = 'content') {
		dispatch('slideAdd', { type, afterSlide: currentSlideId });
	}

	function handleDeleteSlide(slide: Slide, event: Event) {
		event.stopPropagation();
		dispatch('slideDelete', slide);
	}

	function handleDuplicateSlide(slide: Slide, event: Event) {
		event.stopPropagation();
		dispatch('slideDuplicate', slide);
	}

	function handlePreviewSlide(slide: Slide, event: Event) {
		event.stopPropagation();
		dispatch('slidePreview', slide);
	}

	function handleSlideReorder(event: { detail: { items: Slide[]; from: number; to: number } }) {
		slides = event.detail.items;
		dispatch('slideReorder', event.detail);
	}

	// Sort slides by order
	const sortedSlides = $derived([...slides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
</script>

<div
	class={cn('bg-sidebar flex flex-col border-r', compact ? 'w-20' : 'w-64', className)}
	{...restProps}
>
	<!-- Header -->
	<div class="border-b p-3">
		<div class="flex items-center justify-between">
			{#if !compact}
				<h3 class="text-sidebar-foreground font-medium">
					Slides ({slides.length})
				</h3>
			{/if}

			{#if showAddButton}
				<Button
					variant="ghost"
					size={compact ? 'icon' : 'sm'}
					on:click={() => handleAddSlide()}
					class="text-muted-foreground hover:text-foreground"
					title="Add slide"
				>
					<Plus class="h-4 w-4" />
					{#if !compact}
						<span class="ml-1">Add</span>
					{/if}
				</Button>
			{/if}
		</div>
	</div>

	<!-- Slides List -->
	<div class="flex-1 space-y-1 overflow-y-auto p-2">
		{#if allowReorder}
			<SortableList
				bind:items={slides}
				on:reorder={handleSlideReorder}
				class="space-y-1"
				disabled={!allowEdit}
			>
				{#snippet children(slide, index)}
					{@render slideItem(slide, index)}
				{/snippet}
			</SortableList>
		{:else}
			{#each sortedSlides as slide, index (slide.id)}
				{@render slideItem(slide, index)}
			{/each}
		{/if}

		{#if slides.length === 0}
			<div class="text-muted-foreground py-8 text-center">
				<div class="text-sm">No slides yet</div>
				{#if showAddButton}
					<Button variant="ghost" size="sm" on:click={() => handleAddSlide()} class="mt-2">
						<Plus class="mr-1 h-4 w-4" />
						Add first slide
					</Button>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#snippet slideItem(slide: Slide, index: number)}
	<div
		class={cn(
			'group relative cursor-pointer rounded-lg border-2 transition-all duration-200',
			'hover:border-primary/50 hover:shadow-sm',
			currentSlideId === slide.id
				? 'border-primary bg-primary/5 shadow-sm'
				: 'border-border bg-background',
			compact && 'aspect-square'
		)}
		on:click={() => handleSlideClick(slide)}
		role="button"
		tabindex="0"
		on:keydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleSlideClick(slide);
			}
		}}
		aria-label={`Slide ${index + 1}: ${slide.title || 'Untitled'}`}
	>
		{#if compact}
			<!-- Compact View -->
			<div class="flex h-full flex-col items-center justify-center p-2">
				<div class="mb-1 text-lg">
					{getSlideTypeIcon(slide.type)}
				</div>
				<div class="text-center text-xs leading-tight font-medium">
					{index + 1}
				</div>
			</div>
		{:else}
			<!-- Full View -->
			<div class="p-3">
				<!-- Slide Number & Type -->
				<div class="mb-2 flex items-center justify-between">
					<span class="text-muted-foreground text-xs font-medium">
						Slide {index + 1}
					</span>
					<span
						class={cn('rounded px-1.5 py-0.5 text-xs font-medium', getSlideTypeColor(slide.type))}
					>
						{slide.type || 'content'}
					</span>
				</div>

				<!-- Thumbnail -->
				<div class="bg-muted mb-3 aspect-video overflow-hidden rounded">
					{#if slide.thumbnail}
						<img src={slide.thumbnail} alt="Slide thumbnail" class="h-full w-full object-cover" />
					{:else}
						<img
							src={generateThumbnail(slide)}
							alt="Generated slide preview"
							class="h-full w-full object-cover"
						/>
					{/if}
				</div>

				<!-- Title -->
				<h4 class="text-sidebar-foreground mb-1 truncate text-sm font-medium">
					{slide.title || 'Untitled Slide'}
				</h4>

				<!-- Content Preview -->
				{#if slide.content}
					<p class="text-muted-foreground line-clamp-2 text-xs">
						{slide.content.replace(/<[^>]*>/g, '').substring(0, 50)}...
					</p>
				{/if}

				<!-- Notes Indicator -->
				{#if slide.notes}
					<div class="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
						<span class="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
						Has notes
					</div>
				{/if}
			</div>

			<!-- Action Buttons -->
			{#if allowEdit}
				<div class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
					<div class="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							class="bg-background/80 hover:bg-background h-6 w-6"
							on:click={(e) => handlePreviewSlide(slide, e)}
							title="Preview slide"
						>
							<Eye class="h-3 w-3" />
						</Button>

						<Button
							variant="ghost"
							size="icon"
							class="bg-background/80 hover:bg-background h-6 w-6"
							on:click={(e) => handleDuplicateSlide(slide, e)}
							title="Duplicate slide"
						>
							<Copy class="h-3 w-3" />
						</Button>

						<Button
							variant="ghost"
							size="icon"
							class="bg-background/80 hover:bg-destructive hover:text-destructive-foreground h-6 w-6"
							on:click={(e) => handleDeleteSlide(slide, e)}
							title="Delete slide"
						>
							<Trash2 class="h-3 w-3" />
						</Button>
					</div>
				</div>
			{/if}
		{/if}

		<!-- Current Slide Indicator -->
		{#if currentSlideId === slide.id}
			<div
				class="bg-primary absolute top-1/2 -left-1 h-8 w-1 -translate-y-1/2 transform rounded-r"
			></div>
		{/if}
	</div>
{/snippet}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
