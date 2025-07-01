<script>
  import { createEventDispatcher, onMount } from 'svelte';
  export let school = {};
  const dispatch = createEventDispatcher();

  let form = {
    PROVINCIE: '',
    BRIN: '',
    INSTELLINGSCODE: '',
    VESTIGINGSCODE: '',
    NAAM: '',
    STRAATNAAM: '',
    HUISNUMMER: '',
    POSTCODE: '',
    PLAATSNAAM: '',
    GEMEENTENAAM: '',
    DENOMINATIE: '',
    TELEFOONNUMMER: '',
    INTERNETADRES: '',
    VAKANTIEREGIO: '',
    ONDERWIJSSTRUCTUUR: '',
    klant: false
  };

  onMount(() => {
    if (school) {
      form = { ...form, ...school };
    }
  });

  function handleSubmit(e) {
    e.preventDefault();
    dispatch('save', { ...form });
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="school-form">
  <div class="form-grid">
    <label>
      Provincie
      <input bind:value={form.PROVINCIE} required />
    </label>
    <label>
      BRIN
      <input type="number" bind:value={form.BRIN} required />
    </label>
    <label>
      Instellingscode
      <input bind:value={form.INSTELLINGSCODE} required />
    </label>
    <label>
      Vestigingscode
      <input bind:value={form.VESTIGINGSCODE} required />
    </label>
    <label>
      Naam
      <input bind:value={form.NAAM} required />
    </label>
    <label>
      Straatnaam
      <input bind:value={form.STRAATNAAM} required />
    </label>
    <label>
      Huisnummer
      <input bind:value={form.HUISNUMMER} required />
    </label>
    <label>
      Postcode
      <input bind:value={form.POSTCODE} required />
    </label>
    <label>
      Plaatsnaam
      <input bind:value={form.PLAATSNAAM} required />
    </label>
    <label>
      Gemeentenaam
      <input bind:value={form.GEMEENTENAAM} required />
    </label>
    <label>
      Denominatie
      <input bind:value={form.DENOMINATIE} required />
    </label>
    <label>
      Telefoonnummer
      <input bind:value={form.TELEFOONNUMMER} required />
    </label>
    <label>
      Internetadres
      <input bind:value={form.INTERNETADRES} required />
    </label>
    <label>
      Vakantieregio
      <input bind:value={form.VAKANTIEREGIO} required />
    </label>
    <label>
      Onderwijsstructuur
      <input bind:value={form.ONDERWIJSSTRUCTUUR} required />
    </label>
    <label style="grid-column: 1 / -1; display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem;">
      <input type="checkbox" bind:checked={form.klant} />
      Is klant?
    </label>
  </div>
  <div class="form-actions">
    <button type="submit">Opslaan</button>
    <button type="button" on:click={handleCancel}>Annuleren</button>
  </div>
</form>

<style>
.school-form {
  max-width: 600px;
  margin: 0 auto;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.form-actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}
</style> 