<script lang="ts">
  import { Client, Databases, ID, Query } from 'appwrite';
  import Papa from 'papaparse';
  import type { ParseResult } from 'papaparse';

  // Appwrite config
  const client = new Client();
  client.setEndpoint('YOUR_APPWRITE_ENDPOINT').setProject('YOUR_PROJECT_ID');
  const databases = new Databases(client);
  const databaseId = 'YOUR_DATABASE_ID';
  const collectionId = 'school';

  let file: File | null = null;
  let progress = 0;
  let total = 0;
  let uploading = false;

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      file = input.files[0];
    } else {
      file = null;
    }
  }

  async function brinExists(brin: number): Promise<boolean> {
    try {
      const res = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal('brin', brin)]
      );
      return res.total > 0;
    } catch (e) {
      console.error('Error checking brin:', e);
      return false;
    }
  }

  async function importCSV() {
    if (!file) return alert('Select a file first!');
    uploading = true;
    Papa.parse(file, {
      header: true,
      delimiter: ';',
      complete: async function(results: ParseResult<any>) {
        total = results.data.length;
        progress = 0;
        for (const row of results.data) {
          const brin = parseInt(row['BEVOEGD GEZAG NUMMER'] || '0', 10);
          if (!brin || await brinExists(brin)) {
            progress++;
            continue; // Skip if brin is missing or already exists
          }
          const data = {
            provincie: row['PROVINCIE'] || '',
            brin,
            vestigingscode: row['VESTIGINGSCODE'] || '',
            naam: row['VESTIGINGSNAAM'] || '',
            straat: row['STRAATNAAM'] || '',
            huisnummer: row['HUISNUMMER-TOEVOEGING'] || '',
            postcode: row['POSTCODE'] || '',
            plaats: row['PLAATSNAAM'] || '',
            gemeente: row['GEMEENTENAAM'] || '',
            Denominatie: row['DENOMINATIE'] || '',
            telefoon: row['TELEFOONNUMMER'] || '',
            website: row['INTERNETADRES'] || '',
            vakantieregio: row['VAKANTIEREGIO'] || '',
            instellingscode: row['INSTELLINGSCODE'] || '',
          };
          try {
            await databases.createDocument(
              databaseId,
              collectionId,
              ID.unique(),
              data
            );
          } catch (e) {
            console.error('Error inserting row:', e, data);
          }
          progress++;
          // Rate limit: 1 per second = 1000ms delay
          await new Promise(r => setTimeout(r, 1000));
        }
        uploading = false;
        alert('Import complete!');
      }
    });
  }
</script>

<input type="file" accept=".csv" on:change={handleFileChange} />
<button on:click={importCSV} disabled={uploading}>Import CSV to Appwrite</button>

{#if uploading}
  <progress value={progress} max={total}></progress>
  <p>{progress} / {total} rows processed</p>
{/if} 