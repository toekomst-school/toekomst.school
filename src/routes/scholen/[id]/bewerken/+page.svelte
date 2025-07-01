<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Databases } from 'appwrite';
  import { appwrite } from '$lib/appwrite';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import SchoolForm from '../../SchoolForm.svelte';

  const DB_ID = 'scholen';
  const COLLECTION_ID = 'school';
  let school: any = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    const id = get(page).params.id;
    const databases = new Databases(appwrite);
    try {
      const res = await databases.getDocument(DB_ID, COLLECTION_ID, id);
      school = res;
    } catch (e) {
      error = 'School niet gevonden.';
    }
    loading = false;
  });

  async function handleSave(e) {
    let data = e.detail;
    const id = get(page).params.id;
    const databases = new Databases(appwrite);
    // Filter Appwrite metadata uit data
    const forbidden = ['$id', '$databaseId', '$collectionId', '$createdAt', '$updatedAt', '$permissions', '$read', '$write'];
    data = Object.fromEntries(Object.entries(data).filter(([k]) => !forbidden.includes(k)));
    try {
      await databases.updateDocument(DB_ID, COLLECTION_ID, id, data);
      goto(`/scholen/${id}`);
    } catch (err) {
      error = 'Fout bij opslaan van school.';
    }
  }
  function handleCancel() {
    const id = get(page).params.id;
    goto(`/scholen/${id}`);
  }
</script>

<div class="school-edit-card">
  <h1>School bewerken</h1>
  {#if loading}
    <p>Laden...</p>
  {:else if error}
    <p class="text-red-500">{error}</p>
  {:else}
    <SchoolForm school={school} on:save={handleSave} on:cancel={handleCancel} />
  {/if}
</div>

<style>
.school-edit-card {
  max-width: 700px;
  margin: 2rem auto;
  background: var(--background);
  color: var(--foreground);
  border-radius: 12px;
  box-shadow: 0 2px 16px var(--divider, rgba(0,0,0,0.08));
  padding: 2.5rem 2rem 2rem 2rem;
  position: relative;
}
.school-edit-card h1 {
  margin-bottom: 2rem;
  font-size: 2.2rem;
  color: var(--accent);
}
</style> 