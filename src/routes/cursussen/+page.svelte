<script lang="ts">
  import { onMount } from 'svelte';
  import { databases } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import DataTable from '$lib/components/ui/data-table.svelte';
  import { columns } from './columns';

  const databaseId = 'lessen';
  const collectionId = 'cursus';

  let courses: any[] = [];
  let loading = true;
  let error = '';
  let name = '';
  let description = '';
  let adding = false;
  let removing = '';
  let image = '';
  let price = '';
  let filterName = '';
  let filterDoelgroep = '';
  let search = '';

  async function fetchCourses() {
    loading = true;
    try {
      const res = await databases.listDocuments(databaseId, collectionId);
      courses = res.documents;
    } catch (e) {
      error = 'Kon cursussen niet ophalen.';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(fetchCourses);

  async function addCourse() {
    if (!name.trim()) return;
    adding = true;
    try {
      await databases.createDocument(databaseId, collectionId, 'unique()', { name, description, image, price });
      name = '';
      description = '';
      image = '';
      price = '';
      await fetchCourses();
    } catch (e) {
      error = 'Kon cursus niet toevoegen.';
      console.error(e);
    } finally {
      adding = false;
    }
  }

  async function removeCourse(id: string) {
    if (!confirm('Weet je zeker dat je deze cursus wilt verwijderen?')) return;
    removing = id;
    try {
      await databases.deleteDocument(databaseId, collectionId, id);
      await fetchCourses();
    } catch (e) {
      error = 'Kon cursus niet verwijderen.';
      console.error(e);
    } finally {
      removing = '';
    }
  }

  $: filteredCourses = courses.filter(course => {
    const matchesName = !filterName || (course.name || '').toLowerCase().includes(filterName.toLowerCase());
    const matchesDoelgroep = !filterDoelgroep || (course.doelgroep || '').toLowerCase().includes(filterDoelgroep.toLowerCase());
    const matchesSearch = !search ||
      (course.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (course.description || '').toLowerCase().includes(search.toLowerCase());
    return matchesName && matchesDoelgroep && matchesSearch;
  });
</script>

<h1>Cursussen</h1>

<div class="flex flex-wrap gap-2 mb-4">
  <input class="border p-2 rounded" placeholder="Filter op cursusnaam" bind:value={filterName} />
  <input class="border p-2 rounded" placeholder="Filter op doelgroep" bind:value={filterDoelgroep} />
  <input class="border p-2 rounded" placeholder="Zoeken..." bind:value={search} />
</div>

{#if loading}
  <p>Bezig met laden...</p>
{:else if error}
  <p class="text-red-500">{error}</p>
{:else}
  <DataTable data={filteredCourses} columns={columns} on:rowClick={e => goto(`/cursussen/${e.detail.$id}`)} />
{/if}

<div class="border p-2rem mb-2rem mt-8">
  <h2>Nieuwe cursus toevoegen</h2>
  <form on:submit|preventDefault={addCourse} class="flex flex-col gap-2">
    <input class="border p-2" placeholder="Naam van de cursus" bind:value={name} required />
    <textarea class="border p-2" placeholder="Beschrijving (optioneel)" bind:value={description}></textarea>
    <input class="border p-2" placeholder="Afbeelding URL (optioneel)" bind:value={image} />
    <input class="border p-2" type="number" min="0" step="0.01" placeholder="Prijs in euro (optioneel)" bind:value={price} />
    <button class="cta w-fit" type="submit" disabled={adding}>{adding ? 'Toevoegen...' : 'Cursus toevoegen'}</button>
  </form>
</div> 