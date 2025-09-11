<script lang="ts">
	import { cn } from '$lib/utils';
	import { toastStore, type Toast } from '$lib/stores/toast';
	import { Button } from './button';
	import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';
	import { fly } from 'svelte/transition';

	const toasts = toastStore;

	function getIcon(type: Toast['type']) {
		switch (type) {
			case 'success':
				return CheckCircle;
			case 'error':
				return XCircle;
			case 'warning':
				return AlertTriangle;
			case 'info':
				return Info;
			default:
				return Info;
		}
	}

	function getColorClasses(type: Toast['type']) {
		switch (type) {
			case 'success':
				return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400';
			case 'error':
				return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400';
			case 'warning':
				return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
			case 'info':
				return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
			default:
				return 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
		}
	}

	function getIconColorClasses(type: Toast['type']) {
		switch (type) {
			case 'success':
				return 'text-green-500';
			case 'error':
				return 'text-red-500';
			case 'warning':
				return 'text-amber-500';
			case 'info':
				return 'text-blue-500';
			default:
				return 'text-gray-500';
		}
	}
</script>

<!-- Toast Container -->
<div class="fixed top-4 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2">
	{#each $toasts as toast (toast.id)}
		<div
			class={cn(
				'rounded-lg border p-4 shadow-lg backdrop-blur-sm',
				'animate-in slide-in-from-right-full duration-300',
				getColorClasses(toast.type)
			)}
			transition:fly={{ x: 400, duration: 300 }}
			role="alert"
			aria-live="polite"
		>
			<div class="flex items-start gap-3">
				<!-- Icon -->
				<svelte:component
					this={getIcon(toast.type)}
					class={cn('mt-0.5 h-5 w-5 flex-shrink-0', getIconColorClasses(toast.type))}
				/>

				<!-- Content -->
				<div class="min-w-0 flex-1">
					<h4 class="text-sm leading-5 font-medium">{toast.title}</h4>
					{#if toast.description}
						<p class="mt-1 text-sm leading-relaxed opacity-90">{toast.description}</p>
					{/if}

					<!-- Action Button -->
					{#if toast.action}
						<div class="mt-3">
							<Button
								variant="outline"
								size="sm"
								on:click={() => {
									toast.action?.onClick();
									toastStore.remove(toast.id);
								}}
								class="h-8 px-3 text-xs"
							>
								{toast.action.label}
							</Button>
						</div>
					{/if}
				</div>

				<!-- Close Button -->
				<Button
					variant="ghost"
					size="icon"
					class="h-6 w-6 opacity-60 hover:opacity-100"
					on:click={() => toastStore.remove(toast.id)}
				>
					<X class="h-4 w-4" />
					<span class="sr-only">Close notification</span>
				</Button>
			</div>
		</div>
	{/each}
</div>
