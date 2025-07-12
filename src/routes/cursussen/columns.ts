import type { ColumnDef } from '@tanstack/table-core';
import { createRawSnippet } from 'svelte';
import { renderSnippet } from '$lib/components/ui/data-table/index.js';

export type Course = {
	$id: string;
	name: string;
	description?: string;
	image?: string;
	price?: string | number;
};

export const columns: ColumnDef<Course>[] = [
	{
		accessorKey: 'name',
		header: 'Naam',
		cell: ({ row }) => row.getValue('name')
	},
	{
		accessorKey: 'description',
		header: 'Beschrijving',
		cell: ({ row }) => row.getValue('description')
	},
	{
		accessorKey: 'image',
		header: 'Afbeelding',
		cell: ({ row }) => {
			const url = row.getValue('image');
			if (!url) return '';
			// Use a Svelte snippet to render the image
			const imgSnippet = createRawSnippet<[]>(() => {
				return {
					render: () =>
						`<img src='${url}' alt='Cursus afbeelding' class='h-12 w-12 object-cover rounded' />`
				};
			});
			return renderSnippet(imgSnippet);
		},
		enableSorting: false
	},
	{
		accessorKey: 'price',
		header: 'Prijs',
		cell: ({ row }) => {
			const price = row.getValue('price');
			return price ? `€ ${Number(price).toFixed(2)}` : '-';
		}
	}
	// Actions column can be added here for edit/delete if needed
];
