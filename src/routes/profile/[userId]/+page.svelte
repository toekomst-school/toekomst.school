<script lang="ts">
	import { page } from '$app/stores';
	import { user } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Users, Mail, Phone, MapPin, Award, Calendar, ArrowLeft } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	export let data;

	$: profile = data.profile;
	$: error = data.error;
	$: isOwnProfile = $user?.$id === data.userId;
	$: viewerRole = $user?.labels?.[0] || 'student';

	// Role display helper
	function getRoleDisplayName(role: string): string {
		switch (role) {
			case 'vakdocent': return $_('role.vakdocent');
			case 'teacher': return $_('role.teacher');
			case 'student': return $_('role.student');
			case 'admin': return $_('role.admin');
			default: return $_('role.unknown');
		}
	}

	// Format date helper
	function formatDate(dateString: string): string {
		const locale = $_('app.locale') || 'nl-NL';
		return new Date(dateString).toLocaleDateString(locale);
	}

	// Navigate back
	function goBack() {
		history.back();
	}
</script>

<svelte:head>
	<title>{profile?.name || $_('profile.title')} - Toekomst.school</title>
</svelte:head>

<div class="profile-container">
	<!-- Header with back button -->
	<div class="profile-header">
		<button class="back-button" on:click={goBack}>
			<ArrowLeft size={20} />
			{$_('forms.back')}
		</button>
		{#if isOwnProfile}
			<button class="edit-button" on:click={() => goto('/profile/edit')}>
				{$_('profile.edit_profile')}
			</button>
		{/if}
	</div>

	{#if error}
		<div class="error-card">
			<h1>{$_('profile.not_found')}</h1>
			<p>{error}</p>
		</div>
	{:else if profile}
		<div class="profile-card">
			<!-- Basic Information -->
			<div class="profile-basic">
				{#if profile.vakdocentProfile?.photo}
					<img 
						src={profile.vakdocentProfile.photo} 
						alt="{$_('profile.photo_alt', { values: { name: profile.name } })}"
						class="profile-photo"
					/>
				{:else}
					<div class="profile-photo-placeholder">
						<Users size={48} />
					</div>
				{/if}
				
				<div class="profile-info">
					<h1>{profile.name}</h1>
					<div class="role-badge role-{profile.role}">
						{getRoleDisplayName(profile.role)}
					</div>
					
					<div class="contact-info">
						{#if profile.email}
							<div class="contact-item">
								<Mail size={16} />
								<a href="mailto:{profile.email}">{profile.email}</a>
							</div>
						{/if}
						
						{#if profile.phone}
							<div class="contact-item">
								<Phone size={16} />
								<a href="tel:{profile.phone}">{profile.phone}</a>
							</div>
						{/if}
					</div>
					
					<div class="member-since">
						{$_('profile.member_since', { values: { date: formatDate(profile.createdAt) } })}
					</div>
				</div>
			</div>

			<!-- Role-specific sections -->
			{#if profile.role === 'vakdocent' && profile.vakdocentProfile}
				<div class="profile-section">
					<h2>{$_('profile.vakdocent_info')}</h2>
					
					{#if profile.vakdocentProfile.bio}
						<div class="info-item">
							<strong>{$_('profile.bio')}:</strong>
							<p>{profile.vakdocentProfile.bio}</p>
						</div>
					{/if}
					
					{#if profile.vakdocentProfile.qualifications}
						<div class="info-item">
							<Award size={16} />
							<strong>{$_('profile.qualifications')}:</strong>
							<span>{profile.vakdocentProfile.qualifications}</span>
						</div>
					{/if}
					
					{#if profile.vakdocentProfile.address}
						<div class="info-item">
							<MapPin size={16} />
							<strong>{$_('profile.address')}:</strong>
							<span>{profile.vakdocentProfile.address}</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Teacher Information -->
			{#if profile.role === 'teacher'}
				<div class="profile-section">
					<h2>{$_('profile.teacher_info')}</h2>
					
					{#if profile.schoolInfo}
						<div class="info-item">
							<MapPin size={16} />
							<strong>{$_('profile.school')}:</strong>
							<span>{profile.schoolInfo.schoolName}</span>
						</div>
						
						{#if profile.schoolInfo.address}
							<div class="info-item">
								<strong>{$_('profile.school_address')}:</strong>
								<span>{profile.schoolInfo.address}</span>
							</div>
						{/if}
					{/if}
					
					{#if profile.classes && profile.classes.length > 0}
						<div class="info-item">
							<strong>{$_('profile.classes')}:</strong>
							<div class="classes-list">
								{#each profile.classes as classItem}
									<div class="class-item">
										<span class="class-name">{classItem.klasnaam}</span>
										<span class="class-year">({classItem.jaar})</span>
										<span class="student-count">{classItem.leerlingen?.length || 0} {$_('classroom.students')}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Student Information -->
			{#if profile.role === 'student'}
				<div class="profile-section">
					<h2>{$_('profile.student_info')}</h2>
					
					{#if profile.schoolInfo}
						<div class="info-item">
							<MapPin size={16} />
							<strong>{$_('profile.school')}:</strong>
							<span>{profile.schoolInfo.schoolName}</span>
						</div>
						
						{#if profile.schoolInfo.className}
							<div class="info-item">
								<strong>{$_('profile.class')}:</strong>
								<span>{profile.schoolInfo.className}</span>
							</div>
						{/if}
						
						{#if profile.schoolInfo.jaar}
							<div class="info-item">
								<Calendar size={16} />
								<strong>{$_('profile.school_year')}:</strong>
								<span>{profile.schoolInfo.jaar}</span>
							</div>
						{/if}
					{/if}
					
					{#if profile.classmates && profile.classmates.length > 0}
						<div class="info-item">
							<strong>{$_('profile.classmates')}:</strong>
							<div class="classmates-list">
								{#each profile.classmates as classmate}
									<span class="classmate-name">{classmate.name}</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Team Memberships -->
			{#if profile.teamMemberships && profile.teamMemberships.length > 0}
				<div class="profile-section">
					<h2>{$_('profile.team_memberships')}</h2>
					<div class="teams-grid">
						{#each profile.teamMemberships as membership}
							<div class="team-card">
								<h3>{membership.teamName}</h3>
								<div class="team-roles">
									{#each membership.roles as role}
										<span class="role-tag">{role}</span>
									{/each}
								</div>
								<div class="team-status status-{membership.status}">
									{membership.status}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- School Information (placeholder for future implementation) -->
			{#if profile.schoolInfo}
				<div class="profile-section">
					<h2>{$_('profile.school_info')}</h2>
					<div class="info-item">
						<strong>{$_('profile.school')}:</strong>
						<span>{profile.schoolInfo.schoolName}</span>
					</div>
					{#if profile.schoolInfo.className}
						<div class="info-item">
							<strong>{$_('profile.class')}:</strong>
							<span>{profile.schoolInfo.className}</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Activity/Workshop History (placeholder) -->
			{#if profile.role !== 'admin'}
				<div class="profile-section">
					<h2>
						{#if profile.role === 'student'}
							{$_('profile.workshop_participation')}
						{:else}
							{$_('profile.workshop_history')}
						{/if}
					</h2>
					<div class="placeholder-content">
						<Calendar size={24} />
						<p>{$_('profile.workshop_history_placeholder')}</p>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="loading-card">
			<p>{$_('messages.loading')}</p>
		</div>
	{/if}
</div>

<style>
	.profile-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
	}

	.profile-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.back-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: none;
		border: 1px solid var(--border);
		color: var(--foreground);
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.back-button:hover {
		background: var(--muted);
	}

	.edit-button {
		background: var(--primary);
		color: var(--primary-foreground);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.edit-button:hover {
		background: var(--primary)/90;
	}

	.profile-card {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.error-card, .loading-card {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		color: var(--muted-foreground);
	}

	.profile-basic {
		display: flex;
		gap: 2rem;
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--border);
	}

	.profile-photo {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		object-fit: cover;
		border: 3px solid var(--border);
	}

	.profile-photo-placeholder {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: var(--muted);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted-foreground);
		border: 3px solid var(--border);
	}

	.profile-info h1 {
		margin: 0 0 0.5rem 0;
		color: var(--foreground);
		font-size: 2rem;
	}

	.role-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.role-vakdocent {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.role-teacher {
		background: var(--secondary);
		color: var(--secondary-foreground);
	}

	.role-student {
		background: var(--accent);
		color: var(--accent-foreground);
	}

	.role-admin {
		background: var(--destructive);
		color: var(--destructive-foreground);
	}

	.contact-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.contact-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--muted-foreground);
	}

	.contact-item a {
		color: var(--foreground);
		text-decoration: none;
	}

	.contact-item a:hover {
		text-decoration: underline;
	}

	.member-since {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.profile-section {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid var(--border);
	}

	.profile-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	.profile-section h2 {
		margin: 0 0 1rem 0;
		color: var(--foreground);
		font-size: 1.25rem;
	}

	.info-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.info-item strong {
		min-width: 100px;
		color: var(--foreground);
	}

	.info-item p {
		margin: 0;
		line-height: 1.5;
	}

	.teams-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.team-card {
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1rem;
	}

	.team-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: var(--foreground);
	}

	.team-roles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-bottom: 0.5rem;
	}

	.role-tag {
		background: var(--primary);
		color: var(--primary-foreground);
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
	}

	.team-status {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status-accepted {
		color: var(--success, #10b981);
	}

	.status-pending {
		color: var(--warning, #f59e0b);
	}

	.placeholder-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		color: var(--muted-foreground);
		text-align: center;
	}

	.classes-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.class-item {
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.class-name {
		font-weight: 500;
		color: var(--foreground);
	}

	.class-year {
		color: var(--muted-foreground);
		font-size: 0.875rem;
	}

	.student-count {
		margin-left: auto;
		color: var(--muted-foreground);
		font-size: 0.875rem;
		background: var(--accent);
		color: var(--accent-foreground);
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
	}

	.classmates-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.classmate-name {
		background: var(--secondary);
		color: var(--secondary-foreground);
		padding: 0.25rem 0.75rem;
		border-radius: 16px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.profile-container {
			padding: 1rem;
		}

		.profile-basic {
			flex-direction: column;
			text-align: center;
		}

		.teams-grid {
			grid-template-columns: 1fr;
		}
	}
</style>