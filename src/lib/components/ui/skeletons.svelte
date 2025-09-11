<script lang="ts">
	import { cn } from '$lib/utils';

	// Base Skeleton component
	export function Skeleton({ 
		class: className, 
		...props 
	}: { 
		class?: string; 
		[key: string]: any 
	}) {
		return {
			class: cn('bg-accent animate-pulse rounded-md', className),
			...props
		};
	}
</script>

<!-- Content-Aware Skeleton Components -->

<!-- Course Card Skeleton -->
<div class="course-card-skeleton">
	{#snippet courseSkeleton()}
		<div class="p-6 border rounded-lg space-y-4">
			<!-- Image placeholder -->
			<div class="bg-accent animate-pulse rounded-lg h-40 w-full"></div>
			
			<!-- Content -->
			<div class="space-y-3">
				<!-- Title -->
				<div class="bg-accent animate-pulse rounded h-5 w-3/4"></div>
				
				<!-- Description lines -->
				<div class="space-y-2">
					<div class="bg-accent animate-pulse rounded h-4 w-full"></div>
					<div class="bg-accent animate-pulse rounded h-4 w-5/6"></div>
				</div>
				
				<!-- Metadata row -->
				<div class="flex items-center justify-between pt-2">
					<div class="flex items-center gap-4">
						<div class="bg-accent animate-pulse rounded-full h-6 w-16"></div>
						<div class="bg-accent animate-pulse rounded-full h-6 w-20"></div>
					</div>
					<div class="bg-accent animate-pulse rounded h-8 w-24"></div>
				</div>
			</div>
		</div>
	{/snippet}
</div>

<!-- Lesson List Item Skeleton -->
<div class="lesson-list-skeleton">
	{#snippet lessonSkeleton()}
		<div class="flex items-center gap-4 p-4 border rounded-lg">
			<!-- Icon placeholder -->
			<div class="bg-accent animate-pulse rounded-lg h-12 w-12 flex-shrink-0"></div>
			
			<!-- Content -->
			<div class="flex-1 space-y-2">
				<div class="bg-accent animate-pulse rounded h-5 w-2/3"></div>
				<div class="bg-accent animate-pulse rounded h-4 w-full"></div>
				
				<!-- Metadata -->
				<div class="flex items-center gap-3">
					<div class="bg-accent animate-pulse rounded-full h-5 w-16"></div>
					<div class="bg-accent animate-pulse rounded-full h-5 w-12"></div>
					<div class="bg-accent animate-pulse rounded-full h-5 w-20"></div>
				</div>
			</div>
			
			<!-- Actions -->
			<div class="flex gap-2">
				<div class="bg-accent animate-pulse rounded h-8 w-8"></div>
				<div class="bg-accent animate-pulse rounded h-8 w-8"></div>
			</div>
		</div>
	{/snippet}
</div>

<!-- Form Field Skeleton -->
<div class="form-skeleton">
	{#snippet formFieldSkeleton()}
		<div class="space-y-2">
			<!-- Label -->
			<div class="bg-accent animate-pulse rounded h-4 w-24"></div>
			
			<!-- Input -->
			<div class="bg-accent animate-pulse rounded-md h-10 w-full"></div>
			
			<!-- Help text -->
			<div class="bg-accent animate-pulse rounded h-3 w-48"></div>
		</div>
	{/snippet}
</div>

<!-- Table Row Skeleton -->
<div class="table-skeleton">
	{#snippet tableRowSkeleton(columns = 4)}
		<tr>
			{#each Array(columns) as _, i}
				<td class="p-4">
					<div class="bg-accent animate-pulse rounded h-4 w-full"></div>
				</td>
			{/each}
		</tr>
	{/snippet}
</div>

<!-- Presentation Slide Skeleton -->
<div class="slide-skeleton">
	{#snippet slideSkeleton()}
		<div class="aspect-video bg-accent animate-pulse rounded-lg p-8">
			<!-- Title area -->
			<div class="space-y-4">
				<div class="bg-white/20 rounded h-8 w-2/3 mx-auto"></div>
				
				<!-- Content lines -->
				<div class="space-y-3 mt-8">
					<div class="bg-white/10 rounded h-4 w-full"></div>
					<div class="bg-white/10 rounded h-4 w-5/6"></div>
					<div class="bg-white/10 rounded h-4 w-4/5"></div>
				</div>
			</div>
		</div>
	{/snippet}
</div>

<!-- Editor Layout Skeleton -->
<div class="editor-skeleton">
	{#snippet editorSkeleton()}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
			<!-- Left panel -->
			<div class="space-y-4">
				<!-- Toolbar -->
				<div class="flex gap-2 p-3 border rounded-lg">
					{#each Array(5) as _}
						<div class="bg-accent animate-pulse rounded h-8 w-12"></div>
					{/each}
				</div>
				
				<!-- Content area -->
				<div class="bg-accent animate-pulse rounded-lg h-full"></div>
			</div>
			
			<!-- Right panel -->
			<div class="space-y-4">
				<!-- Header -->
				<div class="bg-accent animate-pulse rounded h-10 w-full"></div>
				
				<!-- Preview area -->
				<div class="bg-accent animate-pulse rounded-lg h-full"></div>
			</div>
		</div>
	{/snippet}
</div>

<!-- Navigation Skeleton -->
<div class="nav-skeleton">
	{#snippet navigationSkeleton()}
		<nav class="flex items-center gap-4 p-4">
			<!-- Logo -->
			<div class="bg-accent animate-pulse rounded h-8 w-32"></div>
			
			<!-- Nav items -->
			<div class="flex gap-6 ml-8">
				{#each Array(4) as _}
					<div class="bg-accent animate-pulse rounded h-6 w-20"></div>
				{/each}
			</div>
			
			<!-- Right side -->
			<div class="ml-auto flex items-center gap-3">
				<div class="bg-accent animate-pulse rounded-full h-8 w-64"></div>
				<div class="bg-accent animate-pulse rounded-full h-10 w-10"></div>
			</div>
		</nav>
	{/snippet}
</div>

<!-- Sidebar Menu Skeleton -->
<div class="sidebar-skeleton">
	{#snippet sidebarSkeleton()}
		<aside class="w-64 border-r p-4 space-y-6">
			<!-- Header -->
			<div class="bg-accent animate-pulse rounded h-6 w-32"></div>
			
			<!-- Menu items -->
			<div class="space-y-2">
				{#each Array(6) as _}
					<div class="flex items-center gap-3 p-2">
						<div class="bg-accent animate-pulse rounded h-5 w-5"></div>
						<div class="bg-accent animate-pulse rounded h-4 flex-1"></div>
					</div>
				{/each}
			</div>
			
			<!-- Section divider -->
			<div class="bg-accent animate-pulse rounded h-px w-full"></div>
			
			<!-- More items -->
			<div class="space-y-2">
				{#each Array(3) as _}
					<div class="flex items-center gap-3 p-2">
						<div class="bg-accent animate-pulse rounded h-5 w-5"></div>
						<div class="bg-accent animate-pulse rounded h-4 flex-1"></div>
					</div>
				{/each}
			</div>
		</aside>
	{/snippet}
</div>

<!-- List with Filters Skeleton -->
<div class="list-with-filters-skeleton">
	{#snippet listWithFiltersSkeleton()}
		<div class="space-y-6">
			<!-- Filters bar -->
			<div class="flex items-center justify-between gap-4 p-4 border rounded-lg">
				<div class="flex items-center gap-4">
					<div class="bg-accent animate-pulse rounded h-10 w-64"></div>
					<div class="bg-accent animate-pulse rounded h-10 w-32"></div>
					<div class="bg-accent animate-pulse rounded h-10 w-28"></div>
				</div>
				<div class="bg-accent animate-pulse rounded h-10 w-24"></div>
			</div>
			
			<!-- Results header -->
			<div class="flex items-center justify-between">
				<div class="bg-accent animate-pulse rounded h-5 w-48"></div>
				<div class="flex gap-2">
					<div class="bg-accent animate-pulse rounded h-8 w-20"></div>
					<div class="bg-accent animate-pulse rounded h-8 w-16"></div>
				</div>
			</div>
			
			<!-- Grid of items -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each Array(6) as _}
					{@render courseSkeleton()}
				{/each}
			</div>
		</div>
	{/snippet}
</div>

<!-- Dashboard Stats Skeleton -->
<div class="stats-skeleton">
	{#snippet statsSkeleton()}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each Array(4) as _}
				<div class="p-6 border rounded-lg space-y-3">
					<div class="flex items-center justify-between">
						<div class="bg-accent animate-pulse rounded h-4 w-20"></div>
						<div class="bg-accent animate-pulse rounded h-6 w-6"></div>
					</div>
					<div class="bg-accent animate-pulse rounded h-8 w-16"></div>
					<div class="bg-accent animate-pulse rounded h-3 w-24"></div>
				</div>
			{/each}
		</div>
	{/snippet}
</div>

<!-- Export all snippets for use in other components -->
<script>
	export {
		courseSkeleton,
		lessonSkeleton,
		formFieldSkeleton,
		tableRowSkeleton,
		slideSkeleton,
		editorSkeleton,
		navigationSkeleton,
		sidebarSkeleton,
		listWithFiltersSkeleton,
		statsSkeleton
	};
</script>