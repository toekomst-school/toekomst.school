<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import { cn } from '$lib/utils';
	import { Button } from './button';
	import {
		Bold,
		Italic,
		Underline,
		Strikethrough,
		List,
		ListOrdered,
		Quote,
		Code,
		Link,
		Image,
		Undo,
		Redo,
		Type,
		AlignLeft,
		AlignCenter,
		AlignRight
	} from 'lucide-svelte';

	let {
		value = $bindable(''),
		placeholder = 'Start writing...',
		class: className,
		toolbar = true,
		readonly = false,
		minHeight = '200px',
		maxHeight = '500px',
		...restProps
	}: {
		value?: string;
		placeholder?: string;
		class?: string;
		toolbar?: boolean;
		readonly?: boolean;
		minHeight?: string;
		maxHeight?: string;
	} = $props();

	const dispatch = createEventDispatcher<{
		change: { value: string; html: string };
		focus: void;
		blur: void;
	}>();

	let editor: HTMLDivElement | null = $state(null);
	let isActive = $state(false);

	// Toolbar button states
	let formatStates = $state({
		bold: false,
		italic: false,
		underline: false,
		strikethrough: false,
		insertUnorderedList: false,
		insertOrderedList: false,
		justifyLeft: false,
		justifyCenter: false,
		justifyRight: false
	});

	// Update format states based on current selection
	function updateFormatStates() {
		if (!editor) return;

		Object.keys(formatStates).forEach((command) => {
			try {
				formatStates[command as keyof typeof formatStates] = document.queryCommandState(command);
			} catch (e) {
				// Some commands might not be supported
				formatStates[command as keyof typeof formatStates] = false;
			}
		});
	}

	// Execute formatting command
	function execCommand(command: string, value?: string) {
		if (readonly) return;

		try {
			document.execCommand(command, false, value);
			editor?.focus();
			handleInput();
			updateFormatStates();
		} catch (e) {
			console.warn(`Command ${command} not supported:`, e);
		}
	}

	// Handle content changes
	function handleInput() {
		if (!editor) return;

		const html = editor.innerHTML;
		const text = editor.textContent || '';

		value = text;
		dispatch('change', { value: text, html });
	}

	// Handle focus
	function handleFocus() {
		isActive = true;
		updateFormatStates();
		dispatch('focus');
	}

	// Handle blur
	function handleBlur() {
		isActive = false;
		dispatch('blur');
	}

	// Handle selection change
	function handleSelectionChange() {
		if (isActive) {
			updateFormatStates();
		}
	}

	// Handle keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if (readonly) return;

		const isMod = event.ctrlKey || event.metaKey;

		if (isMod) {
			switch (event.key.toLowerCase()) {
				case 'b':
					event.preventDefault();
					execCommand('bold');
					break;
				case 'i':
					event.preventDefault();
					execCommand('italic');
					break;
				case 'u':
					event.preventDefault();
					execCommand('underline');
					break;
				case 'z':
					if (event.shiftKey) {
						event.preventDefault();
						execCommand('redo');
					} else {
						event.preventDefault();
						execCommand('undo');
					}
					break;
			}
		}
	}

	// Insert link
	function insertLink() {
		if (readonly) return;

		const url = prompt('Enter URL:');
		if (url) {
			execCommand('createLink', url);
		}
	}

	// Insert image
	function insertImage() {
		if (readonly) return;

		const url = prompt('Enter image URL:');
		if (url) {
			execCommand('insertImage', url);
		}
	}

	// Set initial content when value changes externally
	$effect(() => {
		if (editor && editor.textContent !== value) {
			editor.textContent = value;
		}
	});

	onMount(() => {
		// Listen for global selection changes
		document.addEventListener('selectionchange', handleSelectionChange);

		// Set initial content
		if (editor && value) {
			editor.textContent = value;
		}

		return () => {
			document.removeEventListener('selectionchange', handleSelectionChange);
		};
	});
</script>

<div class={cn('overflow-hidden rounded-lg border', className)} {...restProps}>
	<!-- Toolbar -->
	{#if toolbar && !readonly}
		<div class="bg-muted/30 border-b p-2">
			<div class="flex flex-wrap items-center gap-1">
				<!-- Text Formatting -->
				<div class="mr-2 flex items-center border-r pr-2">
					<Button
						variant="ghost"
						size="sm"
						class={cn('h-8 w-8 p-0', formatStates.bold && 'bg-accent text-accent-foreground')}
						on:click={() => execCommand('bold')}
						title="Bold (Ctrl+B)"
						type="button"
					>
						<Bold class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class={cn('h-8 w-8 p-0', formatStates.italic && 'bg-accent text-accent-foreground')}
						on:click={() => execCommand('italic')}
						title="Italic (Ctrl+I)"
						type="button"
					>
						<Italic class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class={cn('h-8 w-8 p-0', formatStates.underline && 'bg-accent text-accent-foreground')}
						on:click={() => execCommand('underline')}
						title="Underline (Ctrl+U)"
						type="button"
					>
						<Underline class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class={cn(
							'h-8 w-8 p-0',
							formatStates.strikethrough && 'bg-accent text-accent-foreground'
						)}
						on:click={() => execCommand('strikeThrough')}
						title="Strikethrough"
						type="button"
					>
						<Strikethrough class="h-4 w-4" />
					</Button>
				</div>

				<!-- Lists -->
				<div class="mr-2 flex items-center border-r pr-2">
					<Button
						variant="ghost"
						size="sm"
						class={cn(
							'h-8 w-8 p-0',
							formatStates.insertUnorderedList && 'bg-accent text-accent-foreground'
						)}
						on:click={() => execCommand('insertUnorderedList')}
						title="Bullet List"
						type="button"
					>
						<List class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class={cn(
							'h-8 w-8 p-0',
							formatStates.insertOrderedList && 'bg-accent text-accent-foreground'
						)}
						on:click={() => execCommand('insertOrderedList')}
						title="Numbered List"
						type="button"
					>
						<ListOrdered class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						on:click={() => execCommand('formatBlock', 'blockquote')}
						title="Quote"
						type="button"
					>
						<Quote class="h-4 w-4" />
					</Button>
				</div>

				<!-- Alignment -->
				<div class="mr-2 flex items-center border-r pr-2">
					<Button
						variant="ghost"
						size="sm"
						class={cn(
							'h-8 w-8 p-0',
							formatStates.justifyLeft && 'bg-accent text-accent-foreground'
						)}
						on:click={() => execCommand('justifyLeft')}
						title="Align Left"
						type="button"
					>
						<AlignLeft class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class={cn(
							'h-8 w-8 p-0',
							formatStates.justifyCenter && 'bg-accent text-accent-foreground'
						)}
						on:click={() => execCommand('justifyCenter')}
						title="Align Center"
						type="button"
					>
						<AlignCenter class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class={cn(
							'h-8 w-8 p-0',
							formatStates.justifyRight && 'bg-accent text-accent-foreground'
						)}
						on:click={() => execCommand('justifyRight')}
						title="Align Right"
						type="button"
					>
						<AlignRight class="h-4 w-4" />
					</Button>
				</div>

				<!-- Insert -->
				<div class="mr-2 flex items-center border-r pr-2">
					<Button
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						on:click={insertLink}
						title="Insert Link"
						type="button"
					>
						<Link class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						on:click={insertImage}
						title="Insert Image"
						type="button"
					>
						<Image class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						on:click={() => execCommand('formatBlock', 'pre')}
						title="Code Block"
						type="button"
					>
						<Code class="h-4 w-4" />
					</Button>
				</div>

				<!-- History -->
				<div class="flex items-center">
					<Button
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						on:click={() => execCommand('undo')}
						title="Undo (Ctrl+Z)"
						type="button"
					>
						<Undo class="h-4 w-4" />
					</Button>

					<Button
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						on:click={() => execCommand('redo')}
						title="Redo (Ctrl+Shift+Z)"
						type="button"
					>
						<Redo class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Editor Content -->
	<div class="relative">
		<div
			bind:this={editor}
			contenteditable={!readonly}
			class={cn(
				'prose prose-sm max-w-none overflow-y-auto p-4 focus:outline-none',
				'focus:ring-ring focus:ring-offset-background focus:ring-2 focus:ring-offset-2',
				readonly && 'bg-muted/30 cursor-not-allowed'
			)}
			style="min-height: {minHeight}; max-height: {maxHeight};"
			on:input={handleInput}
			on:focus={handleFocus}
			on:blur={handleBlur}
			on:keydown={handleKeydown}
			role="textbox"
			aria-multiline="true"
			aria-label="Rich text editor"
			data-placeholder={placeholder}
		></div>

		<!-- Placeholder -->
		{#if !value && !readonly}
			<div class="text-muted-foreground pointer-events-none absolute top-4 left-4 select-none">
				{placeholder}
			</div>
		{/if}
	</div>

	<!-- Character Count (optional) -->
	{#if value}
		<div class="text-muted-foreground bg-muted/30 border-t px-4 py-2 text-xs">
			{value.length} characters
		</div>
	{/if}
</div>

<style>
	/* Enhanced prose styling for editor content */
	:global(.prose) {
		color: hsl(var(--foreground));
	}

	:global(.prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6) {
		color: hsl(var(--foreground));
		margin-top: 1.5em;
		margin-bottom: 0.5em;
	}

	:global(.prose p) {
		margin-bottom: 1em;
		line-height: 1.7;
	}

	:global(.prose ul, .prose ol) {
		margin: 1em 0;
		padding-left: 2em;
	}

	:global(.prose li) {
		margin: 0.5em 0;
	}

	:global(.prose blockquote) {
		border-left: 4px solid hsl(var(--border));
		padding-left: 1em;
		margin: 1em 0;
		font-style: italic;
		color: hsl(var(--muted-foreground));
	}

	:global(.prose pre) {
		background: hsl(var(--muted));
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		padding: 1em;
		font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
		font-size: 0.875em;
		overflow-x: auto;
	}

	:global(.prose code) {
		background: hsl(var(--muted));
		padding: 0.125em 0.25em;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}

	:global(.prose a) {
		color: hsl(var(--primary));
		text-decoration: underline;
	}

	:global(.prose img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin: 1em 0;
	}

	/* Placeholder styling */
	[contenteditable]:empty::before {
		content: attr(data-placeholder);
		color: hsl(var(--muted-foreground));
		pointer-events: none;
	}
</style>
