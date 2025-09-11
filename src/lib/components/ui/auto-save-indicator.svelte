<script lang="ts">
	import { autoSaveStore, autoSaveStatusText, type AutoSaveStatus } from '$lib/stores/auto-save';
	import { Check, AlertCircle, Loader2, Clock } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { Button } from './button';

	let {
		class: className,
		showRetry = true,
		showDetails = true,
		compact = false,
		...restProps
	}: {
		class?: string;
		showRetry?: boolean;
		showDetails?: boolean;
		compact?: boolean;
	} = $props();

	function getIcon(status: AutoSaveStatus) {
		switch (status) {
			case 'saving':
				return Loader2;
			case 'saved':
				return Check;
			case 'error':
				return AlertCircle;
			case 'idle':
				return Clock;
			default:
				return Clock;
		}
	}

	function getColorClasses(status: AutoSaveStatus, hasUnsavedChanges: boolean) {
		switch (status) {
			case 'saving':
				return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800';
			case 'saved':
				return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800';
			case 'error':
				return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
			case 'idle':
				if (hasUnsavedChanges) {
					return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800';
				}
				return 'text-muted-foreground bg-muted border-border';
			default:
				return 'text-muted-foreground bg-muted border-border';
		}
	}

	async function handleRetry() {
		// This would typically trigger a manual save
		// For now, we'll just reset the error state
		autoSaveStore.reset();
	}

	function formatLastSaved(date: Date | null) {
		if (!date) return '';

		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / (1000 * 60));

		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes}m ago`;

		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;

		return date.toLocaleDateString();
	}
</script>

{#if $autoSaveStore.status !== 'idle' || $autoSaveStore.hasUnsavedChanges || $autoSaveStore.lastSaved}
	<div
		class={cn(
			'flex items-center gap-2 transition-all duration-200',
			compact ? 'text-xs' : 'text-sm',
			!compact && 'rounded-lg border px-3 py-2',
			getColorClasses($autoSaveStore.status, $autoSaveStore.hasUnsavedChanges),
			className
		)}
		role="status"
		aria-live="polite"
		{...restProps}
	>
		<!-- Icon -->
		<svelte:component
			this={getIcon($autoSaveStore.status)}
			class={cn(
				compact ? 'h-3 w-3' : 'h-4 w-4',
				$autoSaveStore.status === 'saving' && 'animate-spin'
			)}
		/>

		<!-- Status Text -->
		<span class={cn('font-medium', compact && 'sr-only sm:not-sr-only')}>
			{$autoSaveStatusText}
		</span>

		<!-- Progress Bar for Saving -->
		{#if $autoSaveStore.status === 'saving' && $autoSaveStore.savingProgress !== undefined}
			<div class="h-1 w-12 overflow-hidden rounded-full bg-current/20">
				<div
					class="h-full bg-current transition-all duration-300"
					style="width: {$autoSaveStore.savingProgress}%"
				></div>
			</div>
		{/if}

		<!-- Details -->
		{#if showDetails && !compact && $autoSaveStore.lastSaved && $autoSaveStore.status === 'idle' && !$autoSaveStore.hasUnsavedChanges}
			<span class="text-xs opacity-70">
				• {formatLastSaved($autoSaveStore.lastSaved)}
			</span>
		{/if}

		<!-- Retry Button -->
		{#if showRetry && $autoSaveStore.status === 'error'}
			<Button variant="ghost" size="sm" class="h-6 px-2 text-xs" on:click={handleRetry}>
				Retry
			</Button>
		{/if}

		<!-- Keyboard Shortcut Hint -->
		{#if $autoSaveStore.hasUnsavedChanges && !compact}
			<kbd class="bg-background rounded border px-1.5 py-0.5 text-xs"> ⌘S </kbd>
		{/if}
	</div>
{/if}

<!-- Compact version for toolbars -->
{#if compact && ($autoSaveStore.status !== 'idle' || $autoSaveStore.hasUnsavedChanges)}
	<div
		class={cn(
			'flex items-center gap-1 rounded px-2 py-1 text-xs',
			getColorClasses($autoSaveStore.status, $autoSaveStore.hasUnsavedChanges),
			className
		)}
		title={$autoSaveStatusText}
		role="status"
		aria-live="polite"
	>
		<svelte:component
			this={getIcon($autoSaveStore.status)}
			class={cn('h-3 w-3', $autoSaveStore.status === 'saving' && 'animate-spin')}
		/>
		<span class="hidden sm:inline">
			{$autoSaveStatusText}
		</span>
	</div>
{/if}
