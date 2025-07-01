<script lang="ts">
import { onMount } from 'svelte';
import { databases } from '$lib/appwrite';
import TeacherForm from '$lib/components/TeacherForm.svelte';

const databaseId = 'lessen'; // Change if your DB is named differently
const collectionId = 'vakdocent';

let teachers: any[] = [];
let loading = true;
let error = '';
let showModal = false;
let isEdit = false;
let editTeacherId: string | null = null;
let formInitialValues = {};

async function fetchTeachers() {
  loading = true;
  try {
    const res = await databases.listDocuments(databaseId, collectionId);
    teachers = res.documents;
  } catch (e) {
    error = 'Kon vakdocenten niet ophalen.';
    teachers = [];
  } finally {
    loading = false;
  }
}

onMount(fetchTeachers);

function openAddModal() {
  isEdit = false;
  editTeacherId = null;
  formInitialValues = {};
  showModal = true;
}

function openEditModal(teacher: any) {
  isEdit = true;
  editTeacherId = teacher.$id;
  formInitialValues = {
    name: teacher.name,
    email: teacher.email,
    address: teacher.address,
    phone: teacher.phone,
    qualifications: teacher.qualifications,
    bio: teacher.bio,
    photo: teacher.photo
  };
  showModal = true;
}

function closeModal() {
  showModal = false;
  formInitialValues = {};
  editTeacherId = null;
}

async function handleFormSubmit(e: CustomEvent) {
  const data = e.detail;
  try {
    if (isEdit && editTeacherId) {
      await databases.updateDocument(databaseId, collectionId, editTeacherId, data);
    } else {
      await databases.createDocument(databaseId, collectionId, 'unique()', data);
    }
    await fetchTeachers();
    closeModal();
  } catch (err) {
    alert('Fout bij opslaan van vakdocent.');
    console.error(err);
  }
}

async function deleteTeacher(id: string) {
  if (!confirm('Weet je zeker dat je deze vakdocent wilt verwijderen?')) return;
  try {
    await databases.deleteDocument(databaseId, collectionId, id);
    await fetchTeachers();
  } catch (err) {
    alert('Fout bij verwijderen van vakdocent.');
  }
}
</script>

<h1>Team: Vakdocenten</h1>
<button class="cta mb-4" on:click={openAddModal}>+ Vakdocent toevoegen</button>

{#if loading}
  <p>Bezig met laden...</p>
{:else if error}
  <p class="text-red-500">{error}</p>
{:else if teachers.length === 0}
  <p>Geen vakdocenten gevonden.</p>
{:else}
  <table class="vakdocenten-table">
    <thead>
      <tr>
        <th>Foto</th>
        <th>Naam</th>
        <th>E-mail</th>
        <th>Telefoon</th>
        <th>Kwalificaties</th>
        <th>Adres</th>
        <th>Bio</th>
        <th>Acties</th>
      </tr>
    </thead>
    <tbody>
      {#each teachers as teacher}
        <tr>
          <td>{#if teacher.photo}<img src={teacher.photo} alt={teacher.name} style="max-width: 60px; border-radius: 0.5rem;" />{/if}</td>
          <td>{teacher.name}</td>
          <td>{teacher.email}</td>
          <td>{teacher.phone}</td>
          <td>{teacher.qualifications}</td>
          <td>{teacher.address}</td>
          <td>{teacher.bio}</td>
          <td>
            <button class="cta" on:click={() => openEditModal(teacher)}>Bewerk</button>
            <button class="cta bg-red-600 ml-2" on:click={() => deleteTeacher(teacher.$id)}>Verwijder</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

{#if showModal}
  <div class="modal-backdrop" on:click={closeModal}></div>
  <div class="modal" on:click|stopPropagation>
    <TeacherForm
      isEdit={isEdit}
      initialValues={formInitialValues}
      on:submit={handleFormSubmit}
      on:cancel={closeModal}
    />
  </div>
{/if}

<style>
.vakdocenten-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
}
.vakdocenten-table th, .vakdocenten-table td {
  border: 1px solid #e0e0e0;
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
}
.vakdocenten-table th {
  background: var(--ash-grey);
}
.vakdocenten-table img {
  display: block;
}
.cta {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  padding: 0.4rem 1rem;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.cta.bg-red-600 {
  background: #e3342f;
}
.cta:hover {
  background: var(--warning);
  color: var(--color-blackened-steel);
}
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 10;
}
.modal {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: var(--background);
  color: var(--foreground);
  padding: 2.5rem 2rem;
  border-radius: 1rem;
  z-index: 11;
  min-width: 320px;
  max-width: 95vw;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.18);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
@media (max-width: 600px) {
  .modal {
    padding: 1.25rem 0.5rem;
    min-width: 0;
    width: 98vw;
  }
}
</style>
