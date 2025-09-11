<script lang="ts">
	import { recentItemsStore, type RecentItem } from '$lib/stores/recent-items';
	import { BookOpen, GraduationCap, Presentation, Clock, MoreHorizontal, X } from 'lucide-svelte';
	import { Button } from './button';
	import { cn } from '$lib/utils';
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';

	let {
		class: className,
		showClearAll = true,
		maxItems = 8,
		...restProps
	}: {
		class?: string;
		showClearAll?: boolean;
		maxItems?: number;
	} = $props();

	const dispatch = createEventDispatcher<{
		itemClick: RecentItem;
		itemRemove: RecentItem;
	}>();

	const recentItems = recentItemsStore;

	function getIcon(type: RecentItem['type']) {
		switch (type) {
			case 'course':
				return BookOpen;
			case 'lesson':
				return GraduationCap;
			case 'presentation':
				return Presentation;
		}
	}

	function getTypeColor(type: RecentItem['type']) {
		switch (type) {
			case 'course':
				return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
			case 'lesson':
				return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
			case 'presentation':
				return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20';
		}
	}

	function getStatusColor(status: RecentItem['metadata']['status']) {
		switch (status) {
			case 'published':
				return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
			case 'draft':
				return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
			case 'archived':
				return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
			default:
				return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
		}
	}

	function formatLastAccessed(date: Date) {
		const now = new Date();
		const diff = now.getTime() - date.getTime();

		const minutes = Math.floor(diff / (1000 * 60));
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;

		return date.toLocaleDateString();
	}

	function handleItemClick(item: RecentItem) {
		dispatch('itemClick', item);
		// Update last accessed time
		recentItemsStore.addItem({
			id: item.id,
			type: item.type,
			title: item.title,
			url: item.url,
			thumbnail: item.thumbnail,
			metadata: item.metadata
		});
		goto(item.url);
	}

	function handleItemRemove(item: RecentItem, event: Event) {
		event.stopPropagation();
		dispatch('itemRemove', item);
		recentItemsStore.removeItem(item.id, item.type);
	}

	// Slice items to max limit
	const displayItems = $derived($recentItems.slice(0, maxItems));
</script>

<aside class={cn('bg-sidebar flex w-80 flex-col border-r', className)} {...restProps}>
	<!-- Header -->
	<div class="border-b p-4">
		<div class="flex items-center justify-between">
			<h2 class="text-sidebar-foreground flex items-center gap-2 font-semibold">
				<Clock class="h-4 w-4" />
				Recent Items
			</h2>
			{#if showClearAll && displayItems.length > 0}
				<Button
					variant="ghost"
					size="sm"
					on:click={() => recentItemsStore.clear()}
					class="text-muted-foreground hover:text-foreground h-8 px-2"
				>
					Clear all
				</Button>
			{/if}
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto">
		{#if displayItems.length === 0}
			<div class="text-muted-foreground p-6 text-center">
				<Clock class="mx-auto mb-3 h-12 w-12 opacity-30" />
				<h3 class="mb-1 font-medium">No recent items</h3>
				<p class="text-sm">Items you work on will appear here</p>
			</div>
		{:else}
			<div class="space-y-1 p-2">
				{#each displayItems as item (item.id + item.type)}
					<button
						class="hover:bg-sidebar-accent group flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors"
						on:click={() => handleItemClick(item)}
					>
						<!-- Icon & Type -->
						<div class={cn('flex-shrink-0 rounded-md p-2', getTypeColor(item.type))}>
							<svelte:component this={getIcon(item.type)} class="h-4 w-4" />
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<h3 class="text-sidebar-foreground truncate text-sm font-medium">
									{item.title}
								</h3>
								<Button
									variant="ghost"
									size="icon"
									class="hover:bg-destructive hover:text-destructive-foreground h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
									on:click={(e) => handleItemRemove(item, e)}
								>
									<X class="h-3 w-3" />
									<span class="sr-only">Remove from recent items</span>
								</Button>
							</div>

							<!-- Metadata -->
							<div class="mt-1 flex items-center gap-2 text-xs">
								<span class={cn('rounded-full px-2 py-0.5 capitalize', getTypeColor(item.type))}>
									{item.type}
								</span>

								{#if item.metadata?.status}
									<span
										class={cn(
											'rounded-full px-2 py-0.5 text-xs capitalize',
											getStatusColor(item.metadata.status)
										)}
									>
										{item.metadata.status}
									</span>
								{/if}
							</div>

							<!-- Progress bar if available -->
							{#if item.metadata?.progress !== undefined}
								<div class="mt-2">
									<div class="bg-sidebar-border h-1 overflow-hidden rounded-full">
										<div
											class="bg-primary h-full transition-all duration-300"
											style="width: {item.metadata.progress}%"
										></div>
									</div>
									<div class="text-muted-foreground mt-1 flex justify-between text-xs">
										<span>{item.metadata.progress}% complete</span>
										{#if item.metadata.duration}
											<span>{item.metadata.duration}</span>
										{/if}
									</div>
								</div>
							{:else if item.metadata?.duration}
								<div class="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
									<Clock class="h-3 w-3" />
									{item.metadata.duration}
								</div>
							{/if}

							<!-- Last accessed -->
							<div class="text-muted-foreground mt-2 text-xs">
								{formatLastAccessed(item.lastAccessed)}
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer -->
	{#if displayItems.length >= maxItems && $recentItems.length > maxItems}
		<div class="border-t p-4">
			<p class="text-muted-foreground text-center text-xs">
				Showing {maxItems} of {$recentItems.length} recent items
			</p>
		</div>
	{/if}
</aside>
