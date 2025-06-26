<script lang="ts">
  import { onMount } from 'svelte';
  import { databases } from '$lib/appwrite';
  import { page } from '$app/stores';
  import { get, writable } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { Query } from 'appwrite';

  const databaseId = 'lessen';
  const cursusCollection = 'cursus';
  const lessonCollection = 'les';

  let cursus: any = null;
  let lessons: any[] = [];
  let loading = true;
  let error = '';
  let removing = '';

  async function fetchCursusAndLessons(id: string) {
    loading = true;
    try {
      cursus = await databases.getDocument(databaseId, cursusCollection, id);
      const res = await databases.listDocuments(databaseId, lessonCollection, [
        Query.equal('cursus', [id])
      ]);
      lessons = res.documents;
    } catch (e) {
      error = 'Kon cursus of lessen niet ophalen.';
      console.error(e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const params = get(page).params;
    fetchCursusAndLessons(params.id);
  });

  function addLesson() {
    goto(`/lessen/nieuw?cursus=${cursus.$id}`);
  }

  async function removeLessonFromCourse(lessonId: string) {
    if (!confirm('Weet je zeker dat je deze les uit deze cursus wilt verwijderen?')) return;
    removing = lessonId;
    try {
      await databases.updateDocument(databaseId, lessonCollection, lessonId, { cursus: '' });
      await fetchCursusAndLessons(cursus.$id);
    } catch (e) {
      error = 'Kon les niet verwijderen uit cursus.';
      console.error(e);
    } finally {
      removing = '';
    }
  }
</script>

{#if loading}
  <p>Bezig met laden...</p>
{:else if error}
  <p class="text-red-500">{error}</p>
{:else if cursus}
  <h1>{cursus.name}</h1>
  {#if cursus.description}
    <div class="mb-4 text-gray-500">{cursus.description}</div>
  {/if}
  <button class="cta mb-4" on:click={addLesson}>Nieuwe les toevoegen aan deze cursus</button>
  <h2>Lessen in deze cursus</h2>
  {#if lessons.length === 0}
    <div class="text-gray-500">Nog geen lessen in deze cursus.</div>
  {:else}
    <div class="grid gap-4">
      {#each lessons as lesson}
        <div class="border p-2rem flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <a href={`/lessen/${lesson.$id}`} class="font-bold text-lg accent">{lesson.onderwerp || 'Les zonder titel'}</a>
            <div class="text-sm text-gray-500">Lesnummer: {lesson.lesnummer}</div>
          </div>
          <button class="cta bg-red-600 hover:bg-red-700 mt-2 md:mt-0" on:click={() => removeLessonFromCourse(lesson.$id)} disabled={removing === lesson.$id}>
            {removing === lesson.$id ? 'Verwijderen...' : 'Verwijder uit cursus'}
          </button>
        </div>
      {/each}
    </div>
  {/if}
{/if} 