<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Databases } from 'appwrite';
  import { appwrite } from '$lib/appwrite';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { Map, MapPin, Clipboard, Pencil } from '@lucide/svelte';

  const DB_ID = 'scholen';
  const COLLECTION_ID = 'school';
  let school: any = null;
  let loading = true;
  let notFound = false;
  let copied = false;

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

  function copyAddress() {
    const address = `${school.STRAATNAAM} ${school.HUISNUMMER}, ${school.POSTCODE} ${school.PLAATSNAAM}, ${school.GEMEENTENAAM}`;
    navigator.clipboard.writeText(address).then(() => {
      copied = true;
      setTimeout(() => copied = false, 1200);
    });
  }

  function editSchool() {
    goto(`/scholen/${school.$id}/bewerken`);
  }
</script>

{#if loading}
  <div class="school-view-card"><p>Laden...</p></div>
{:else if notFound}
  <div class="school-view-card"><p>School niet gevonden.</p></div>
{:else}
  <div class="school-view-card">
    <button class="edit-btn" on:click={editSchool} aria-label="Bewerk school" title="Bewerk school">
      <Pencil size={20} />
    </button>
    <h1>{school.NAAM}</h1>
    <div class="school-subtitle">{school.DENOMINATIE}</div>
    <div class="school-info-grid">
      <div>
        <span>Adres:</span>
        {school.STRAATNAAM} {school.HUISNUMMER}, {school.POSTCODE} {school.PLAATSNAAM}, {school.GEMEENTENAAM}
        <a
          href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${school.STRAATNAAM} ${school.HUISNUMMER}, ${school.POSTCODE} ${school.PLAATSNAAM}, ${school.GEMEENTENAAM}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Bekijk op OpenStreetMap"
          class="address-icon"
        >
          <Map color="var(--accent)" size={20} />
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${school.STRAATNAAM} ${school.HUISNUMMER}, ${school.POSTCODE} ${school.PLAATSNAAM}, ${school.GEMEENTENAAM}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Bekijk op Google Maps"
          class="address-icon"
        >
          <MapPin color="var(--warning)" size={20} />
        </a>
        <button
          class="address-icon clipboard-btn"
          title={copied ? 'Gekopieerd!' : 'Kopieer adres'}
          aria-label="Kopieer adres"
          on:click={copyAddress}
        >
          <Clipboard color="var(--foreground)" size={20} />
        </button>
      </div>
      <div><span>Telefoonnummer:</span> {school.TELEFOONNUMMER}</div>
      <div><span>Internetadres:</span> <a href={(school.INTERNETADRES?.startsWith('http') ? school.INTERNETADRES : `https://${school.INTERNETADRES}`)} target="_blank">{school.INTERNETADRES}</a></div>
      <div><span>Is klant:</span> {school.KLANT ? 'Ja' : 'Nee'}</div>
      <div><span>Onderwijsstructuur:</span> {school.ONDERWIJSSTRUCTUUR}</div>
      <details class="school-details-tab">
        <summary>Groepen/Klassen</summary>
        <!-- Hier kun je later groepen/klassen info tonen -->
      </details>
      <details class="school-details-tab">
        <summary>Overige info</summary>
        <div><span>Provincie:</span> {school.PROVINCIE}</div>
        <div><span>BRIN:</span> {school.BRIN}</div>
        <div><span>Instellingscode:</span> {school.INSTELLINGSCODE}</div>
        <div><span>Vestigingscode:</span> {school.VESTIGINGSCODE}</div>
        <div><span>Vakantieregio:</span> {school.VAKANTIEREGIO}</div>
      </details>
    </div>
  </div>
{/if}

<style>
.school-view-card {
  max-width: 700px;
  margin: 2rem auto;
  background: var(--background);
  color: var(--foreground);
  border-radius: 12px;
  box-shadow: 0 2px 16px var(--divider, rgba(0,0,0,0.08));
  padding: 2.5rem 2rem 2rem 2rem;
  position: relative;
}
.school-view-card h1 {
  margin-bottom: 2rem;
  font-size: 2.2rem;
  color: var(--accent);
}
.school-subtitle {
  margin-top: -1.2rem;
  margin-bottom: 2rem;
  font-size: 1.15rem;
  color: var(--accent);
  font-weight: 500;
  letter-spacing: 0.01em;
}
.school-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem 2rem;
  font-size: 1.1rem;
}
.school-info-grid span {
  font-weight: 600;
  color: var(--foreground);
  margin-right: 0.5rem;
}
.school-info-grid a {
  color: var(--warning);
  text-decoration: underline;
}
.school-info-grid a:hover {
  color: var(--accent);
}
.back-btn {
  position: absolute;
  left: 2rem;
  top: 1.5rem;
  background: none;
  border: none;
  color: var(--accent);
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 1rem;
}
.back-btn:hover {
  text-decoration: underline;
  color: var(--warning);
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
.address-icon {
  display: inline-block;
  vertical-align: middle;
  margin-left: 0.5rem;
  transition: transform 0.15s;
}
.address-icon:hover {
  transform: scale(1.15);
}
.clipboard-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
.school-details-tab {
  grid-column: 1 / -1;
  margin-top: 1.5rem;
  background: var(--background);
  border-radius: 8px;
  border: 1px solid var(--divider);
  padding: 0.5rem 1rem 1rem 1rem;
}
.school-details-tab summary {
  font-weight: bold;
  font-size: 1.1rem;
  color: var(--accent);
  cursor: pointer;
  outline: none;
  margin-bottom: 0.5rem;
}
.school-details-tab[open] summary {
  margin-bottom: 1rem;
}
.school-details-tab div {
  margin-bottom: 0.5rem;
}
.edit-btn {
  position: absolute;
  right: 2rem;
  top: 1.5rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 0.5em 1.5em;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}
.edit-btn:hover {
  background: var(--warning);
  color: var(--foreground);
}
</style> 