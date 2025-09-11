<script lang="ts">
	import {
		Search,
		BookOpen,
		GraduationCap,
		Presentation,
		Clock,
		ChevronRight
	} from 'lucide-svelte';
	import { Button } from './button';
	import { Input } from './input';
	import { cn } from '$lib/utils';
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';

	interface SearchResult {
		id: string;
		type: 'course' | 'lesson' | 'presentation';
		title: string;
		description?: string;
		url: string;
		metadata?: {
			status?: string;
			duration?: string;
			lessonCount?: number;
		};
	}

	let {
		placeholder = 'Search courses, lessons, presentations...',
		class: className,
		showRecent = true,
		maxResults = 8,
		...restProps
	}: {
		placeholder?: string;
		class?: string;
		showRecent?: boolean;
		maxResults?: number;
	} = $props();

	const dispatch = createEventDispatcher<{
		select: SearchResult;
	}>();

	let query = $state('');
	let isOpen = $state(false);
	let searchInput: HTMLInputElement | null = $state(null);
	let results: SearchResult[] = $state([]);
	let selectedIndex = $state(-1);
	let isLoading = $state(false);

	// Mock data - replace with actual API calls
	const mockData: SearchResult[] = [
		{
			id: '1',
			type: 'course',
			title: 'Web Development Fundamentals',
			description: 'Learn HTML, CSS, and JavaScript basics',
			url: '/cursussen/1',
			metadata: { status: 'published', lessonCount: 12 }
		},
		{
			id: '2',
			type: 'lesson',
			title: 'Introduction to React Hooks',
			description: 'Understanding useState and useEffect',
			url: '/lessen/2',
			metadata: { status: 'draft', duration: '45 min' }
		},
		{
			id: '3',
			type: 'presentation',
			title: 'JavaScript ES6 Features',
			description: 'Arrow functions, destructuring, and more',
			url: '/present?id=3',
			metadata: { duration: '30 min' }
		}
	];

	// Recent searches from localStorage
	const recentSearches = $derived(() => {
		if (typeof window === 'undefined') return [];
		try {
			const recent = localStorage.getItem('recent-searches');
			return recent ? JSON.parse(recent) : [];
		} catch {
			return [];
		}
	});

	function getIcon(type: SearchResult['type']) {
		switch (type) {
			case 'course':
				return BookOpen;
			case 'lesson':
				return GraduationCap;
			case 'presentation':
				return Presentation;
		}
	}

	function getTypeColor(type: SearchResult['type']) {
		switch (type) {
			case 'course':
				return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
			case 'lesson':
				return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
			case 'presentation':
				return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
		}
	}

	async function performSearch(searchQuery: string) {
		if (!searchQuery.trim()) {
			results = [];
			return;
		}

		isLoading = true;
		selectedIndex = -1;

		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Mock search logic - replace with actual API call
		const filtered = mockData
			.filter(
				(item) =>
					item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					item.description?.toLowerCase().includes(searchQuery.toLowerCase())
			)
			.slice(0, maxResults);

		results = filtered;
		isLoading = false;
	}

	function handleSelect(result: SearchResult) {
		// Save to recent searches
		if (typeof window !== 'undefined') {
			try {
				const recent = recentSearches.filter((r) => r.id !== result.id);
				recent.unshift(result);
				localStorage.setItem('recent-searches', JSON.stringify(recent.slice(0, 5)));
			} catch (e) {
				console.warn('Failed to save recent search:', e);
			}
		}

		dispatch('select', result);
		goto(result.url);
		closeSearch();
	}

	function closeSearch() {
		isOpen = false;
		query = '';
		results = [];
		selectedIndex = -1;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && results[selectedIndex]) {
					handleSelect(results[selectedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				closeSearch();
				break;
		}
	}

	// Debounced search
	let searchTimeout: number;
	$effect(() => {
		clearTimeout(searchTimeout);
		if (query) {
			searchTimeout = setTimeout(() => performSearch(query), 300);
		} else {
			results = [];
		}
	});

	// Global keyboard shortcut (Ctrl/Cmd + K)
	function handleGlobalKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
			event.preventDefault();
			searchInput?.focus();
			isOpen = true;
		}
	}
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class={cn('relative', className)} {...restProps}>
	<div class="relative">
		<Search
			class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
		/>
		<Input
			bind:this={searchInput}
			bind:value={query}
			{placeholder}
			class="pr-4 pl-9"
			on:focus={() => (isOpen = true)}
			on:keydown={handleKeydown}
			autocomplete="off"
			role="combobox"
			aria-expanded={isOpen}
			aria-haspopup="listbox"
			aria-label="Global search"
		/>
		{#if query || isOpen}
			<div
				class="text-muted-foreground bg-muted absolute top-1/2 right-2 -translate-y-1/2 transform rounded border px-1.5 py-0.5 text-xs"
			>
				ESC
			</div>
		{:else}
			<div
				class="text-muted-foreground bg-muted absolute top-1/2 right-2 -translate-y-1/2 transform rounded border px-1.5 py-0.5 text-xs"
			>
				⌘K
			</div>
		{/if}
	</div>

	{#if isOpen}
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-40"
			on:click={closeSearch}
			on:keydown={(e) => e.key === 'Escape' && closeSearch()}
			role="button"
			tabindex="-1"
			aria-label="Close search"
		></div>

		<!-- Search Results -->
		<div
			class="bg-popover absolute top-full right-0 left-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-md border shadow-lg"
		>
			{#if isLoading}
				<div class="text-muted-foreground p-4 text-center">
					<div
						class="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
					></div>
					<p class="mt-2 text-sm">Searching...</p>
				</div>
			{:else if query && results.length === 0}
				<div class="text-muted-foreground p-4 text-center">
					<Search class="mx-auto h-8 w-8 opacity-50" />
					<p class="mt-2 text-sm">No results found for "{query}"</p>
				</div>
			{:else}
				<!-- Results -->
				{#if results.length > 0}
					<div class="py-2">
						{#each results as result, index}
							<button
								class={cn(
									'hover:bg-accent flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
									index === selectedIndex && 'bg-accent'
								)}
								on:click={() => handleSelect(result)}
								role="option"
								aria-selected={index === selectedIndex}
							>
								<div class={cn('rounded-md p-2', getTypeColor(result.type))}>
									<svelte:component this={getIcon(result.type)} class="h-4 w-4" />
								</div>

								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<h4 class="truncate text-sm font-medium">{result.title}</h4>
										<span
											class={cn(
												'rounded-full px-2 py-0.5 text-xs capitalize',
												getTypeColor(result.type)
											)}
										>
											{result.type}
										</span>
									</div>
									{#if result.description}
										<p class="text-muted-foreground mt-0.5 truncate text-xs">
											{result.description}
										</p>
									{/if}
									{#if result.metadata}
										<div class="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
											{#if result.metadata.status}
												<span class="capitalize">{result.metadata.status}</span>
											{/if}
											{#if result.metadata.duration}
												<Clock class="h-3 w-3" />
												<span>{result.metadata.duration}</span>
											{/if}
											{#if result.metadata.lessonCount}
												<span>{result.metadata.lessonCount} lessons</span>
											{/if}
										</div>
									{/if}
								</div>

								<ChevronRight class="text-muted-foreground h-4 w-4" />
							</button>
						{/each}
					</div>
				{/if}

				<!-- Recent Searches -->
				{#if showRecent && !query && recentSearches.length > 0}
					<div class="border-t">
						<div class="text-muted-foreground bg-muted/30 px-4 py-2 text-xs font-medium">
							Recent searches
						</div>
						{#each recentSearches.slice(0, 3) as result}
							<button
								class="hover:bg-accent flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
								on:click={() => handleSelect(result)}
							>
								<div class={cn('rounded-md p-1.5', getTypeColor(result.type))}>
									<svelte:component this={getIcon(result.type)} class="h-3 w-3" />
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="truncate text-sm font-medium">{result.title}</h4>
								</div>
								<Clock class="text-muted-foreground h-3 w-3" />
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>
