<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Databases } from 'appwrite';
  import { appwrite } from '$lib/appwrite';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';

  const DB_ID = 'scholen';
  const COLLECTION_ID = 'school';
  let school: any = null;
  let loading = true;
  let notFound = false;

  onMount(async () => {
    const id = get(page).params.id;
    const databases = new Databases(appwrite);
    try {
      const res = await databases.getDocument(DB_ID, COLLECTION_ID, id);
      school = res;
    } catch (e) {
      notFound = true;
    }
    loading = false;
  });
</script>

{#if loading}
  <div class="school-view-card"><p>Laden...</p></div>
{:else if notFound}
  <div class="school-view-card"><p>School niet gevonden.</p></div>
{:else}
  <div class="school-view-card">
    <button class="back-btn" on:click={() => goto('/scholen')}>← Terug naar scholen</button>
    <h1>{school.NAAM}</h1>
    <div class="school-info-grid">
      <div><span>Provincie:</span> {school.PROVINCIE}</div>
      <div><span>BRIN:</span> {school.BRIN}</div>
      <div><span>Instellingscode:</span> {school.INSTELLINGSCODE}</div>
      <div><span>Vestigingscode:</span> {school.VESTIGINGSCODE}</div>
      <div><span>Straatnaam:</span> {school.STRAATNAAM}</div>
      <div><span>Huisnummer:</span> {school.HUISNUMMER}</div>
      <div><span>Postcode:</span> {school.POSTCODE}</div>
      <div><span>Plaatsnaam:</span> {school.PLAATSNAAM}</div>
      <div><span>Gemeentenaam:</span> {school.GEMEENTENAAM}</div>
      <div><span>Denominatie:</span> {school.DENOMINATIE}</div>
      <div><span>Telefoonnummer:</span> {school.TELEFOONNUMMER}</div>
      <div><span>Internetadres:</span> <a href={school.INTERNETADRES} target="_blank">{school.INTERNETADRES}</a></div>
      <div><span>Vakantieregio:</span> {school.VAKANTIEREGIO}</div>
      <div><span>Onderwijsstructuur:</span> {school.ONDERWIJSSTRUCTUUR}</div>
    </div>
  </div>
{/if}

<style>
.school-view-card {
  max-width: 700px;
  margin: 2rem auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  padding: 2.5rem 2rem 2rem 2rem;
  position: relative;
}
.school-view-card h1 {
  margin-bottom: 2rem;
  font-size: 2.2rem;
  color: #2563eb;
}
.school-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem 2rem;
  font-size: 1.1rem;
}
.school-info-grid span {
  font-weight: 600;
  color: #444;
  margin-right: 0.5rem;
}
.school-info-grid a {
  color: #2563eb;
  text-decoration: underline;
}
.back-btn {
  position: absolute;
  left: 2rem;
  top: 1.5rem;
  background: none;
  border: none;
  color: #2563eb;
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 1rem;
}
.back-btn:hover {
  text-decoration: underline;
}
@media (max-width: 600px) {
  .school-info-grid {
    grid-template-columns: 1fr;
  }
  .school-view-card {
    padding: 1.2rem 0.5rem 1.5rem 0.5rem;
  }
  .back-btn {
    left: 0.5rem;
    top: 1rem;
  }
}
</style> 