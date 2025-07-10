import type { ColumnDef } from "@tanstack/table-core";
import { createRawSnippet } from "svelte";
import { renderSnippet } from "$lib/components/ui/data-table/index.js";

export type Lesson = {
  $id: string;
  onderwerp: string;
  doelgroep_min: number;
  doelgroep_max: number;
  duur: number;
  cursus?: string;
  cursus_name?: string;
  videoUrl?: string;
  videoThumbnail?: string;
};

// Helper to format doelgroep
function doelgroepBundled(min: number, max: number) {
  const group = (y: number) => y <= 8 ? `Groep ${y}` : y === 9 ? 'Brugklas' : `Klas ${y - 8}`;
  const school = (y: number) => y <= 8 ? 'Basisschool' : 'Middelbare school';
  const age = (y: number) => y <= 8 ? [y + 3, y + 4] : [y + 3, y + 4];
  const minAge = age(min)[0], maxAge = age(max)[1];
  return `${group(min)}-${group(max)}, ${school(min)}, ${minAge}-${maxAge} jaar`;
}

export const columns: ColumnDef<Lesson>[] = [
  {
    accessorKey: "cursus_name",
    header: "Cursus",
    cell: ({ row }) => row.getValue("cursus_name") || '-',
  },
  {
    accessorKey: "onderwerp",
    header: "Onderwerp",
    cell: ({ row }) => row.getValue("onderwerp"),
  },
  {
    id: "doelgroep",
    header: "Doelgroep",
    cell: ({ row }) => doelgroepBundled(row.original.doelgroep_min, row.original.doelgroep_max),
  },
  {
    accessorKey: "duur",
    header: "Duur (min)",
    cell: ({ row }) => row.getValue("duur"),
  },
  {
    id: "actions",
    header: "Acties",
    cell: ({ row, table }) => {
      // @ts-expect-error: meta is not typed for isAdmin, but we use it for admin-only actions
      const isAdmin = table.options.meta?.isAdmin;
      const snippet = createRawSnippet<[]>(( ) => {
        return {
          render: () => `
            <button class='cta' onclick='window.location.assign("/lessen/nieuw?id=${row.original.$id}")'>Bewerk</button>
            ${isAdmin ? `<button class='cta bg-red-600 ml-2' onclick='window.dispatchEvent(new CustomEvent("deleteLesson", { detail: "${row.original.$id}" }))'>Verwijder</button>` : ''}
          `
        };
      });
      return renderSnippet(snippet);
    },
    enableSorting: false,
    enableHiding: false,
  },
]; 