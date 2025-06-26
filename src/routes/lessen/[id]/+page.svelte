<script lang="ts">
  import { onMount } from 'svelte';
  import { databases } from '$lib/appwrite';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';

  const databaseId = 'lessen';
  const collectionId = 'les';

  let lesson: any = null;
  let error = '';
  let loading = true;

  onMount(async () => {
    const params = get(page).params;
    try {
      lesson = await databases.getDocument(databaseId, collectionId, params.id);
    } catch (e) {
      error = 'Kon les niet ophalen.';
      console.error(e);
    } finally {
      loading = false;
    }
  });

  function editLesson() {
    goto(`/lessen/nieuw/${lesson.$id}`);
  }
</script>

{#if loading}
  <p>Bezig met laden...</p>
{:else if error}
  <p class="text-red-500">{error}</p>
{:else if lesson}
  <h1>{lesson.onderwerp || 'Les zonder titel'}</h1>
  <button class="cta mb-2rem" on:click={editLesson}>Bewerk deze les</button>
  <div class="border p-2rem mb-2rem">
    <p><b>Lesnummer:</b> {lesson.lesnummer}</p>
    <p><b>Doelgroep/Leerjaar:</b> {lesson.doelgroep}</p>
    <p><b>Duur van de les:</b> {lesson.duur}</p>
    <h2>Waarom deze les?</h2>
    <p>{lesson.waarom}</p>
    <h2>Doel van de les (voor leerlingen)</h2>
    <p>{lesson.doel}</p>
    <h2>Leerdoelen (voor leraren)</h2>
    <p>{lesson.leerdoelen}</p>
    <h2>Introductie (5-10 min)</h2>
    <p>{lesson.intro}</p>
    <h2>Kernactiviteit (20-30 min)</h2>
    <p>{lesson.kern}</p>
    <h2>Reflectie en Afronding (5-10 min)</h2>
    <p>{lesson.reflectie}</p>
    <h2>Materialen en Middelen</h2>
    <p>{lesson.materialen}</p>
    <h2>Evaluatie van Leerlingen</h2>
    <p>{lesson.evaluatie}</p>
    <h2>Feedback voor de Les</h2>
    <p>{lesson.feedback}</p>
    {#if lesson.aanvullend}
      <h2>Aanvullende Opdrachten</h2>
      <p>{lesson.aanvullend}</p>
    {/if}
  </div>
{/if} 