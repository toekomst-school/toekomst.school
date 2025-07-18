<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		"bg-transparent text-card-foreground flex flex-col rounded-xl border-2 border-white py-6 shadow-sm",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
