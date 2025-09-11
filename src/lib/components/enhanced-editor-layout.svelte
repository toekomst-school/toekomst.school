<script lang="ts">
	import SmartBreadcrumb from './ui/smart-breadcrumb.svelte';
	import GlobalSearch from './ui/global-search.svelte';
	import RecentItemsSidebar from './ui/recent-items-sidebar.svelte';
	import AutoSaveIndicator from './ui/auto-save-indicator.svelte';
	import Toast from './ui/toast.svelte';
	import { Button } from './ui/button';
	import { autoSaveStore } from '$lib/stores/auto-save';
	import { toastStore } from '$lib/stores/toast';
	import { recentItemsStore } from '$lib/stores/recent-items';
	import { Settings, Save, Menu, X } from 'lucide-svelte';

	let {
		title = 'Enhanced Editor',
		showRecentSidebar = $bindable(true),
		showBreadcrumbs = true,
		showAutoSave = true,
		showGlobalSearch = true,
		children
	}: {
		title?: string;
		showRecentSidebar?: boolean;
		showBreadcrumbs?: boolean;
		showAutoSave?: boolean;
		showGlobalSearch?: boolean;
		children?: any;
	} = $props();

	// Demo functionality
	function handleManualSave() {
		autoSaveStore.save(async () => {
			// Simulate save operation
			await new Promise((resolve) => setTimeout(resolve, 1500));
			toastStore.success('Content saved successfully');
		});
	}

	function handleAutoSave() {
		autoSaveStore.autoSave(async () => {
			// Simulate auto-save operation
			await new Promise((resolve) => setTimeout(resolve, 800));
		});
	}

	// Add current page to recent items when component mounts
	function addToRecent() {
		recentItemsStore.addItem({
			id: 'current-page',
			type: 'lesson',
			title: title,
			url: window.location.pathname,
			metadata: {
				status: 'draft',
				progress: 65,
				duration: '25 min'
			}
		});
	}

	// Simulate content changes for demo
	function simulateContentChange() {
		autoSaveStore.markChanged();
		handleAutoSave();
	}

	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 's') {
			event.preventDefault();
			handleManualSave();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Toast Notifications -->
<Toast />

<!-- Main Layout -->
<div class="bg-background min-h-screen">
	<!-- Top Navigation Bar -->
	<header
		class="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur"
	>
		<div class="container flex h-14 items-center justify-between px-4">
			<!-- Left Section -->
			<div class="flex items-center gap-4">
				<!-- Sidebar Toggle -->
				<Button
					variant="ghost"
					size="icon"
					on:click={() => (showRecentSidebar = !showRecentSidebar)}
					class="lg:hidden"
				>
					{#if showRecentSidebar}
						<X class="h-4 w-4" />
					{:else}
						<Menu class="h-4 w-4" />
					{/if}
				</Button>

				<!-- Logo/Brand -->
				<div class="flex items-center gap-2">
					<div class="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
						<span class="text-primary-foreground text-sm font-bold">TS</span>
					</div>
					<span class="hidden font-semibold sm:inline">Toekomst School</span>
				</div>
			</div>

			<!-- Center Section - Global Search -->
			{#if showGlobalSearch}
				<div class="mx-4 max-w-md flex-1">
					<GlobalSearch
						on:select={(e) => {
							toastStore.info(`Navigating to ${e.detail.title}`);
						}}
					/>
				</div>
			{/if}

			<!-- Right Section -->
			<div class="flex items-center gap-2">
				<!-- Auto-save Indicator -->
				{#if showAutoSave}
					<AutoSaveIndicator compact />
				{/if}

				<!-- Manual Save Button -->
				<Button
					variant="outline"
					size="sm"
					on:click={handleManualSave}
					disabled={$autoSaveStore.status === 'saving'}
				>
					<Save class="mr-2 h-4 w-4" />
					Save
				</Button>

				<!-- Settings -->
				<Button variant="ghost" size="icon">
					<Settings class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="flex">
		<!-- Recent Items Sidebar -->
		{#if showRecentSidebar}
			<RecentItemsSidebar
				class="hidden lg:flex"
				on:itemClick={(e) => {
					toastStore.info(`Opening ${e.detail.title}`);
				}}
			/>
		{/if}

		<!-- Main Editor Area -->
		<main class="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col">
			<!-- Breadcrumbs -->
			{#if showBreadcrumbs}
				<div class="bg-muted/30 border-b px-6 py-3">
					<SmartBreadcrumb />
				</div>
			{/if}

			<!-- Editor Content -->
			<div class="flex-1 p-6">
				<!-- Page Title & Auto-save -->
				<div class="mb-6 flex items-center justify-between">
					<div>
						<h1 class="text-foreground text-2xl font-bold">{title}</h1>
						<p class="text-muted-foreground mt-1 text-sm">
							Create and edit content with enhanced workflow tools
						</p>
					</div>

					{#if showAutoSave}
						<AutoSaveIndicator showRetry showDetails on:retry={handleManualSave} />
					{/if}
				</div>

				<!-- Demo Actions -->
				<div class="bg-muted/30 mb-6 rounded-lg border p-4">
					<h3 class="mb-3 font-medium">Demo Actions</h3>
					<div class="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" on:click={simulateContentChange}>
							Simulate Content Change
						</Button>
						<Button
							variant="outline"
							size="sm"
							on:click={() => toastStore.success('Success message', 'This is a success toast')}
						>
							Show Success Toast
						</Button>
						<Button
							variant="outline"
							size="sm"
							on:click={() => toastStore.error('Error message', 'This is an error toast')}
						>
							Show Error Toast
						</Button>
						<Button variant="outline" size="sm" on:click={addToRecent}>Add to Recent Items</Button>
					</div>
				</div>

				<!-- Custom Content Area -->
				<div class="bg-card rounded-lg border">
					{@render children?.()}
				</div>
			</div>
		</main>
	</div>
</div>

<!-- Mobile Sidebar Overlay -->
{#if showRecentSidebar}
	<div class="lg:hidden">
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-50 bg-black/50"
			on:click={() => (showRecentSidebar = false)}
			role="button"
			tabindex="-1"
			aria-label="Close sidebar"
		></div>

		<!-- Sidebar -->
		<RecentItemsSidebar
			class="fixed top-0 left-0 z-50 h-full"
			on:itemClick={() => (showRecentSidebar = false)}
		/>
	</div>
{/if}

<style>
	/* Ensure smooth transitions for layout changes */
	main {
		transition: margin-left 0.3s ease;
	}

	/* Custom scrollbar for better aesthetics */
	:global(.overflow-y-auto) {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--border)) transparent;
	}

	:global(.overflow-y-auto::-webkit-scrollbar) {
		width: 6px;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-thumb) {
		background-color: hsl(var(--border));
		border-radius: 3px;
	}

	:global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
		background-color: hsl(var(--border));
		opacity: 0.8;
	}
</style>
