<script lang="ts">
  import { onMount } from 'svelte';
  import SchoolForm from './SchoolForm.svelte';
  import { Client, Databases, Query } from 'appwrite';
  import { appwrite } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import SvelteSelect from 'svelte-select';
  import DataTable from '$lib/components/ui/data-table.svelte';
  import Switch from 'shadcn-svelte';

  // Appwrite setup (assume endpoint/project are already set globally)
  const databases = new Databases(appwrite);
  const DB_ID = 'scholen';
  const COLLECTION_ID = 'school';

  // Pagination and filters
  let page = 1;
  const perPage = 10;
  let total = 0;
  let scholen = [];
  let loading = false;

  // Filters
  let filterProvincie = null;
  let filterPlaatsnaam = null;
  let search = '';

  // For dropdown options
  const dutchProvinces = [
    'Drenthe',
    'Flevoland',
    'Friesland',
    'Gelderland',
    'Groningen',
    'Limburg',
    'Noord-Brabant',
    'Noord-Holland',
    'Overijssel',
    'Utrecht',
    'Zeeland',
    'Zuid-Holland'
  ];
  let provincies = dutchProvinces.map(p => ({ label: p, value: p }));
  console.log('Static provincies:', provincies);
  let plaatsnamen = [];

  // Modal state
  let showModal = false;
  let editSchool = null;

  // Fetch unique values for dropdowns
  async function fetchDropdowns() {
    // Only fetch plaatsnamen dynamically
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTION_ID, [Query.limit(10000)]);
      console.log('Fetched schools for dropdowns:', res.documents);
      plaatsnamen = Array.from(new Set(res.documents.map(s => s.PLAATSNAAM))).filter(Boolean).sort().map(p => ({ label: p, value: p }));
    } catch (e) {
      console.error('Error fetching dropdowns:', e);
      plaatsnamen = [];
    }
  }

  // Fetch paginated, filtered scholen
  async function fetchScholen() {
    loading = true;
    let queries = [Query.limit(perPage), Query.offset((page - 1) * perPage)];
    if (filterProvincie && filterProvincie.value) queries.push(Query.equal('PROVINCIE', filterProvincie.value));
    if (filterPlaatsnaam && filterPlaatsnaam.value) queries.push(Query.equal('PLAATSNAAM', filterPlaatsnaam.value));
    if (search) {
      // Search on NAAM or address (STRAATNAAM + HUISNUMMER)
      queries.push(Query.or([
        Query.search('NAAM', search),
        Query.search('STRAATNAAM', search),
        Query.search('HUISNUMMER', search)
      ]));
    }
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTION_ID, queries);
      scholen = res.documents;
      total = res.total;
    } catch (e) {
      scholen = [];
      total = 0;
    }
    loading = false;
  }

  // Initial load
  onMount(async () => {
    await fetchDropdowns();
    await fetchScholen();
  });

  // React to filter/page changes
  $: fetchScholen(), [page, filterProvincie, filterPlaatsnaam, search];

  function openAdd() {
    editSchool = null;
    showModal = true;
  }
  function openEdit(school) {
    editSchool = school;
    showModal = true;
  }
  function closeModal() {
    showModal = false;
    editSchool = null;
  }
  async function handleSave(e) {
    const data = e.detail;
    try {
      if (editSchool && editSchool.$id) {
        await databases.updateDocument(DB_ID, COLLECTION_ID, editSchool.$id, data);
      } else {
        await databases.createDocument(DB_ID, COLLECTION_ID, 'unique()', data);
      }
      await fetchDropdowns();
      await fetchScholen();
      closeModal();
    } catch (err) {
      alert('Fout bij opslaan van school.');
    }
  }

  // Pagination helpers
  const totalPages = () => Math.ceil(total / perPage);
  function prevPage() { if (page > 1) page -= 1; }
  function nextPage() { if (page < totalPages()) page += 1; }

  const columns = [
    {
      id: 'NAAM',
      header: 'Naam',
      accessorKey: 'NAAM',
      cell: info => info.getValue(),
      width: '200px'
    },
    {
      id: 'PLAATSNAAM',
      header: 'Plaatsnaam',
      accessorKey: 'PLAATSNAAM',
      cell: info => info.getValue()
    },
    {
      id: 'TELEFOONNUMMER',
      header: 'Telefoonnummer',
      accessorKey: 'TELEFOONNUMMER',
      cell: info => info.getValue()
    },
    {
      id: 'INTERNETADRES',
      header: 'Internetadres',
      accessorKey: 'INTERNETADRES',
      cell: info => info.getValue()
    },
    {
      id: 'klant',
      header: 'Is klant',
      accessorKey: 'klant',
      cell: () => '', // handled by slot
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'actions',
      header: 'Bewerken',
      cell: () => '', // Placeholder, will be replaced by slot
      enableSorting: false,
      enableHiding: false,
    }
  ];
</script>

<div class="filters">
  <SvelteSelect
    items={provincies}
    bind:value={filterProvincie}
    placeholder="Alle provincies"
    clearable={true}
    class="w-[200px]"
  />
  <SvelteSelect
    items={plaatsnamen}
    bind:value={filterPlaatsnaam}
    placeholder="Alle plaatsen"
    clearable={true}
    class="w-[200px]"
  />
  <input
    type="text"
    placeholder="Zoek op naam of adres"
    bind:value={search}
  />
  <button on:click={openAdd}>+ School toevoegen</button>
</div>

{#if loading}
  <p>Laden...</p>
{:else}
  <div class="scholen-table-wrapper">
    <DataTable
      data={scholen}
      columns={columns}
      on:rowClick={e => goto(`/scholen/${e.detail.$id}`)}
    >
      <svelte:fragment slot="cell-klant" let:row>
        <Switch
          checked={row.klant}
          on:change={async (e) => {
            await databases.updateDocument('scholen', 'school', row.$id, { klant: e.detail });
            row.klant = e.detail;
          }}
          aria-label="Is klant"
        />
      </svelte:fragment>
      <svelte:fragment slot="cell-actions" let:row>
        <button on:click|stopPropagation={() => openEdit(row)}>Bewerken</button>
      </svelte:fragment>
    </DataTable>
  </div>
  <div class="pagination">
    <button on:click={prevPage} disabled={page === 1}>Vorige</button>
    <span>Pagina {page} van {totalPages()}</span>
    <button on:click={nextPage} disabled={page === totalPages()}>Volgende</button>
  </div>
{/if}

{#if showModal}
  <div class="modal-overlay">
    <div class="modal">
      <SchoolForm school={editSchool} on:save={handleSave} on:cancel={closeModal} />
    </div>
  </div>
{/if}

<style>
.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}
.pagination {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
}
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  min-width: 350px;
  max-width: 90vw;
}
.school-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}
.school-table th, .school-table td {
  border: 1px solid #ddd;
  padding: 0.5rem;
  text-align: left;
}
.school-table th {
  background: #f5f5f5;
}
.scholen-table-wrapper {
  max-width: 100%;
  width: 100%;
  overflow-x: auto;
}
.scholen-table-wrapper table {
  width: 100%;
}
</style>