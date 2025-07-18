<script lang="ts">
	import { cn } from '$lib/utils';

	interface $$Props extends Omit<Partial<HTMLTextAreaElement>, 'class'> {
		class?: string;
		value?: string;
	}

	let className: $$Props['class'] = undefined;
	export { className as class };
	export let value: $$Props['value'] = undefined;
</script>

<textarea
	bind:value
	class={cn(
		'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...$$restProps}
	on:blur
	on:change
	on:click
	on:focus
	on:focusin
	on:focusout
	on:keydown
	on:keypress
	on:keyup
	on:mousedown
	on:mouseenter
	on:mouseleave
	on:mouseover
	on:mouseup
	on:paste
	on:input
/>