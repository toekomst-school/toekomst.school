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
	let showCreateModal = false;
	let showEditModal = false;
	let editingClassroom: any = null;
	let classroomName = '';
	let classroomYear = new Date().getFullYear();
	let classroomDescription = '';
	let teacherName = '';
	let teacherEmail = '';
	let studentsText = '';
	let savingClassroom = false;
	let classroomError = '';
	let teamMembers: any[] = [];
	
	// Adding users to existing class
	let addTeacherName = '';
	let addTeacherEmail = '';
	let addStudentsText = '';
	let addingUsers = false;
	let addUsersError = '';
	
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
	function openCreateModal() {
		// Reset all fields for new classroom
		classroomName = '';
		classroomYear = new Date().getFullYear();
		classroomDescription = '';
		teacherName = '';
		teacherEmail = '';
		studentsText = '';
		classroomError = '';
		teamMembers = [];
		editingClassroom = null;
		showCreateModal = true;
	}

	async function openEditModal(classroom: any) {
		// Populate fields with classroom data
		editingClassroom = classroom;
		classroomName = classroom.klasnaam || '';
		classroomYear = classroom.jaar || new Date().getFullYear();
		classroomDescription = classroom.description || '';
		teacherName = '';
		teacherEmail = '';
		studentsText = '';
		classroomError = '';
		
		// Reset add user fields
		addTeacherName = '';
		addTeacherEmail = '';
		addStudentsText = '';
		addUsersError = '';
		
		if (classroom.teamId) {
			await loadTeamMembers(classroom.teamId);
		}
		
		showEditModal = true;
	}

	async function loadTeamMembers(teamId: string) {
		try {
			const response = await fetch(`/api/teams/${teamId}/members`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					teamMembers = data.members || [];
				}
			}
		} catch (error) {
			console.error('Error loading team members:', error);
		}
	}

	function closeCreateModal() {
		showCreateModal = false;
	}

	function closeEditModal() {
		showEditModal = false;
		editingClassroom = null;
	}

	async function saveClassroom() {
		if (!classroomName.trim()) {
			classroomError = $_('forms.required');
			return;
		}

		savingClassroom = true;
		classroomError = '';

		try {
			// Parse students from text
			const students = studentsText.trim() 
				? studentsText.split('\n')
					.map(line => line.trim())
					.filter(line => line.includes(','))
					.map(line => {
						const [name, email] = line.split(',').map(part => part.trim());
						return { name, email };
					})
				: [];

			const classroomData = {
				klasnaam: classroomName.trim(),
				jaar: classroomYear,
				description: classroomDescription.trim(),
				teacher: teacherName.trim() && teacherEmail.trim() ? {
					name: teacherName.trim(),
					email: teacherEmail.trim()
				} : null,
				students: students
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
				if (editingClassroom) {
					closeEditModal();
				} else {
					closeCreateModal();
				}
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

	async function addUsersToClass() {
		if (!editingClassroom?.teamId) {
			addUsersError = 'Geen team ID gevonden';
			return;
		}

		addingUsers = true;
		addUsersError = '';

		try {
			// Parse students from text
			const students = addStudentsText.trim() 
				? addStudentsText.split('\n')
					.map(line => line.trim())
					.filter(line => line.includes(','))
					.map(line => {
						const [name, email] = line.split(',').map(part => part.trim());
						return { name, email };
					})
				: [];

			// Add teacher if provided
			if (addTeacherName.trim() && addTeacherEmail.trim()) {
				const teacherData = {
					name: addTeacherName.trim(),
					email: addTeacherEmail.trim(),
					role: 'teacher'
				};

				const response = await fetch(`/api/teams/${editingClassroom.teamId}/members`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(teacherData)
				});

				const data = await response.json();
				if (!data.success) {
					console.warn('Failed to add teacher:', data.error);
				}
			}

			// Add students
			for (const student of students) {
				if (student.name && student.email) {
					const studentData = {
						name: student.name,
						email: student.email,
						role: 'student'
					};

					const response = await fetch(`/api/teams/${editingClassroom.teamId}/members`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(studentData)
					});

					const data = await response.json();
					if (!data.success) {
						console.warn('Failed to add student:', student.name, data.error);
					}
				}
			}

			// Reload team members to show new users
			await loadTeamMembers(editingClassroom.teamId);
			
			// Clear form fields
			addTeacherName = '';
			addTeacherEmail = '';
			addStudentsText = '';

		} catch (error) {
			console.error('Error adding users to class:', error);
			addUsersError = 'Fout bij toevoegen van gebruikers';
		} finally {
			addingUsers = false;
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
				<summary style="display: flex; justify-content: space-between; align-items: center;">
					<span>{$_('classroom.groups_classes')}</span>
					{#if canManageClassrooms}
						<button 
							class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
							on:click={openCreateModal}
						>
							<Plus size={16} />
						</button>
					{/if}
				</summary>
				
				{#if loadingClassrooms}
					<div class="classroom-loading">{$_('classroom.classes_loading')}</div>
				{:else if classrooms.length === 0}
					<div class="no-classrooms">
						<p>{$_('classroom.no_classes')}</p>
					</div>
				{:else}
					<div class="classrooms-grid">
						{#each classrooms as classroom}
							<div class="classroom-card cursor-pointer" on:click={() => openEditModal(classroom)}>
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
												on:click|stopPropagation={() => openEditModal(classroom)}
												title={$_('classroom.edit_class')}
											>
												<Edit size={14} />
											</button>
											<button 
												class="action-btn delete-btn"
												on:click|stopPropagation={() => deleteClassroom(classroom)}
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

<!-- Create Classroom Dialog -->
<Dialog.Root bind:open={showCreateModal}>
	<Dialog.Content class="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Nieuwe Klas Maken</Dialog.Title>
			<Dialog.Description>Vul de onderstaande gegevens in om een nieuwe klas aan te maken.</Dialog.Description>
		</Dialog.Header>
		
		<form on:submit|preventDefault={saveClassroom} class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<label for="classroomName" class="text-sm font-medium">Klasnaam</label>
					<input
						id="classroomName"
						type="text"
						bind:value={classroomName}
						placeholder="bijv. 6A, 1HAVO, etc."
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						required
					/>
				</div>
				
				<div class="space-y-2">
					<label for="classroomYear" class="text-sm font-medium">Schooljaar</label>
					<input
						id="classroomYear"
						type="number"
						bind:value={classroomYear}
						min="2020"
						max="2030"
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						required
					/>
				</div>
			</div>
			
			<div class="space-y-2">
				<label for="classroomDescription" class="text-sm font-medium">Beschrijving</label>
				<textarea
					id="classroomDescription"
					bind:value={classroomDescription}
					placeholder="Beschrijving van de klas..."
					class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					rows="3"
				></textarea>
			</div>

			<!-- Teacher Section -->
			<div class="border-t pt-4">
				<h3 class="text-sm font-medium mb-3">Docent toevoegen</h3>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<label for="teacherName" class="text-sm font-medium">Naam</label>
						<input
							id="teacherName"
							type="text"
							bind:value={teacherName}
							placeholder="Naam van de docent"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</div>
					<div class="space-y-2">
						<label for="teacherEmail" class="text-sm font-medium">Email</label>
						<input
							id="teacherEmail"
							type="email"
							bind:value={teacherEmail}
							placeholder="docent@school.nl"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</div>
				</div>
			</div>

			<!-- Students Section -->
			<div class="border-t pt-4">
				<h3 class="text-sm font-medium mb-3">Leerlingen toevoegen</h3>
				<div class="space-y-2">
					<label for="studentsText" class="text-sm font-medium">Leerlingen</label>
					<textarea
						id="studentsText"
						bind:value={studentsText}
						placeholder="Jan de Vries,jan.devries@student.nl&#10;Marie Jansen,marie.jansen@student.nl&#10;..."
						class="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						rows="6"
					></textarea>
					<p class="text-xs text-muted-foreground">
						Voer elke leerling in op een nieuwe regel in het formaat: "naam,email"
					</p>
				</div>
			</div>
			
			{#if classroomError}
				<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
					{classroomError}
				</div>
			{/if}
			
			<Dialog.Footer>
				<Button type="submit" disabled={savingClassroom}>
					{savingClassroom ? $_('messages.saving') : $_('forms.create')}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Classroom Dialog -->
<Dialog.Root bind:open={showEditModal}>
	<Dialog.Content class="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Klas Bewerken</Dialog.Title>
			<Dialog.Description>Bewerk de gegevens van de klas.</Dialog.Description>
		</Dialog.Header>
		
		<div class="lg:grid lg:grid-cols-2 lg:gap-6">
			<!-- Form Column -->
			<div class="lg:col-span-1">
				<form on:submit|preventDefault={saveClassroom} class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<label for="editClassroomName" class="text-sm font-medium">Klasnaam</label>
							<input
								id="editClassroomName"
								type="text"
								bind:value={classroomName}
								placeholder="bijv. 6A, 1HAVO, etc."
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								required
							/>
						</div>
						
						<div class="space-y-2">
							<label for="editClassroomYear" class="text-sm font-medium">Schooljaar</label>
							<input
								id="editClassroomYear"
								type="number"
								bind:value={classroomYear}
								min="2020"
								max="2030"
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								required
							/>
						</div>
					</div>
					
					<div class="space-y-2">
						<label for="editClassroomDescription" class="text-sm font-medium">Beschrijving</label>
						<textarea
							id="editClassroomDescription"
							bind:value={classroomDescription}
							placeholder="Beschrijving van de klas..."
							class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							rows="3"
						></textarea>
					</div>
					
					{#if classroomError}
						<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
							{classroomError}
						</div>
					{/if}
					
					<Dialog.Footer>
						<Button type="submit" disabled={savingClassroom}>
							{savingClassroom ? $_('messages.saving') : $_('forms.update')}
						</Button>
					</Dialog.Footer>
				</form>
			</div>

			<!-- Members Column (Desktop Only) -->
			<div class="hidden lg:block lg:col-span-1 border-l pl-6">
				<h3 class="text-lg font-medium mb-4">Klas Leden</h3>
				
				<!-- Current Members -->
				{#if teamMembers.length > 0}
					<div class="space-y-4 mb-6">
						<!-- Teachers -->
						{#if teamMembers.length > 0}
							{@const teachers = teamMembers.filter(member => member.roles.includes('owner') || member.roles.includes('admin') || member.roles.includes('teacher'))}
							{#if teachers.length > 0}
								<div>
									<h4 class="text-sm font-medium text-muted-foreground mb-2">Docenten</h4>
									<div class="space-y-2">
										{#each teachers as teacher}
											<div class="flex items-center gap-2 p-2 bg-muted rounded-md">
												<Users size={14} />
												<div class="flex-1">
													<div class="text-sm font-medium">{teacher.userName}</div>
													<div class="text-xs text-muted-foreground">{teacher.userEmail}</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}

						<!-- Students -->
						{#if teamMembers.length > 0}
							{@const students = teamMembers.filter(member => member.roles.includes('member') || member.roles.includes('student'))}
							{#if students.length > 0}
								<div>
									<h4 class="text-sm font-medium text-muted-foreground mb-2">Leerlingen ({students.length})</h4>
									<div class="space-y-1 max-h-60 overflow-y-auto">
										{#each students as student}
											<div class="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
												<div class="w-2 h-2 bg-primary rounded-full"></div>
												<div class="flex-1">
													<div class="text-sm">{student.userName}</div>
													<div class="text-xs text-muted-foreground">{student.userEmail}</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}
					</div>
				{:else}
					<div class="text-center text-muted-foreground text-sm mb-6">
						Geen klasleden gevonden
					</div>
				{/if}

				<!-- Add Users Form -->
				<div class="border rounded-lg p-4 bg-muted/30">
					<h4 class="text-sm font-medium mb-3">Gebruikers Toevoegen</h4>
					
					<!-- Add Teacher -->
					<div class="mb-4">
						<h5 class="text-xs font-medium text-muted-foreground mb-2">Docent Toevoegen</h5>
						<div class="space-y-2">
							<input
								type="text"
								bind:value={addTeacherName}
								placeholder="Naam van de docent"
								class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
							/>
							<input
								type="email"
								bind:value={addTeacherEmail}
								placeholder="docent@school.nl"
								class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
							/>
						</div>
					</div>
					
					<!-- Add Students -->
					<div class="mb-4">
						<h5 class="text-xs font-medium text-muted-foreground mb-2">Leerlingen Toevoegen</h5>
						<textarea
							bind:value={addStudentsText}
							placeholder="naam,email&#10;naam2,email2"
							class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
							rows="3"
						></textarea>
						<p class="text-xs text-muted-foreground mt-1">
							Formaat: "naam,email" per regel
						</p>
					</div>
					
					{#if addUsersError}
						<div class="rounded-md bg-destructive/15 p-2 text-xs text-destructive mb-3">
							{addUsersError}
						</div>
					{/if}
					
					<Button 
						size="sm" 
						on:click={addUsersToClass} 
						disabled={addingUsers || (!addTeacherName && !addStudentsText)}
						class="w-full"
					>
						{addingUsers ? 'Toevoegen...' : 'Gebruikers Toevoegen'}
					</Button>
				</div>
			</div>

			<!-- Members Section (Mobile Only) -->
			<div class="lg:hidden mt-6 border-t pt-6">
				<h3 class="text-lg font-medium mb-4">Klas Leden</h3>
				
				<!-- Current Members -->
				{#if teamMembers.length > 0}
					<div class="space-y-4 mb-6">
						<!-- Teachers -->
						{#if teamMembers.length > 0}
							{@const teachers = teamMembers.filter(member => member.roles.includes('owner') || member.roles.includes('admin') || member.roles.includes('teacher'))}
							{#if teachers.length > 0}
								<div>
									<h4 class="text-sm font-medium text-muted-foreground mb-2">Docenten</h4>
									<div class="space-y-2">
										{#each teachers as teacher}
											<div class="flex items-center gap-2 p-2 bg-muted rounded-md">
												<Users size={14} />
												<div class="flex-1">
													<div class="text-sm font-medium">{teacher.userName}</div>
													<div class="text-xs text-muted-foreground">{teacher.userEmail}</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}

						<!-- Students -->
						{#if teamMembers.length > 0}
							{@const students = teamMembers.filter(member => member.roles.includes('member') || member.roles.includes('student'))}
							{#if students.length > 0}
								<div>
									<h4 class="text-sm font-medium text-muted-foreground mb-2">Leerlingen ({students.length})</h4>
									<div class="space-y-1 max-h-60 overflow-y-auto">
										{#each students as student}
											<div class="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
												<div class="w-2 h-2 bg-primary rounded-full"></div>
												<div class="flex-1">
													<div class="text-sm">{student.userName}</div>
													<div class="text-xs text-muted-foreground">{student.userEmail}</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/if}
					</div>
				{:else}
					<div class="text-center text-muted-foreground text-sm mb-6">
						Geen klasleden gevonden
					</div>
				{/if}

				<!-- Add Users Form -->
				<div class="border rounded-lg p-4 bg-muted/30">
					<h4 class="text-sm font-medium mb-3">Gebruikers Toevoegen</h4>
					
					<!-- Add Teacher -->
					<div class="mb-4">
						<h5 class="text-xs font-medium text-muted-foreground mb-2">Docent Toevoegen</h5>
						<div class="space-y-2">
							<input
								type="text"
								bind:value={addTeacherName}
								placeholder="Naam van de docent"
								class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
							/>
							<input
								type="email"
								bind:value={addTeacherEmail}
								placeholder="docent@school.nl"
								class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
							/>
						</div>
					</div>
					
					<!-- Add Students -->
					<div class="mb-4">
						<h5 class="text-xs font-medium text-muted-foreground mb-2">Leerlingen Toevoegen</h5>
						<textarea
							bind:value={addStudentsText}
							placeholder="naam,email&#10;naam2,email2"
							class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
							rows="3"
						></textarea>
						<p class="text-xs text-muted-foreground mt-1">
							Formaat: "naam,email" per regel
						</p>
					</div>
					
					{#if addUsersError}
						<div class="rounded-md bg-destructive/15 p-2 text-xs text-destructive mb-3">
							{addUsersError}
						</div>
					{/if}
					
					<Button 
						size="sm" 
						on:click={addUsersToClass} 
						disabled={addingUsers || (!addTeacherName && !addStudentsText)}
						class="w-full"
					>
						{addingUsers ? 'Toevoegen...' : 'Gebruikers Toevoegen'}
					</Button>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
