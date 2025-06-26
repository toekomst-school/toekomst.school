<script lang="ts">
  import { onMount } from 'svelte';
  import { databases } from '$lib/appwrite';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import RangeSlider from 'svelte-range-slider-pips';
  import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

  const databaseId = 'lessen';
  const collectionId = 'les';

  let editing = false;
  let lessonId = '';
  let lesnummer = '';
  let onderwerp = '';
  let doelgroep_min = 3; // default to Groep 3
  let doelgroep_max = 8; // default to Groep 8
  let duur = 45; // default to 45 minutes
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
  let cursus = '';

  let error = '';
  let adding = false;

  let doelgroep_range = [doelgroep_min, doelgroep_max];
  let duurError = '';

  const kerndoelenOpties = [
    { group: 'Digitale systemen', options: [
      { value: 'ds1', label: 'Digitale systemen' },
      { value: 'ds2', label: 'Digitale media en informatie' },
      { value: 'ds3', label: 'Veiligheid en privacy' },
      { value: 'ds4', label: 'Artificiële intelligentie (AI)' },
    ]},
    { group: 'Ontwerpen en maken', options: [
      { value: 'om5', label: 'Creëren met digitale technologie' },
    ]},
    { group: 'Wisselwerking tussen digitale technologie, digitale media, de mens en de samenleving', options: [
      { value: 'ws6', label: 'Digitale technologie, jezelf en de ander' },
      { value: 'ws6b', label: 'Digitale technologie, jezelf, de ander en de samenleving' },
    ]},
  ];
  let kerndoelenSelected: string[] = [];

  const groupOptions = [
    { value: 1, label: 'Groep 1' },
    { value: 2, label: 'Groep 2' },
    { value: 3, label: 'Groep 3' },
    { value: 4, label: 'Groep 4' },
    { value: 5, label: 'Groep 5' },
    { value: 6, label: 'Groep 6' },
    { value: 7, label: 'Groep 7' },
    { value: 8, label: 'Groep 8' },
    { value: 9, label: 'Brugklas' },
    { value: 10, label: 'Klas 2' },
    { value: 11, label: 'Klas 3' },
    { value: 12, label: 'Klas 4' },
    { value: 13, label: 'Klas 5' },
    { value: 14, label: 'Klas 6' },
  ];

  const cursusOptions = [
    { value: '', label: 'Selecteer een cursus...' },
    { value: 'mediawijsheid', label: 'Mediawijsheid' },
    { value: 'veilig-internet', label: 'Veilig Internet' },
    { value: 'programmeren', label: 'Programmeren' },
    { value: 'ai-basis', label: 'AI Basis' },
  ];

  function getGroupLabel(year: number) {
    if (year >= 1 && year <= 8) return `Groep ${year}`;
    if (year === 9) return 'Brugklas';
    if (year === 10) return 'Klas 2';
    if (year === 11) return 'Klas 3';
    if (year === 12) return 'Klas 4';
    if (year === 13) return 'Klas 5';
    if (year === 14) return 'Klas 6';
    return `Onbekend (${year})`;
  }

  function getSchoolType(year: number) {
    if (year >= 1 && year <= 8) return 'Basisschool';
    if (year >= 9) return 'Middelbare school';
    return 'Onbekend';
  }

  function getAge(year: number) {
    // Groep 1 = 4-5, Groep 2 = 5-6, ..., Groep 8 = 11-12, Brugklas = 12-13, etc.
    if (year >= 1 && year <= 8) return [year + 3, year + 4];
    if (year === 9) return [12, 13];
    if (year === 10) return [13, 14];
    if (year === 11) return [14, 15];
    if (year === 12) return [15, 16];
    if (year === 13) return [16, 17];
    if (year === 14) return [17, 18];
    return [0, 0];
  }

  function validateDuur(val: number) {
    if (val < 15) {
      duurError = 'Minimale duur is 15 minuten';
      duur = 15;
    } else if (val > 180) {
      duurError = 'Maximale duur is 180 minuten (3 uur)';
      duur = 180;
    } else {
      duurError = '';
      duur = val;
    }
  }

  onMount(async () => {
    const params = get(page).params;
    if (params.id) {
      editing = true;
      lessonId = params.id;
      try {
        const lesson = await databases.getDocument(databaseId, collectionId, lessonId);
        lesnummer = lesson.lesnummer || '';
        onderwerp = lesson.onderwerp || '';
        doelgroep_min = lesson.doelgroep_min ?? 3;
        doelgroep_max = lesson.doelgroep_max ?? 8;
        doelgroep_range = [doelgroep_min, doelgroep_max];
        duur = lesson.duur ?? 45;
        waarom = lesson.waarom || '';
        doel = lesson.doel || '';
        cursus = lesson.cursus || '';
        kerndoelenSelected = lesson.kerndoelen ? (Array.isArray(lesson.kerndoelen) ? lesson.kerndoelen : lesson.kerndoelen.split(',')) : [];
        intro = lesson.intro || '';
        kern = lesson.kern || '';
        reflectie = lesson.reflectie || '';
        materialen = lesson.materialen || '';
        evaluatie = lesson.evaluatie || '';
        feedback = lesson.feedback || '';
        aanvullend = lesson.aanvullend || '';
      } catch (e) {
        error = 'Kon les niet ophalen.';
        console.error(e);
      }
    } else {
      // Prefill doel for new lessons
      doel = 'Aan het einde van deze les kun je ';
      doelgroep_range = [doelgroep_min, doelgroep_max];
      duur = 45;
      cursus = '';
      kerndoelenSelected = [];
    }
  });

  async function saveLesson() {
    adding = true;
    error = '';
    try {
      const doc = {
        lesnummer,
        onderwerp,
        doelgroep_min,
        doelgroep_max,
        duur,
        waarom,
        doel,
        cursus,
        kerndoelen: kerndoelenSelected.join(','),
        intro,
        kern,
        reflectie,
        materialen,
        evaluatie,
        feedback,
        aanvullend
      };
      if (editing) {
        await databases.updateDocument(databaseId, collectionId, lessonId, doc);
      } else {
        await databases.createDocument(databaseId, collectionId, 'unique()', doc);
      }
      goto('/lessen');
    } catch (e) {
      error = editing ? 'Kon les niet bijwerken.' : 'Kon les niet toevoegen.';
      console.error(e);
    } finally {
      adding = false;
    }
  }
</script>

<h1>{editing ? 'Les Bewerken' : 'Nieuwe Les Toevoegen'}</h1>
<a href="/lessen">← Terug naar lessen</a>

<div class="border p-2rem mb-2rem">
  {#if error}
    <p class="text-red-500">{error}</p>
  {/if}
  <form on:submit|preventDefault={saveLesson} class="grid gap-4">
    <div>
      <label for="cursus">Cursus:</label>
      <select id="cursus" bind:value={cursus} required>
        {#each cursusOptions as opt}
          <option value={opt.value} disabled={opt.value === ''} selected={opt.value === ''}>{opt.label}</option>
        {/each}
      </select>
      <small>Kies de cursus waar deze les bij hoort.</small>
    </div>
    <div>
      <label>Lesnummer:</label>
      <input class="border w-full" bind:value={lesnummer} required />
      <small>Bijvoorbeeld: 1, 2, 3...</small>
    </div>
    <div>
      <label>Onderwerp van de les:</label>
      <input class="border w-full" bind:value={onderwerp} required />
      <small>Bijvoorbeeld: Veilig online communiceren</small>
    </div>
    <div>
      <label>Doelgroep/Leerjaar:</label>
      <div class="flex items-center gap-4">
        <div>
          <label class="block text-xs">Min:</label>
          <select bind:value={doelgroep_min}>
            {#each groupOptions as opt}
              <option value={opt.value} disabled={opt.value > doelgroep_max}>{opt.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-xs">Max:</label>
          <select bind:value={doelgroep_max}>
            {#each groupOptions as opt}
              <option value={opt.value} disabled={opt.value < doelgroep_min}>{opt.label}</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="mt-2">
        <b>Schooltype:</b> {getSchoolType(doelgroep_min)}
        {#if doelgroep_min !== doelgroep_max}
          &nbsp;–&nbsp;{getSchoolType(doelgroep_max)}
        {/if}
        <br />
        <b>Groep/Klas:</b> {getGroupLabel(doelgroep_min)}
        {#if doelgroep_min !== doelgroep_max}
          &nbsp;–&nbsp;{getGroupLabel(doelgroep_max)}
        {/if}
        <br />
        <b>Gemiddelde leeftijd:</b> {getAge(doelgroep_min)[0]}–{getAge(doelgroep_max)[1]} jaar
      </div>
      <small>Selecteer het minimum en maximum leerjaar/groep voor deze les. Groep 1-8 = basisschool, Brugklas/Klas 1-6 = middelbare school.</small>
    </div>
    <div>
      <label>Duur van de les:</label>
      <div class="flex items-center gap-4">
        <input type="range" min="15" max="180" step="5" bind:value={duur} on:input={e => validateDuur(Number((e.target as HTMLInputElement)?.value))} />
        <input type="number" min="15" max="180" step="5" bind:value={duur} on:input={e => validateDuur(Number((e.target as HTMLInputElement)?.value))} class="border w-24 text-center" />
        <span>minuten</span>
      </div>
      <div class="mt-2">
        <b>{duur} minuten</b>
        <span> &nbsp; (</span>
        <b>{Math.floor(duur / 60)} uur{duur % 60 !== 0 ? ` ${duur % 60} min` : ''}</b>
        <span>)</span>
      </div>
      {#if duurError}
        <div class="text-red-500">{duurError}</div>
      {/if}
      <small>Kies of vul de duur van de les in (15 minuten tot 3 uur, stappen van 5 minuten).</small>
    </div>
    <div>
      <label>Waarom deze les?</label>
      <textarea class="border w-full" bind:value={waarom} required></textarea>
      <small>Leg kort uit waarom de inhoud van deze les relevant is voor de leerlingen. Dit kan worden aangepast aan hun leefwereld of toekomstige doelen. Bijvoorbeeld: "In deze les leer je hoe je veilig online kunt communiceren, een vaardigheid die essentieel is voor sociale media en schoolprojecten."</small>
    </div>
    <div>
      <label>Doel van de les (voor leerlingen):</label>
      <textarea class="border w-full" bind:value={doel} required></textarea>
      <small>"Aan het einde van deze les kun je..." (bijvoorbeeld: een veilige wachtwoordstrategie toepassen, kritisch bronnenonderzoek doen, etc.)</small>
    </div>
    <div>
      <label>Kerndoelen:</label>
      <div class="flex flex-col gap-2">
        {#each kerndoelenOpties as groep}
          <div>
            <b>{groep.group}</b>
            <div class="ml-4">
              {#each groep.options as optie}
                <label class="flex items-center gap-2 font-normal">
                  <input type="checkbox" value={optie.value} bind:group={kerndoelenSelected} />
                  {optie.label}
                </label>
              {/each}
            </div>
          </div>
        {/each}
        <div class="mt-1 text-sm text-gray-500">
          Geselecteerd:
          {#if kerndoelenSelected.length > 0}
            <ul class="list-disc ml-6">
              {#each kerndoelenSelected as l: string}
                <li>{kerndoelenOpties.flatMap(g => g.options).find(o => o.value === l)?.label || l}</li>
              {/each}
            </ul>
          {:else}
            <span>Geen kerndoelen geselecteerd.</span>
          {/if}
        </div>
      </div>
      <small>Selecteer één of meer kerndoelen die bij deze les horen.</small>
    </div>
    <div>
      <label>Introductie (5-10 min):</label>
      <textarea class="border w-full" bind:value={intro} required></textarea>
      <small>Korte uitleg van de les en de doelen. Stel een vraag of geef een voorbeeld om nieuwsgierigheid te wekken.</small>
    </div>
    <div>
      <label>Kernactiviteit (20-30 min):</label>
      <textarea class="border w-full" bind:value={kern} required></textarea>
      <small>Beschrijving van de hoofdactiviteit(en). Bijvoorbeeld:
Zoekopdracht met een focus op bronbeoordeling.
Hands-on oefening in het maken van een sterk wachtwoord.
Programmeeropdracht met een eenvoudige tool zoals Scratch.</small>
    </div>
    <div>
      <label>Reflectie en Afronding (5-10 min):</label>
      <textarea class="border w-full" bind:value={reflectie} required></textarea>
      <small>Bespreek wat ze hebben geleerd en hoe dit toepasbaar is in het dagelijks leven. Stel vragen om te controleren of het doel is bereikt.</small>
    </div>
    <div>
      <label>Materialen en Middelen:</label>
      <textarea class="border w-full" bind:value={materialen} required></textarea>
      <small>Vermelding van benodigde materialen (computers, apps, werkbladen, video's, etc.). Eventuele links of bronnen.</small>
    </div>
    <div>
      <label>Evaluatie van Leerlingen:</label>
      <textarea class="border w-full" bind:value={evaluatie} required></textarea>
      <small>Hoe toets je of de leerlingen het doel hebben bereikt? (Quiz, opdracht, groepsdiscussie, etc.)</small>
    </div>
    <div>
      <label>Feedback voor de Les:</label>
      <textarea class="border w-full" bind:value={feedback} required></textarea>
      <small>Reflectie voor de leraar: Wat ging goed? Wat kan beter?</small>
    </div>
    <div>
      <label>Aanvullende Opdrachten (optioneel):</label>
      <textarea class="border w-full" bind:value={aanvullend}></textarea>
      <small>Suggesties voor leerlingen die extra uitdaging nodig hebben of voor thuisgebruik.</small>
    </div>
    <button class="cta" type="submit" disabled={adding}>{adding ? (editing ? 'Bijwerken...' : 'Toevoegen...') : (editing ? 'Les Bijwerken' : 'Les Toevoegen')}</button>
  </form>
</div>

<style>
.school-slider .range-slider__handle {
  background: var(--accent);
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px var(--accent), 0 2px 6px rgba(0,0,0,0.08);
  transition: background 0.2s, border 0.2s;
}
.school-slider .range-slider__handle:hover,
.school-slider .range-slider__handle:focus {
  background: var(--warning);
  border-color: var(--warning);
}
.school-slider .range-slider__pip {
  background: #fff3e0;
}
label {
  font-weight: bold;
}
</style> 