<script lang="ts">
  export let event: any;
  import { createEventDispatcher } from 'svelte';
  import { Map, MapPin, Clipboard, Pencil } from '@lucide/svelte';
  const dispatch = createEventDispatcher();
  let copied = false;

  function close() {
    dispatch('close');
  }

  function edit() {
    dispatch('edit');
  }

  // School address fields (if available)
  let address = '';
  let mapsQuery = '';
  let phone = '';
  $: if (event && event.schoolData) {
    const s = event.schoolData;
    address = `${s.STRAATNAAM || ''} ${s.HUISNUMMER || ''}, ${s.POSTCODE || ''} ${s.PLAATSNAAM || ''}, ${s.GEMEENTENAAM || ''}`.replace(/ +/g, ' ').trim();
    mapsQuery = encodeURIComponent(address);
    phone = s.TELEFOONNUMMER || '';
  } else {
    address = '';
    mapsQuery = '';
    phone = '';
  }

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      copied = true;
      setTimeout(() => copied = false, 1200);
    });
  }
</script>

<div class="workshop-view-card">
  <div class="card-header">
    <button class="close-btn" on:click={close} aria-label="Sluiten">×</button>
  </div>
  <div class="details-title-row">
    <h2>Workshop details</h2>
    <button class="icon-btn edit-icon-btn" on:click={edit} aria-label="Bewerk" title="Bewerk deze workshop"><Pencil size={20} /></button>
  </div>
  {#if event}
    <div class="workshop-info-grid">
      <div><span>Les:</span> {#if event.lessonId}<a href={`/lessen/${event.lessonId}`} target="_blank">{event.lessonName}</a>{:else}-{/if}</div>
      <div><span>School:</span> {#if event.schoolId}<a href={`/scholen/${event.schoolId}`} target="_blank">{event.schoolName}</a>{:else}-{/if}</div>
      <div><span>Groep:</span> {event.group}</div>
      {#if event.groupExtension}
        <div><span>Uitbreiding:</span> {event.groupExtension}</div>
      {/if}
      <div><span>Vakdocent:</span> {#if event.teacherId}<a href={`/team/${event.teacherId}`} target="_blank">{event.teacherName}</a>{:else}-{/if}</div>
      <div><span>Start:</span> {event.start}</div>
      <div><span>Eind:</span> {event.end}</div>
      <div><span>Lengte:</span> {event.length} min</div>
      <div><span>Status:</span> {event.status}</div>
      <div><span>Materialen:</span> {event.materialen}</div>
      <div><span>Beschrijving:</span> {event.description}</div>
      <div><span>Kleur:</span> <span style="background:{event.color};padding:0.2em 0.8em;border-radius:4px;">{event.color}</span></div>
      {#if address}
        <div class="address-row" style="grid-column: 1 / -1;">
          <span>Adres:</span> {address}
          <span class="address-actions">
            <a href={`https://www.openstreetmap.org/search?query=${mapsQuery}`} target="_blank" title="Bekijk op OpenStreetMap" class="address-icon"><Map color="var(--accent)" size={20} /></a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" title="Bekijk op Google Maps" class="address-icon"><MapPin color="var(--warning)" size={20} /></a>
            <a href="#" class="address-icon clipboard-btn" title={copied ? 'Gekopieerd!' : 'Kopieer adres'} aria-label="Kopieer adres" on:click|preventDefault={copyAddress}><Clipboard color="var(--foreground)" size={20} /></a>
          </span>
        </div>
      {/if}
      {#if phone}
        <div><span>Telefoon:</span> <a href={`tel:${phone}`}>{phone}</a></div>
      {/if}
    </div>
  {:else}
    <div>Geen gegevens beschikbaar.</div>
  {/if}
</div>

<style>
.workshop-view-card {
  max-width: 500px;
  margin: 0 auto;
  background: var(--background, #fff);
  color: var(--foreground, #222);
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  padding: 2rem 1.5rem 1.5rem 1.5rem;
  position: relative;
}
.close-btn {
  position: absolute;
  right: 1rem;
  top: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--accent, #3ba39b);
  cursor: pointer;
}
.close-btn:hover {
  color: var(--warning, #eab308);
}
.workshop-view-card h2 {
  margin-bottom: 1.5rem;
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--accent, #3ba39b);
}
.workshop-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 2rem;
  font-size: 1.05rem;
}
.workshop-info-grid span {
  font-weight: 600;
  color: var(--foreground, #222);
  margin-right: 0.5rem;
}
@media (max-width: 600px) {
  .workshop-info-grid {
    grid-template-columns: 1fr;
  }
  .workshop-view-card {
    padding: 1.2rem 0.5rem 1.5rem 0.5rem;
  }
  .close-btn {
    right: 0.5rem;
    top: 0.5rem;
  }
}
.address-actions {
  display: inline-flex;
  gap: 0.4rem;
  vertical-align: middle;
  margin-left: 0.5rem;
}
.card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.details-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.2rem;
}
.icon-btn.edit-icon-btn {
  background: none;
  border: none;
  color: var(--accent, #3ba39b);
  padding: 0.1em 0.3em;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
}
.icon-btn.edit-icon-btn:hover {
  background: var(--divider, #eaeaea);
  color: var(--warning, #eab308);
}
</style> 