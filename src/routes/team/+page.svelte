<script lang="ts">
	import { onMount } from 'svelte';
	import { teamStore } from '$lib/stores/team';
	import { user } from '$lib/stores/auth.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Plus, Edit, Trash2, Users, UserPlus, UserX } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// User role permissions
	$: userRole = $user?.labels?.[0] || 'student';
	$: isAdmin = userRole === 'admin';
	$: isVakdocent = userRole === 'vakdocent';
	$: canManageTeams = isAdmin;
	$: canManageUsers = isAdmin || isVakdocent;
	

	// Team management state
	let showTeamModal = false;
	let editingTeam: any = null;
	let editingUser: any = null;
	let teamName = '';
	let teamDescription = '';
	let userName = '';
	let userEmail = '';
	let userPhone = '';
	let userRole = 'vakdocent'; // Always vakdocent for main role
	let teamRoles = []; // Team-specific roles

	// Load teams and members on mount
	onMount(async () => {
		await loadTeams();
		if ($teamStore.selectedTeam) {
			await loadTeamMembers($teamStore.selectedTeam.$id);
		}
	});

	// Load all teams
	async function loadTeams() {
		teamStore.setLoading(true);
		teamStore.setError(null);
		
		if (!$user?.$id) {
			teamStore.setError('User not authenticated');
			teamStore.setLoading(false);
			return;
		}
		
		try {
			const response = await fetch(`/api/teams?userId=${$user.$id}`, {
				headers: {
					'Content-Type': 'application/json',
				}
			});
			
			if (!response.ok) {
				if (response.status === 401) {
					teamStore.setError('Authentication required. Please log in again.');
				} else if (response.status === 403) {
					teamStore.setError('Access denied. You do not have permission to view teams.');
				} else {
					console.warn('Teams API not available, teams functionality disabled');
					teamStore.setError('Teams API not available. Please check server configuration.');
				}
				return;
			}
			
			const data = await response.json();
			
			if (data.success) {
				teamStore.setTeams(data.teams || []);
				
				// If no team selected and user has access to teams, select first one
				if (!$teamStore.selectedTeam && data.teams && data.teams.length > 0) {
					teamStore.setSelectedTeam(data.teams[0]);
					await loadTeamMembers(data.teams[0].$id);
				}
			} else {
				teamStore.setError(data.error || 'Failed to load teams');
			}
		} catch (error) {
			teamStore.setError('Teams API not available. Please check server configuration.');
			console.error('Error loading teams:', error);
		} finally {
			teamStore.setLoading(false);
		}
	}

	// Load team members
	async function loadTeamMembers(teamId: string) {
		teamStore.setLoading(true);
		teamStore.setError(null);
		
		try {
			console.log('Loading team members for team:', teamId);
			const response = await fetch(`/api/teams/${teamId}/members`);
			console.log('Team members response status:', response.status);
			
			if (!response.ok) {
				console.warn('Team members API not available, continuing without members');
				teamStore.setMembers([]);
				return;
			}
			
			const data = await response.json();
			console.log('Team members response data:', data);
			
			if (data.success) {
				teamStore.setMembers(data.members || []);
			} else {
				teamStore.setError(data.error || 'Failed to load team members');
			}
		} catch (error) {
			teamStore.setError('Failed to load team members');
			console.error('Error loading team members:', error);
		} finally {
			teamStore.setLoading(false);
		}
	}

	// Team selection handler
	async function selectTeam(team: any) {
		teamStore.setSelectedTeam(team);
		await loadTeamMembers(team.$id);
	}

	// Create new team
	async function createTeam() {
		if (!teamName.trim()) return;
		
		teamStore.setLoading(true);
		
		try {
			const response = await fetch('/api/teams', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: teamName,
					description: teamDescription,
					adminUserId: $user.$id
				})
			});
			
			const data = await response.json();
			
			if (data.success) {
				teamStore.addTeam(data.team);
				teamStore.setSelectedTeam(data.team);
				closeTeamModal();
				await loadTeamMembers(data.team.$id);
			} else {
				teamStore.setError(data.error || 'Failed to create team');
			}
		} catch (error) {
			teamStore.setError('Failed to create team');
			console.error('Error creating team:', error);
		} finally {
			teamStore.setLoading(false);
		}
	}

	// Update team
	async function updateTeam() {
		if (!editingTeam || !teamName.trim()) return;
		
		teamStore.setLoading(true);
		
		try {
			const response = await fetch(`/api/teams/${editingTeam.$id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: teamName
				})
			});
			
			const data = await response.json();
			
			if (data.success) {
				teamStore.updateTeam(editingTeam.$id, { name: teamName });
				closeTeamModal();
			} else {
				teamStore.setError(data.error || 'Failed to update team');
			}
		} catch (error) {
			teamStore.setError('Failed to update team');
			console.error('Error updating team:', error);
		} finally {
			teamStore.setLoading(false);
		}
	}

	// Delete team
	async function deleteTeam(teamId: string) {
		if (!confirm('Are you sure you want to delete this team?')) return;
		
		teamStore.setLoading(true);
		
		try {
			const response = await fetch(`/api/teams/${teamId}`, {
				method: 'DELETE'
			});
			
			const data = await response.json();
			
			if (data.success) {
				teamStore.removeTeam(teamId);
				
				// Select another team if available
				if ($teamStore.teams.length > 0) {
					const nextTeam = $teamStore.teams.find(t => t.$id !== teamId);
					if (nextTeam) {
						teamStore.setSelectedTeam(nextTeam);
						await loadTeamMembers(nextTeam.$id);
					}
				}
			} else {
				teamStore.setError(data.error || 'Failed to delete team');
			}
		} catch (error) {
			teamStore.setError('Failed to delete team');
			console.error('Error deleting team:', error);
		} finally {
			teamStore.setLoading(false);
		}
	}

	// Create new user
	async function createUser() {
		if (!userName.trim() || !userEmail.trim() || !userPhone.trim()) {
			teamStore.setError('Please fill in all required fields');
			return;
		}
		
		if (!$teamStore.selectedTeam) {
			teamStore.setError('Please select a team first');
			return;
		}
		
		teamStore.setLoading(true);
		teamStore.setError(null);
		
		try {
			console.log('Creating user with data:', {
				name: userName,
				email: userEmail,
				role: userRole,
				teamId: $teamStore.selectedTeam.$id
			});
			
			const response = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: userName,
					email: userEmail,
					phone: userPhone,
					role: 'vakdocent', // Always set main role as vakdocent
					teamId: $teamStore.selectedTeam.$id,
					teamRoles: teamRoles // Send team-specific roles
				})
			});
			
			console.log('User creation response status:', response.status);
			const data = await response.json();
			console.log('User creation response data:', data);
			
			if (data.success) {
				console.log('User created successfully, reloading team members...');
				resetUserForm();
				// Reload team members to show the new user
				await loadTeamMembers($teamStore.selectedTeam.$id);
			} else {
				teamStore.setError(data.error || 'Failed to create user');
			}
		} catch (error) {
			teamStore.setError('Failed to create user');
			console.error('Error creating user:', error);
		} finally {
			teamStore.setLoading(false);
		}
	}

	// Disable user
	async function disableUser(member: any) {
		teamStore.setLoading(true);
		
		try {
			const response = await fetch(`/api/teams/${$teamStore.selectedTeam?.$id}/members/${member.$id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: 'disabled'
				})
			});
			
			const data = await response.json();
			
			if (data.success) {
				teamStore.updateMember(member.$id, { status: 'disabled' });
			} else {
				teamStore.setError(data.error || 'Failed to disable user');
			}
		} catch (error) {
			teamStore.setError('Failed to disable user');
			console.error('Error disabling user:', error);
		} finally {
			teamStore.setLoading(false);
		}
	}

	// Remove user from team
	async function removeUser(member: any) {
		if (!confirm('Are you sure you want to remove this user from the team?')) return;
		
		teamStore.setLoading(true);
		
		try {
			const response = await fetch(`/api/teams/${$teamStore.selectedTeam?.$id}/members/${member.$id}`, {
				method: 'DELETE'
			});
			
			const data = await response.json();
			
			if (data.success) {
				teamStore.removeMember(member.$id);
			} else {
				teamStore.setError(data.error || 'Failed to remove user');
			}
		} catch (error) {
			teamStore.setError('Failed to remove user');
			console.error('Error removing user:', error);
		} finally {
			teamStore.setLoading(false);
		}
	}

	// Modal handlers
	function openTeamModal(team: any = null) {
		editingTeam = team;
		teamName = team?.name || '';
		teamDescription = team?.description || '';
		showTeamModal = true;
	}

	function closeTeamModal() {
		showTeamModal = false;
		editingTeam = null;
		teamName = '';
		teamDescription = '';
	}

	function resetUserForm() {
		editingUser = null;
		userName = '';
		userEmail = '';
		userPhone = '';
		userRole = 'vakdocent';
		teamRoles = [];
	}

	// Navigate to user profile
	function navigateToProfile(member: any) {
		// Check different possible user ID fields in the membership object
		const userId = member.userId || member.user?.$id || member.$id;
		
		if (userId) {
			goto(`/profile/${userId}?viewerId=${$user?.$id || ''}`);
		} else {
			console.warn('No userId available for member:', member);
			console.log('Member object structure:', member);
		}
	}
</script>

<svelte:head>
	<title>Team Management - Toekomst.school</title>
</svelte:head>

<div class="team-management">

	<div class="header">
		<h1>Team Management</h1>
		{#if canManageTeams}
			<Button on:click={() => openTeamModal()} variant="default">
				<Plus size={16} />
				New Team
			</Button>
		{/if}
	</div>

	{#if $teamStore.error}
		<div class="error">
			{$teamStore.error}
			{#if $teamStore.error.includes('Teams API not available')}
				<div class="error-help">
					<p><strong>To enable teams functionality:</strong></p>
					<ul>
						<li>Ensure your Appwrite API key has Teams permissions</li>
						<li>Check server environment variables</li>
						<li>Visit <a href="/api/teams/test" target="_blank">/api/teams/test</a> to test the API</li>
					</ul>
				</div>
			{/if}
		</div>
	{/if}

	{#if $teamStore.loading}
		<div class="loading">Loading...</div>
	{:else}
		<div class="teams-container">
			<!-- Teams sidebar -->
			<div class="teams-sidebar">
				<h3>Teams</h3>
				<div class="teams-list">
					{#each $teamStore.teams as team}
						<div 
							class="team-item {$teamStore.selectedTeam?.$id === team.$id ? 'selected' : ''}"
							on:click={() => selectTeam(team)}
						>
							<div class="team-info">
								<Users size={16} />
								<span>{team.name}</span>
							</div>
							{#if canManageTeams}
								<div class="team-actions">
									<button on:click|stopPropagation={() => openTeamModal(team)}>
										<Edit size={14} />
									</button>
									<button on:click|stopPropagation={() => deleteTeam(team.$id)}>
										<Trash2 size={14} />
									</button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Team members content -->
			<div class="members-content">
				{#if $teamStore.selectedTeam}
					<div class="members-header">
						<h3>Members of {$teamStore.selectedTeam.name}</h3>
						{#if canManageUsers}
							<Dialog.Root>
								<Dialog.Trigger>
									<Button variant="default">
										<UserPlus size={16} />
										Add Member
									</Button>
								</Dialog.Trigger>
								<Dialog.Content class="sm:max-w-[425px] bg-[var(--background)] text-foreground border border-border">
									<Dialog.Header>
										<Dialog.Title>Nieuwe Gebruiker Aanmaken</Dialog.Title>
									</Dialog.Header>
									<form on:submit|preventDefault={createUser}>
										<div class="grid gap-4 py-4">
											<div class="grid grid-cols-4 items-center gap-4">
												<label for="userName" class="text-right">Naam</label>
												<input
													id="userName"
													type="text"
													bind:value={userName}
													placeholder="Voer naam in"
													class="col-span-3"
													required
												/>
											</div>
											<div class="grid grid-cols-4 items-center gap-4">
												<label for="userEmail" class="text-right">Email</label>
												<input
													id="userEmail"
													type="email"
													bind:value={userEmail}
													placeholder="Voer email in"
													class="col-span-3"
													required
												/>
											</div>
											<div class="grid grid-cols-4 items-center gap-4">
												<label for="userPhone" class="text-right">Telefoon</label>
												<input
													id="userPhone"
													type="tel"
													bind:value={userPhone}
													placeholder="Voer telefoon in"
													class="col-span-3 px-3 py-2 border rounded-md"
													required
												/>
											</div>
											<div class="grid grid-cols-4 items-start gap-4">
												<label class="text-right">Team Rollen</label>
												<div class="col-span-3 space-y-2">
													<label class="flex items-center space-x-2">
														<input 
															type="checkbox" 
															bind:group={teamRoles} 
															value="planning"
														/>
														<span>Planning</span>
													</label>
													<label class="flex items-center space-x-2">
														<input 
															type="checkbox" 
															bind:group={teamRoles} 
															value="admin"
														/>
														<span>Admin</span>
													</label>
												</div>
											</div>
										</div>
										<Dialog.Footer>
											<Button type="submit" variant="default">
												Gebruiker Aanmaken
											</Button>
										</Dialog.Footer>
									</form>
								</Dialog.Content>
							</Dialog.Root>
						{/if}
					</div>

					<div class="members-table">
						<table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Email</th>
									<th>Role</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each $teamStore.members as member}
									<tr class="clickable-row" on:click={() => navigateToProfile(member)}>
										<td>{member.userName || 'N/A'}</td>
										<td>{member.userEmail || 'N/A'}</td>
										<td>{member.roles.join(', ')}</td>
										<td>
											<span class="status {member.status === 'accepted' ? 'active' : 'inactive'}">
												{member.status}
											</span>
										</td>
										<td>
											{#if canManageUsers}
												<div class="actions">
													<button on:click|stopPropagation={() => disableUser(member)} title="Disable User">
														<UserX size={14} />
													</button>
													<button on:click|stopPropagation={() => removeUser(member)} title="Remove from Team">
														<Trash2 size={14} />
													</button>
												</div>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="no-team">
						<p>Select a team to view members</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Team Modal -->
{#if showTeamModal}
	<div class="modal-backdrop" on:click={closeTeamModal}></div>
	<div class="modal">
		<h3>{editingTeam ? 'Edit Team' : 'Create New Team'}</h3>
		<form on:submit|preventDefault={editingTeam ? updateTeam : createTeam}>
			<div class="form-group">
				<label for="teamName">Team Name</label>
				<input
					id="teamName"
					type="text"
					bind:value={teamName}
					placeholder="Enter team name"
					required
				/>
			</div>
			<div class="form-group">
				<label for="teamDescription">Description</label>
				<textarea
					id="teamDescription"
					bind:value={teamDescription}
					placeholder="Enter team description"
					rows="3"
				></textarea>
			</div>
			<div class="form-actions">
				<Button type="button" variant="outline" on:click={closeTeamModal}>Cancel</Button>
				<Button type="submit" variant="default">
					{editingTeam ? 'Update' : 'Create'} Team
				</Button>
			</div>
		</form>
	</div>
{/if}


<style>
	.team-management {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.header h1 {
		margin: 0;
		font-size: 2rem;
		color: var(--foreground);
	}

	.error {
		background: var(--destructive);
		color: white;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
	}
	
	.error-help {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
		font-size: 0.9rem;
	}
	
	.error-help p {
		margin: 0 0 0.5rem 0;
	}
	
	.error-help ul {
		margin: 0;
		padding-left: 1.5rem;
	}
	
	.error-help li {
		margin-bottom: 0.25rem;
	}
	
	.error-help a {
		color: white;
		text-decoration: underline;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: var(--muted-foreground);
	}

	.teams-container {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: 2rem;
		height: 600px;
	}

	.teams-sidebar {
		background: var(--muted);
		border-radius: 8px;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.teams-sidebar h3 {
		margin: 0 0 1rem 0;
		color: var(--foreground);
	}

	.teams-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.team-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.team-item:hover {
		background: var(--accent);
		color: white;
	}

	.team-item.selected {
		background: var(--accent);
		color: white;
	}

	.team-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.team-actions {
		display: flex;
		gap: 0.25rem;
	}

	.team-actions button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		color: currentColor;
	}

	.team-actions button:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.members-content {
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.members-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.members-header h3 {
		margin: 0;
		color: var(--foreground);
	}

	.members-table {
		overflow-x: auto;
	}

	.members-table table {
		width: 100%;
		border-collapse: collapse;
	}

	.members-table th,
	.members-table td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}

	.members-table th {
		background: var(--muted);
		font-weight: 600;
	}

	.clickable-row {
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.clickable-row:hover {
		background-color: var(--muted);
	}

	.status {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status.active {
		background: var(--success);
		color: white;
	}

	.status.inactive {
		background: var(--muted);
		color: var(--muted-foreground);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.actions button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 4px;
		color: var(--muted-foreground);
	}

	.actions button:hover {
		background: var(--muted);
		color: var(--foreground);
	}

	.no-team {
		text-align: center;
		padding: 4rem;
		color: var(--muted-foreground);
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: var(--foreground);
	}

	.form-group input,
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--background);
		color: var(--foreground);
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--accent);
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	@media (max-width: 768px) {
		.teams-container {
			grid-template-columns: 1fr;
			height: auto;
		}
		
		.teams-sidebar {
			height: 200px;
		}
	}
</style>