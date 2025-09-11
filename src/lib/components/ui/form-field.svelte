<script lang="ts">
	import { cn } from '$lib/utils';
	import { Input } from './input';
	import { Button } from './button';
	import { AlertCircle, Eye, EyeOff, HelpCircle } from 'lucide-svelte';
	import type { ZodError } from 'zod';

	interface FormFieldProps {
		label: string;
		name: string;
		type?:
			| 'text'
			| 'email'
			| 'password'
			| 'number'
			| 'textarea'
			| 'select'
			| 'checkbox'
			| 'radio'
			| 'date'
			| 'url';
		value?: any;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		helpText?: string;
		errors?: ZodError['errors'];
		options?: Array<{ label: string; value: string }>;
		rows?: number;
		min?: number;
		max?: number;
		step?: number;
		class?: string;
		inputClass?: string;
	}

	let {
		label,
		name,
		type = 'text',
		value = $bindable(''),
		placeholder,
		required = false,
		disabled = false,
		helpText,
		errors = [],
		options = [],
		rows = 3,
		min,
		max,
		step,
		class: className,
		inputClass,
		...restProps
	}: FormFieldProps = $props();

	// Get field-specific errors
	const fieldErrors = $derived(
		errors.filter((error) => error.path.includes(name) || error.path[0] === name)
	);

	const hasErrors = $derived(fieldErrors.length > 0);
	const errorMessage = $derived(fieldErrors[0]?.message || '');

	// Password visibility toggle
	let showPassword = $state(false);
	const togglePasswordVisibility = () => (showPassword = !showPassword);

	// Generate unique ID for accessibility
	const fieldId = `field-${name}-${Math.random().toString(36).substr(2, 9)}`;
	const helpId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
</script>

<div class={cn('space-y-2', className)} {...restProps}>
	<!-- Label -->
	<label
		for={fieldId}
		class={cn(
			'text-foreground block text-sm font-medium',
			required && 'after:text-destructive after:ml-0.5 after:content-["*"]'
		)}
	>
		{label}
		{#if helpText}
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground ml-1 inline-flex items-center"
				title={helpText}
			>
				<HelpCircle class="h-3 w-3" />
				<span class="sr-only">Help for {label}</span>
			</button>
		{/if}
	</label>

	<!-- Input Fields -->
	<div class="relative">
		{#if type === 'textarea'}
			<textarea
				id={fieldId}
				{name}
				bind:value
				{placeholder}
				{required}
				{disabled}
				{rows}
				class={cn(
					'border-input bg-background flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm',
					'ring-offset-background placeholder:text-muted-foreground',
					'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
					'disabled:cursor-not-allowed disabled:opacity-50',
					hasErrors && 'border-destructive focus-visible:ring-destructive',
					inputClass
				)}
				aria-invalid={hasErrors}
				aria-describedby={cn(helpText && helpId, hasErrors && errorId)}
			></textarea>
		{:else if type === 'select'}
			<select
				id={fieldId}
				{name}
				bind:value
				{required}
				{disabled}
				class={cn(
					'border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm',
					'ring-offset-background placeholder:text-muted-foreground',
					'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
					'disabled:cursor-not-allowed disabled:opacity-50',
					hasErrors && 'border-destructive focus-visible:ring-destructive',
					inputClass
				)}
				aria-invalid={hasErrors}
				aria-describedby={cn(helpText && helpId, hasErrors && errorId)}
			>
				{#if placeholder}
					<option value="" disabled>{placeholder}</option>
				{/if}
				{#each options as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		{:else if type === 'checkbox'}
			<div class="flex items-start space-x-2">
				<input
					type="checkbox"
					id={fieldId}
					{name}
					bind:checked={value}
					{required}
					{disabled}
					class={cn(
						'border-input text-primary h-4 w-4 rounded border',
						'focus:ring-ring focus:ring-2 focus:ring-offset-2',
						'disabled:cursor-not-allowed disabled:opacity-50',
						hasErrors && 'border-destructive focus:ring-destructive'
					)}
					aria-invalid={hasErrors}
					aria-describedby={cn(helpText && helpId, hasErrors && errorId)}
				/>
			</div>
		{:else if type === 'radio'}
			<div class="space-y-2">
				{#each options as option}
					<div class="flex items-center space-x-2">
						<input
							type="radio"
							id="{fieldId}-{option.value}"
							{name}
							value={option.value}
							bind:group={value}
							{required}
							{disabled}
							class={cn(
								'border-input text-primary h-4 w-4 border',
								'focus:ring-ring focus:ring-2 focus:ring-offset-2',
								'disabled:cursor-not-allowed disabled:opacity-50',
								hasErrors && 'border-destructive focus:ring-destructive'
							)}
						/>
						<label for="{fieldId}-{option.value}" class="text-foreground text-sm font-medium">
							{option.label}
						</label>
					</div>
				{/each}
			</div>
		{:else if type === 'password'}
			<div class="relative">
				<Input
					id={fieldId}
					{name}
					type={showPassword ? 'text' : 'password'}
					bind:value
					{placeholder}
					{required}
					{disabled}
					class={cn(
						'pr-10',
						hasErrors && 'border-destructive focus-visible:ring-destructive',
						inputClass
					)}
					aria-invalid={hasErrors}
					aria-describedby={cn(helpText && helpId, hasErrors && errorId)}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					class="absolute top-0 right-0 h-full px-3"
					on:click={togglePasswordVisibility}
					tabindex="-1"
				>
					{#if showPassword}
						<EyeOff class="h-4 w-4" />
						<span class="sr-only">Hide password</span>
					{:else}
						<Eye class="h-4 w-4" />
						<span class="sr-only">Show password</span>
					{/if}
				</Button>
			</div>
		{:else}
			<Input
				id={fieldId}
				{name}
				{type}
				bind:value
				{placeholder}
				{required}
				{disabled}
				{min}
				{max}
				{step}
				class={cn(hasErrors && 'border-destructive focus-visible:ring-destructive', inputClass)}
				aria-invalid={hasErrors}
				aria-describedby={cn(helpText && helpId, hasErrors && errorId)}
			/>
		{/if}
	</div>

	<!-- Help Text -->
	{#if helpText}
		<p id={helpId} class="text-muted-foreground text-xs">
			{helpText}
		</p>
	{/if}

	<!-- Error Message -->
	{#if hasErrors}
		<div id={errorId} class="text-destructive flex items-center gap-1 text-sm" role="alert">
			<AlertCircle class="h-4 w-4 flex-shrink-0" />
			<span>{errorMessage}</span>
		</div>
	{/if}
</div>
