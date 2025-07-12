<script lang="ts" generics="TData, TValue">
	import { type ColumnDef, getCoreRowModel } from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { createEventDispatcher } from 'svelte';

	/**
	 * Usage:
	 * <DataTable ... on:rowClick={e => ...} />
	 * e.detail = row.original
	 */

	type DataTableProps<TData, TValue> = {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
	};

	let { data, columns }: DataTableProps<TData, TValue> = $props();
	const dispatch = createEventDispatcher();

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		getCoreRowModel: getCoreRowModel()
	});
</script>

<div class="rounded-md border">
	<Table.Root>
		<Table.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<Table.Row>
					{#each headerGroup.headers as header (header.id)}
						<Table.Head colspan={header.colSpan}>
							{#if !header.isPlaceholder}
								<FlexRender
									content={header.column.columnDef.header}
									context={header.getContext()}
								/>
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			{/each}
		</Table.Header>
		<Table.Body>
			{#each table.getRowModel().rows as row (row.id)}
				<tr
					data-state={row.getIsSelected() && 'selected'}
					class="hover:bg-accent cursor-pointer"
					on:click={(event) => {
						const target = event.target as HTMLElement;
						const tag = target?.tagName?.toLowerCase();
						if (tag === 'a' || tag === 'button' || target.closest('a,button')) return;
						dispatch('rowClick', row.original);
					}}
				>
					{#each row.getVisibleCells() as cell (cell.id)}
						<Table.Cell>
							<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
						</Table.Cell>
					{/each}
				</tr>
			{:else}
				<Table.Row>
					<Table.Cell colspan={columns.length} class="h-24 text-center">
						Geen resultaten.
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</div>

<style>
	.cursor-pointer {
		cursor: pointer;
	}
	.hover\:bg-accent:hover {
		color: var(--warning);
	}
	tr[data-state='selected'] {
		color: var(--warning);
	}
</style>
