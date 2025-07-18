<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Databases } from 'appwrite';
	import { appwrite } from '$lib/appwrite';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { Map, MapPin, Clipboard, Pencil, Plus, Users, Edit, Trash2 } from '@lucide/svelte';
	import { user } from '$lib/stores/auth.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { _ } from 'svelte-i18n';

	const DB_ID = 'scholen';
	const COLLECTION_ID = 'school';
	let school: any = null;
	let loading = true;
	let notFound = false;
	let copied = false;
	
	// Classroom management
	let classrooms: any[] = [];
	let loadingClassrooms = false;
	let showClassroomModal = false;
	let editingClassroom: any = null;
	let classroomName = '';
	let classroomYear = new Date().getFullYear();
	let classroomDescription = '';
	let savingClassroom = false;
	let classroomError = '';
	
	// User permissions
	$: userRole = $user?.labels?.[0] || 'student';
	$: canManageClassrooms = userRole === 'admin' || userRole === 'teacher' || userRole === 'vakdocent';

	onMount(async () => {
		const id = get(page).params.id;
		const databases = new Databases(appwrite);
		try {
			const res = await databases.getDocument(DB_ID, COLLECTION_ID, id);
			school = res;
			// Load classrooms for this school
			await loadClassrooms();
		} catch (e) {
			notFound = true;
		}
		loading = false;
	});

	async function loadClassrooms() {
		if (!school?.$id) return;
		
		loadingClassrooms = true;
		try {
			const response = await fetch(`/api/schools/${school.$id}/classes`);
			const data = await response.json();
			
			if (data.success) {
				classrooms = data.classes || [];
				if (data.message) {
					console.log('[SCHOOL PAGE]', data.message);
				}
				if (data.isLegacy) {
					console.log('[SCHOOL PAGE] Using legacy klassen collection');
				}
			} else {
				console.error('Failed to load classrooms:', data.error);
			}
		} catch (error) {
			console.error('Error loading classrooms:', error);
		} finally {
			loadingClassrooms = false;
		}
	}

	function copyAddress() {
		const address = `${school.STRAATNAAM} ${school.HUISNUMMER}, ${school.POSTCODE} ${school.PLAATSNAAM}, ${school.GEMEENTENAAM}`;
		navigator.clipboard.writeText(address).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 1200);
		});
	}

	function editSchool() {
		goto(`/scholen/${school.$id}/bewerken`);
	}

	// Classroom management functions
	function openClassroomModal(classroom: any = null) {
		editingClassroom = classroom;
		classroomName = classroom?.klasnaam || '';
		classroomYear = classroom?.jaar || new Date().getFullYear();
		classroomDescription = classroom?.description || '';
		classroomError = '';
		showClassroomModal = true;
	}

	function closeClassroomModal() {
		showClassroomModal = false;
		editingClassroom = null;
		classroomName = '';
		classroomYear = new Date().getFullYear();
		classroomDescription = '';
		classroomError = '';
	}

	async function saveClassroom() {
		if (!classroomName.trim()) {
			classroomError = $_('forms.required');
			return;
		}

		savingClassroom = true;
		classroomError = '';

		try {
			const classroomData = {
				klasnaam: classroomName.trim(),
				jaar: classroomYear,
				description: classroomDescription.trim()
			};

			let response;
			if (editingClassroom) {
				// Update existing classroom
				response = await fetch(`/api/classes/${editingClassroom.$id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(classroomData)
				});
			} else {
				// Create new classroom
				response = await fetch(`/api/schools/${school.$id}/classes`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(classroomData)
				});
			}

			const data = await response.json();

			if (data.success) {
				await loadClassrooms(); // Reload classrooms
				closeClassroomModal();
			} else {
				classroomError = data.error || $_('messages.error');
			}
		} catch (error) {
			console.error('Error saving classroom:', error);
			classroomError = $_('messages.error');
		} finally {
			savingClassroom = false;
		}
	}

	async function deleteClassroom(classroom: any) {
		if (!confirm($_('messages.confirm_delete'))) {
			return;
		}

		try {
			const response = await fetch(`/api/classes/${classroom.$id}`, {
				method: 'DELETE'
			});

			const data = await response.json();

			if (data.success) {
				await loadClassrooms(); // Reload classrooms
			} else {
				alert($_('classroom.delete_error') + ': ' + (data.error || $_('messages.unknown_error')));
			}
		} catch (error) {
			console.error('Error deleting classroom:', error);
			alert($_('classroom.delete_generic_error'));
		}
	}
</script>

{#if loading}
	<div class="school-view-card"><p>{$_('messages.loading')}</p></div>
{:else if notFound}
	<div class="school-view-card"><p>{$_('messages.not_found')}</p></div>
{:else}
	<div class="school-view-card">
		<button class="edit-btn" on:click={editSchool} aria-label={$_('forms.edit')} title={$_('forms.edit')}>
			<Pencil size={20} />
		</button>
		<h1>{school.NAAM}</h1>
		<div class="school-subtitle">{school.DENOMINATIE}</div>
		<div class="school-info-grid">
			<div>
				<span>{$_('school.address')}:</span>
				{school.STRAATNAAM}
				{school.HUISNUMMER}, {school.POSTCODE}
				{school.PLAATSNAAM}, {school.GEMEENTENAAM}
				<a
					href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${school.STRAATNAAM} ${school.HUISNUMMER}, ${school.POSTCODE} ${school.PLAATSNAAM}, ${school.GEMEENTENAAM}`)}`}
					target="_blank"
					rel="noopener noreferrer"
					title={$_('school.view_on_openstreetmap')}
					class="address-icon"
				>
					<Map color="var(--accent)" size={20} />
				</a>
				<a
					href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${school.STRAATNAAM} ${school.HUISNUMMER}, ${school.POSTCODE} ${school.PLAATSNAAM}, ${school.GEMEENTENAAM}`)}`}
					target="_blank"
					rel="noopener noreferrer"
					title={$_('school.view_on_google_maps')}
					class="address-icon"
				>
					<MapPin color="var(--warning)" size={20} />
				</a>
				<button
					class="address-icon clipboard-btn"
					title={copied ? $_('school.copied') : $_('school.copy_address')}
					aria-label={$_('school.copy_address')}
					on:click={copyAddress}
				>
					<Clipboard color="var(--foreground)" size={20} />
				</button>
			</div>
			<div><span>{$_('school.phone_number')}:</span> {school.TELEFOONNUMMER}</div>
			<div>
				<span>{$_('school.internet_address')}:</span>
				<a
					href={school.INTERNETADRES?.startsWith('http')
						? school.INTERNETADRES
						: `https://${school.INTERNETADRES}`}
					target="_blank">{school.INTERNETADRES}</a
				>
			</div>
			<div><span>{$_('school.client')}:</span> {school.KLANT ? $_('school.yes') : $_('school.no')}</div>
			<div><span>{$_('school.education_structure')}:</span> {school.ONDERWIJSSTRUCTUUR}</div>
			<details class="school-details-tab" open>
				<summary>
					{$_('classroom.groups_classes')}
					{#if canManageClassrooms}
						<Button 
							variant="outline" 
							size="sm" 
							class="ml-2"
							on:click={(e) => { e.stopPropagation(); openClassroomModal(); }}
						>
							<Plus size={14} />
							{$_('classroom.new_class')}
						</Button>
					{/if}
				</summary>
				
				{#if loadingClassrooms}
					<div class="classroom-loading">{$_('classroom.classes_loading')}</div>
				{:else if classrooms.length === 0}
					<div class="no-classrooms">
						<p>{$_('classroom.no_classes')}</p>
						{#if canManageClassrooms}
							<Button variant="outline" on:click={() => openClassroomModal()}>
								<Plus size={16} />
								{$_('classroom.first_class')}
							</Button>
						{/if}
					</div>
				{:else}
					<div class="classrooms-grid">
						{#each classrooms as classroom}
							<div class="classroom-card">
								<div class="classroom-header">
									<div class="classroom-name">
										<Users size={16} />
										{classroom.klasnaam}
									</div>
									<div class="classroom-year">({classroom.jaar})</div>
									{#if canManageClassrooms}
										<div class="classroom-actions">
											<button 
												class="action-btn edit-btn"
												on:click={() => openClassroomModal(classroom)}
												title={$_('classroom.edit_class')}
											>
												<Edit size={14} />
											</button>
											<button 
												class="action-btn delete-btn"
												on:click={() => deleteClassroom(classroom)}
												title={$_('classroom.delete_class')}
											>
												<Trash2 size={14} />
											</button>
										</div>
									{/if}
								</div>
								
								<div class="classroom-info">
									<div class="student-count">
										{classroom.studentCount || classroom.leerlingen?.length || 0} {$_('classroom.students')}
									</div>
									{#if classroom.description}
										<div class="classroom-description">
											{classroom.description}
										</div>
									{/if}
								</div>
								
								{#if (classroom.teacherCount || classroom.docenten?.length || 0) > 0}
									<div class="classroom-teachers">
										<strong>{$_('classroom.teachers')}:</strong> {classroom.teacherCount || classroom.docenten?.length || 0}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</details>
			<details class="school-details-tab">
				<summary>{$_('school.other_info')}</summary>
				<div><span>{$_('school.province')}:</span> {school.PROVINCIE}</div>
				<div><span>BRIN:</span> {school.BRIN}</div>
				<div><span>Instellingscode:</span> {school.INSTELLINGSCODE}</div>
				<div><span>Vestigingscode:</span> {school.VESTIGINGSCODE}</div>
				<div><span>Vakantieregio:</span> {school.VAKANTIEREGIO}</div>
			</details>
		</div>
	</div>
{/if}

<!-- Classroom Modal -->
<Dialog.Root bind:open={showClassroomModal}>
	<Dialog.Content class="sm:max-w-[425px] bg-[var(--background)] text-foreground border border-border">
		<Dialog.Header>
			<Dialog.Title>
				{editingClassroom ? $_('classroom.edit_class') : $_('classroom.create_new_class')}
			</Dialog.Title>
			<Dialog.Description>
				{editingClassroom ? $_('classroom.edit_class_data') : $_('classroom.create_class_description')}
			</Dialog.Description>
		</Dialog.Header>
		
		<form on:submit|preventDefault={saveClassroom}>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<label for="classroomName" class="text-right">{$_('classroom.class_name')}</label>
					<input
						id="classroomName"
						type="text"
						bind:value={classroomName}
						placeholder="bijv. 6A, 1HAVO, etc."
						class="col-span-3 px-3 py-2 border rounded-md"
						required
					/>
				</div>
				
				<div class="grid grid-cols-4 items-center gap-4">
					<label for="classroomYear" class="text-right">{$_('classroom.school_year')}</label>
					<input
						id="classroomYear"
						type="number"
						bind:value={classroomYear}
						min="2020"
						max="2030"
						class="col-span-3 px-3 py-2 border rounded-md"
						required
					/>
				</div>
				
				<div class="grid grid-cols-4 items-center gap-4">
					<label for="classroomDescription" class="text-right">{$_('forms.description')}</label>
					<textarea
						id="classroomDescription"
						bind:value={classroomDescription}
						placeholder={$_('forms.description') + '...'}
						class="col-span-3 px-3 py-2 border rounded-md"
						rows="3"
					></textarea>
				</div>
			</div>
			
			{#if classroomError}
				<div class="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-800">
					{classroomError}
				</div>
			{/if}
			
			<Dialog.Footer>
				<Button 
					type="button" 
					variant="outline" 
					on:click={closeClassroomModal}
					disabled={savingClassroom}
				>
					{$_('forms.cancel')}
				</Button>
				<Button 
					type="submit" 
					disabled={savingClassroom}
				>
					{savingClassroom ? $_('messages.saving') : (editingClassroom ? $_('forms.update') : $_('forms.create'))}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<style>
	.school-view-card {
		max-width: 700px;
		margin: 2rem auto;
		background: var(--background);
		color: var(--foreground);
		border-radius: 12px;
		box-shadow: 0 2px 16px var(--divider, rgba(0, 0, 0, 0.08));
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

	/* Classroom management styles */
	.classroom-loading {
		text-align: center;
		padding: 1rem;
		color: var(--muted-foreground);
	}

	.no-classrooms {
		text-align: center;
		padding: 2rem;
		color: var(--muted-foreground);
	}

	.no-classrooms p {
		margin-bottom: 1rem;
	}

	.classrooms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.classroom-card {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1rem;
		transition: box-shadow 0.2s;
	}

	.classroom-card:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.classroom-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.classroom-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		color: var(--foreground);
		font-size: 1.1rem;
	}

	.classroom-year {
		color: var(--muted-foreground);
		font-size: 0.9rem;
	}

	.classroom-actions {
		display: flex;
		gap: 0.25rem;
	}

	.action-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s;
	}

	.action-btn:hover {
		background: var(--muted);
	}

	.action-btn.edit-btn {
		color: var(--primary);
	}

	.action-btn.delete-btn {
		color: var(--destructive);
	}

	.classroom-info {
		margin-bottom: 0.5rem;
	}

	.student-count {
		color: var(--muted-foreground);
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.classroom-description {
		color: var(--foreground);
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.classroom-teachers {
		color: var(--muted-foreground);
		font-size: 0.9rem;
		border-top: 1px solid var(--border);
		padding-top: 0.5rem;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.classrooms-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
