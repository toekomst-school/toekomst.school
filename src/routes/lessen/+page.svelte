<script lang="ts">
  import { onMount } from 'svelte';
  import { databases } from '$lib/appwrite';
  import { goto } from '$app/navigation';

  // Replace with your actual database and collection IDs
  const databaseId = 'lessen'; // or your actual database ID
  const collectionId = 'les';

  let lessons: any[] = [];
  let loading = true;
  let error = '';
  let success = '';
  let adding = false;

  // Form fields for the lesson template
  let lesnummer = '';
  let onderwerp = '';
  let doelgroep = '';
  let duur = '';
  let waarom = '';
  let doel = '';
  let leerdoelen = '';
  let intro = '';
  let kern = '';
  let reflectie = '';
  let materialen = '';
  let evaluatie = '';
  let feedback = '';
  let aanvullend = '';

  async function fetchLessons() {
    loading = true;
    try {
      const response = await databases.listDocuments(databaseId, collectionId);
      lessons = response.documents;
    } catch (e) {
      error = 'Kon lessen niet ophalen.';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(fetchLessons);

  function openLesson(id: string) {
    goto(`/lessen/${id}`);
  }

  async function addLesson() {
    adding = true;
    error = '';
    success = '';
    try {
      const doc = {
        lesnummer,
        onderwerp,
        doelgroep,
        duur,
        waarom,
        doel,
        leerdoelen,
        intro,
        kern,
        reflectie,
        materialen,
        evaluatie,
        feedback,
        aanvullend
      };
      await databases.createDocument(databaseId, collectionId, 'unique()', doc);
      success = 'Les succesvol toegevoegd!';
      // Clear form
      lesnummer = onderwerp = doelgroep = duur = waarom = doel = leerdoelen = intro = kern = reflectie = materialen = evaluatie = feedback = aanvullend = '';
      await fetchLessons();
    } catch (e) {
      error = 'Kon les niet toevoegen.';
      console.error(e);
    } finally {
      adding = false;
    }
  }
</script>

<h1>Lessen</h1>
<p>Welkom op de Lessen pagina.</p>

<a href="/lessen/nieuw"><button class="cta mb-2rem">Nieuwe Les Toevoegen</button></a>

{#if loading}
  <p>Bezig met laden...</p>
{:else if error && !success}
  <p class="text-red-500">{error}</p>
{:else}
  <div class="grid-12 mt-2rem">
    {#each lessons as lesson}
      <div class="border p-2rem mb-2rem cursor-pointer hover:bg-accent" on:click={() => openLesson(lesson.$id)}>
        <h2 class="accent">{lesson.onderwerp || 'Les zonder titel'}</h2>
        <p><b>Lesnummer:</b> {lesson.lesnummer}</p>
        <p><b>Doelgroep:</b> {lesson.doelgroep}</p>
        <p><b>Duur:</b> {lesson.duur}</p>
        <p>{lesson.waarom}</p>
      </div>
    {/each}
  </div>
{/if} 