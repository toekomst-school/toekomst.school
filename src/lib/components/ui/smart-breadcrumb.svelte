<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronRight, Home } from 'lucide-svelte';
	import { Button } from './button';
	import { cn } from '$lib/utils';

	interface BreadcrumbItem {
		label: string;
		href?: string;
		icon?: any;
		current?: boolean;
	}

	let {
		items = [],
		showHome = true,
		class: className,
		separator = ChevronRight,
		...restProps
	}: {
		items?: BreadcrumbItem[];
		showHome?: boolean;
		class?: string;
		separator?: any;
	} = $props();

	// Auto-generate breadcrumbs based on current route
	const autoBreadcrumbs = $derived(() => {
		const pathname = $page.url.pathname;
		const segments = pathname.split('/').filter(Boolean);
		const crumbs: BreadcrumbItem[] = [];

		if (showHome) {
			crumbs.push({ label: 'Home', href: '/', icon: Home });
		}

		// Build breadcrumbs based on route structure
		let currentPath = '';
		for (let i = 0; i < segments.length; i++) {
			const segment = segments[i];
			currentPath += `/${segment}`;

			let label = segment;
			let href = currentPath;

			// Smart labeling based on route patterns
			switch (segment) {
				case 'cursussen':
					label = 'Cursussen';
					break;
				case 'lessen':
					label = 'Lessen';
					break;
				case 'editor':
					label = 'Presentation Editor';
					break;
				case 'present':
					label = 'Presentation Mode';
					break;
				default:
					// If it's an ID (numeric or looks like one), try to get the actual name
					if (/^[0-9a-fA-F-]{8,}$/.test(segment)) {
						label = `Item ${segment.slice(0, 8)}...`;
					} else {
						label = segment.charAt(0).toUpperCase() + segment.slice(1);
					}
			}

			// Don't make the last item clickable
			if (i === segments.length - 1) {
				href = undefined;
			}

			crumbs.push({ label, href, current: i === segments.length - 1 });
		}

		return crumbs;
	});

	// Use provided items or auto-generated ones
	const finalItems = $derived(items.length > 0 ? items : autoBreadcrumbs);
</script>

<nav
	class={cn('text-muted-foreground mb-6 flex items-center space-x-1 text-sm', className)}
	aria-label="Breadcrumb navigation"
	{...restProps}
>
	{#each finalItems as item, index}
		{#if index > 0}
			<svelte:component this={separator} class="text-muted-foreground/50 h-4 w-4" />
		{/if}

		{#if item.href}
			<Button
				variant="ghost"
				size="sm"
				href={item.href}
				class="text-muted-foreground hover:text-foreground h-auto p-1 font-normal"
			>
				{#if item.icon}
					<svelte:component this={item.icon} class="mr-1 h-4 w-4" />
				{/if}
				{item.label}
			</Button>
		{:else}
			<span
				class={cn('px-1 font-medium', item.current ? 'text-foreground' : 'text-muted-foreground')}
				aria-current={item.current ? 'page' : undefined}
			>
				{#if item.icon}
					<svelte:component this={item.icon} class="mr-1 inline h-4 w-4" />
				{/if}
				{item.label}
			</span>
		{/if}
	{/each}
</nav>
