<script lang="ts">
  import { onMount } from 'svelte';
  import { databases } from '$lib/appwrite';
  import { goto } from '$app/navigation';

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
</script>

<h1>Cursussen</h1>

{#if loading}
  <p>Bezig met laden...</p>
{:else if error}
  <p class="text-red-500">{error}</p>
{:else}
  <div class="grid gap-4">
    {#each courses as course}
      <div class="border p-2rem flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <a href={`/cursussen/${course.$id}`} class="font-bold text-lg accent">{course.name}</a>
          {#if course.description}
            <div class="text-sm text-gray-500">{course.description}</div>
          {/if}
          {#if course.image}
            <img src={course.image} alt="Cursus afbeelding" class="h-16 w-16 object-cover rounded mb-2" />
          {/if}
          {#if course.price}
            <div class="text-sm text-green-700 font-bold">€ {Number(course.price).toFixed(2)}</div>
          {/if}
        </div>
        <button class="cta bg-red-600 hover:bg-red-700 mt-2 md:mt-0" on:click={() => removeCourse(course.$id)} disabled={removing === course.$id}>
          {removing === course.$id ? 'Verwijderen...' : 'Verwijder'}
        </button>
        <a href={`/cursussen/${course.$id}?edit=1`} class="cta bg-blue-600 hover:bg-blue-700 mt-2 md:mt-0 ml-2">Bewerk</a>
      </div>
    {/each}
    {#if courses.length === 0}
      <div class="text-gray-500">Nog geen cursussen.</div>
    {/if}
  </div>
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