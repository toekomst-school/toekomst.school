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
    KLANT: false
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
      <input type="checkbox" bind:checked={form.KLANT} />
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
.school-form input,
.school-form select,
.school-form textarea {
  border: 1.5px solid var(--divider, #b2b2a2);
  border-radius: 6px;
  background: var(--background, #fff);
  padding: 0.5em 0.75em;
  font-size: 1rem;
  color: var(--foreground, #222);
  margin-top: 0.2em;
  margin-bottom: 0.5em;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.school-form input:focus,
.school-form select:focus,
.school-form textarea:focus {
  outline: none;
  border-color: var(--accent, #3ba39b);
  box-shadow: 0 0 0 2px var(--accent, #3ba39b33);
}
.school-form input[type="checkbox"] {
  width: 1.1em;
  height: 1.1em;
  margin-right: 0.5em;
  accent-color: var(--accent, #3ba39b);
  box-shadow: none;
  border-radius: 4px;
  vertical-align: middle;
}
</style> 