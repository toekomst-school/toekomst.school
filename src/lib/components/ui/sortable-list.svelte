<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { GripVertical } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface SortableItem {
		id: string;
		order: number;
		[key: string]: any;
	}

	let {
		items = $bindable([]),
		class: className,
		itemClass,
		handleClass,
		disabled = false,
		children,
		...restProps
	}: {
		items?: SortableItem[];
		class?: string;
		itemClass?: string;
		handleClass?: string;
		disabled?: boolean;
		children?: any;
	} = $props();

	const dispatch = createEventDispatcher<{
		reorder: { items: SortableItem[]; from: number; to: number };
		dragStart: { item: SortableItem; index: number };
		dragEnd: { item: SortableItem; index: number };
	}>();

	let draggedIndex: number | null = $state(null);
	let dragOverIndex: number | null = $state(null);
	let draggedElement: HTMLElement | null = $state(null);

	function handleDragStart(event: DragEvent, item: SortableItem, index: number) {
		if (disabled) return;

		draggedIndex = index;
		draggedElement = event.target as HTMLElement;

		// Store data for the drag operation
		event.dataTransfer?.setData('text/plain', item.id);

		// Add visual feedback
		if (draggedElement) {
			draggedElement.style.opacity = '0.5';
		}

		dispatch('dragStart', { item, index });
	}

	function handleDragEnd(event: DragEvent, item: SortableItem, index: number) {
		if (disabled) return;

		// Reset visual state
		if (draggedElement) {
			draggedElement.style.opacity = '1';
		}

		draggedIndex = null;
		dragOverIndex = null;
		draggedElement = null;

		dispatch('dragEnd', { item, index });
	}

	function handleDragOver(event: DragEvent, index: number) {
		if (disabled || draggedIndex === null) return;

		event.preventDefault();
		dragOverIndex = index;
	}

	function handleDragLeave(event: DragEvent) {
		if (disabled) return;

		// Only clear dragOverIndex if we're leaving the item entirely
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const isLeavingItem =
			event.clientX < rect.left ||
			event.clientX > rect.right ||
			event.clientY < rect.top ||
			event.clientY > rect.bottom;

		if (isLeavingItem) {
			dragOverIndex = null;
		}
	}

	function handleDrop(event: DragEvent, targetIndex: number) {
		if (disabled || draggedIndex === null || draggedIndex === targetIndex) return;

		event.preventDefault();

		// Create new array with reordered items
		const newItems = [...items];
		const draggedItem = newItems[draggedIndex];

		// Remove dragged item from its original position
		newItems.splice(draggedIndex, 1);

		// Insert at new position
		const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
		newItems.splice(insertIndex, 0, draggedItem);

		// Update order property for all items
		const reorderedItems = newItems.map((item, index) => ({
			...item,
			order: index
		}));

		items = reorderedItems;

		dispatch('reorder', {
			items: reorderedItems,
			from: draggedIndex,
			to: insertIndex
		});

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleKeyDown(event: KeyboardEvent, item: SortableItem, index: number) {
		if (disabled) return;

		let newIndex: number | null = null;

		switch (event.key) {
			case 'ArrowUp':
			case 'ArrowLeft':
				event.preventDefault();
				newIndex = Math.max(0, index - 1);
				break;
			case 'ArrowDown':
			case 'ArrowRight':
				event.preventDefault();
				newIndex = Math.min(items.length - 1, index + 1);
				break;
			case 'Home':
				event.preventDefault();
				newIndex = 0;
				break;
			case 'End':
				event.preventDefault();
				newIndex = items.length - 1;
				break;
		}

		if (newIndex !== null && newIndex !== index) {
			// Create new array with reordered items
			const newItems = [...items];
			const movedItem = newItems[index];

			// Remove item from current position
			newItems.splice(index, 1);

			// Insert at new position
			newItems.splice(newIndex, 0, movedItem);

			// Update order property
			const reorderedItems = newItems.map((item, idx) => ({
				...item,
				order: idx
			}));

			items = reorderedItems;

			dispatch('reorder', {
				items: reorderedItems,
				from: index,
				to: newIndex
			});

			// Focus the moved item
			setTimeout(() => {
				const movedElement = document.querySelector(`[data-sortable-index="${newIndex}"]`);
				if (movedElement instanceof HTMLElement) {
					movedElement.focus();
				}
			}, 0);
		}
	}

	// Sort items by order property
	const sortedItems = $derived([...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
</script>

<div
	class={cn('space-y-2', className)}
	role="application"
	aria-label="Sortable list"
	{...restProps}
>
	{#each sortedItems as item, index (item.id)}
		<div
			class={cn(
				'group relative rounded-lg border transition-all duration-200',
				'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2',
				draggedIndex === index && 'scale-95 opacity-50',
				dragOverIndex === index && draggedIndex !== index && 'border-primary bg-primary/5',
				disabled && 'cursor-not-allowed opacity-50',
				itemClass
			)}
			data-sortable-index={index}
			draggable={!disabled}
			on:dragstart={(e) => handleDragStart(e, item, index)}
			on:dragend={(e) => handleDragEnd(e, item, index)}
			on:dragover={(e) => handleDragOver(e, index)}
			on:dragleave={handleDragLeave}
			on:drop={(e) => handleDrop(e, index)}
			on:keydown={(e) => handleKeyDown(e, item, index)}
			tabindex={disabled ? -1 : 0}
			role="button"
			aria-describedby="sortable-instructions"
		>
			<div class="flex items-center gap-3 p-4">
				<!-- Drag Handle -->
				<div
					class={cn(
						'text-muted-foreground flex h-6 w-6 items-center justify-center',
						'group-hover:text-foreground cursor-grab transition-colors',
						'focus:ring-ring focus:ring-2 focus:ring-offset-1 focus:outline-none',
						disabled && 'cursor-not-allowed opacity-50',
						handleClass
					)}
					role="button"
					tabindex={disabled ? -1 : 0}
					aria-label={`Drag to reorder ${item.title || `item ${index + 1}`}`}
				>
					<GripVertical class="h-4 w-4" />
				</div>

				<!-- Item Content -->
				<div class="min-w-0 flex-1">
					{@render children?.(item, index)}
				</div>

				<!-- Order Number -->
				<div class="text-muted-foreground bg-muted rounded px-2 py-1 text-xs">
					#{index + 1}
				</div>
			</div>

			<!-- Drop Indicator -->
			{#if dragOverIndex === index && draggedIndex !== index}
				<div
					class="border-primary pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed"
				></div>
			{/if}
		</div>
	{/each}

	<!-- Empty State -->
	{#if items.length === 0}
		<div class="text-muted-foreground py-12 text-center">
			<div class="text-sm">No items to sort</div>
		</div>
	{/if}

	<!-- Screen Reader Instructions -->
	<div id="sortable-instructions" class="sr-only">
		Use arrow keys to reorder items, or drag and drop with mouse. Press Home to move to first
		position, End to move to last position.
	</div>
</div>

<style>
	/* Custom drag cursor */
	[draggable='true']:active {
		cursor: grabbing;
	}

	/* Smooth transitions for drag operations */
	.group {
		transition:
			transform 0.2s ease,
			opacity 0.2s ease;
	}

	/* Visual feedback for drop zones */
	[data-sortable-index] {
		position: relative;
	}

	[data-sortable-index]::before {
		content: '';
		position: absolute;
		top: -2px;
		left: 0;
		right: 0;
		height: 4px;
		background: transparent;
		transition: background-color 0.2s ease;
	}

	[data-sortable-index]::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		right: 0;
		height: 4px;
		background: transparent;
		transition: background-color 0.2s ease;
	}
</style>
