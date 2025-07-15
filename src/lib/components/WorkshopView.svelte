<script lang="ts">
	export let event: any;
	export let currentUser: any = null;
	export let isVakdocent: boolean = false;
	export let isAdmin: boolean = false;
	export let lessonOptions: { value: string; label: string }[] = [];
	
	// Debug logging
	console.log('WorkshopView: received event:', event);
	console.log('WorkshopView: event.sessions:', event.sessions);
	
	
	// Function to get lesson name from lesson ID
	function getLessonName(lessonId: string): string {
		const lesson = lessonOptions.find(opt => opt.value === lessonId);
		return lesson ? lesson.label : lessonId;
	}

	// Function to get status label with proper styling
	function getStatusLabel(status: string): string {
		const statusMap = {
			'concept': 'Concept',
			'geplanned': 'Gepland',
			'gekoppeld': 'Gekoppeld',
			'bevestigd': 'Bevestigd',
			'in_uitvoering': 'In uitvoering',
			'afgerond': 'Afgerond',
			'gecanceld': 'Geannuleerd'
		};
		return statusMap[status] || status;
	}

	// Function to get status color
	function getStatusColor(status: string): string {
		const colorMap = {
			'concept': '#6b7280', // gray
			'geplanned': '#3b82f6', // blue
			'gekoppeld': '#f59e0b', // amber
			'bevestigd': '#10b981', // green
			'in_uitvoering': '#8b5cf6', // purple
			'afgerond': '#059669', // emerald
			'gecanceld': '#ef4444' // red
		};
		return colorMap[status] || '#6b7280';
	}

	// Function to get status explanation
	function getStatusExplanation(status: string): string {
		const explanations = {
			'concept': 'Deze workshop is nog in concept fase en alleen zichtbaar voor administrators.',
			'geplanned': 'Deze workshop is gepland en kan geboekt worden door vakdocenten.',
			'gekoppeld': 'Er is een voorstel gedaan aan een vakdocent voor deze workshop.',
			'bevestigd': 'Deze workshop is bevestigd door een vakdocent.',
			'in_uitvoering': 'Deze workshop is momenteel bezig.',
			'afgerond': 'Deze workshop is succesvol afgerond.',
			'gecanceld': 'Deze workshop is geannuleerd.'
		};
		return explanations[status] || 'Onbekende status';
	}

	import { createEventDispatcher } from 'svelte';
	import { Map, MapPin, Clipboard, Pencil, Check } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import * as Popover from "$lib/components/ui/popover/index.js";
	const dispatch = createEventDispatcher();
	let copied = false;

	function close() {
		dispatch('close');
	}

	function edit() {
		dispatch('edit');
	}

	function acceptWorkshop() {
		dispatch('accept', { event });
	}

	function startLesson() {
		// Redirect to connect page with workshop info (connect will load workshop and connect to present)
		goto(`/connect?workshop=${event.$id}`);
	}

	// Check if workshop is available (no teacher assigned or status is geplanned)
	$: isAvailable = !event.teacher || event.status === 'geplanned';
	
	// Check if workshop is assigned to current user
	$: isAssignedToMe = currentUser && event.teacher === currentUser.$id;

	// School address fields (if available)
	let address = '';
	let mapsQuery = '';
	let phone = '';
	$: if (event && event.schoolData) {
		const s = event.schoolData;
		address =
			`${s.STRAATNAAM || ''} ${s.HUISNUMMER || ''}, ${s.POSTCODE || ''} ${s.PLAATSNAAM || ''}, ${s.GEMEENTENAAM || ''}`
				.replace(/ +/g, ' ')
				.trim();
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
			setTimeout(() => (copied = false), 1200);
		});
	}

	function formatTimeRange(start: string, end: string): string {
		const startDate = new Date(start);
		const endDate = new Date(end);
		
		const startTime = startDate.toLocaleTimeString('nl-NL', { 
			hour: '2-digit', 
			minute: '2-digit'
		});
		const endTime = endDate.toLocaleTimeString('nl-NL', { 
			hour: '2-digit', 
			minute: '2-digit'
		});
		
		return `${startTime} - ${endTime}`;
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('nl-NL', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<div class="workshop-view-card">
	<div class="card-header">
		<button class="close-btn" on:click={close} aria-label="Sluiten">×</button>
	</div>
	{#if event.lessonVideoUrl}
		<div class="lesson-video-preview">
			<iframe
				title={event.lessonName || 'Lesvideo'}
				width="560"
				height="315"
				src={event.lessonVideoUrl}
				frameborder="0"
				allowfullscreen
				sandbox="allow-same-origin allow-scripts allow-popups"
				style="width: 100%; max-width: 640px; aspect-ratio: 16/9; height: auto; margin-bottom: 1.5rem; border-radius: 12px; border: none; background: #000;"
			></iframe>
		</div>
	{:else if event.lessonVideoThumbnail}
		<div class="lesson-video-preview">
			<img
				src={event.lessonVideoThumbnail}
				alt="Video preview"
				style="max-width: 100%; max-height: 180px; margin-bottom: 1.5rem; border-radius: 12px;"
			/>
		</div>
	{/if}
	<div class="details-title-row">
		<h2>
			{event.title || 'Workshop details'}
		</h2>
		{#if isAdmin}
			<button
				class="icon-btn edit-icon-btn"
				on:click={edit}
				aria-label="Bewerk"
				title="Bewerk deze workshop"><Pencil size={20} /></button
			>
		{/if}
	</div>
	{#if event}
		{#if event.status !== 'concept' || isAdmin}
			<Popover.Root>
				<Popover.Trigger 
					class="workshop-status-button" 
					style="color: var(--foreground, #222)"
					aria-label="Status uitleg"
				>
					{getStatusLabel(event.status)}
				</Popover.Trigger>
				<Popover.Content class="status-popover-content" align="start">
					<div class="status-popover-header">
						<strong>{getStatusLabel(event.status)}</strong>
					</div>
					<div class="status-popover-body">
						{getStatusExplanation(event.status)}
					</div>
				</Popover.Content>
			</Popover.Root>
		{/if}
		<div class="workshop-content">
			<!-- Timeline Section (Left Column) -->
			<div class="workshop-timeline-section">
				{#if event.sessions && event.sessions.length > 0}
					<div class="timeline-header">
						<span class="timeline-title">Workshops:</span>
					</div>
					{#each event.sessions as session, index}
						<div class="session-timeline-item {session.type}">
							<div class="session-timeline-header">
								<span class="session-timeline-icon">
									{session.type === 'session' ? '📚' : '☕'}
								</span>
								<span class="session-timeline-title">{session.title}</span>
								<span class="session-timeline-time">
									{formatTimeRange(session.start, session.end)}
								</span>
							</div>
							{#if session.duration}
								<div class="session-timeline-duration">
									{session.duration} minuten
								</div>
							{/if}
							{#if session.type === 'session' && session.title !== 'Voorbereiding op locatie'}
								<div class="session-details">
									{#if session.lesson}
										<div class="session-detail-item">
											<span class="session-detail-label">Workshop:</span>
											<span class="session-detail-value">{getLessonName(session.lesson)}</span>
										</div>
									{/if}
									{#if session.group}
										<div class="session-detail-item">
											<span class="session-detail-label">Groep/lokaal:</span>
											<span class="session-detail-value">{session.group}</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>

			<!-- Details Section (Right Column) -->
			<div class="workshop-details-section">
				<div class="workshop-info-grid">
					{#if (event.eventType === 'event' || (!event.eventType && !event.school))}
						<div>
							<span>Event:</span>
							{event.title || '-'}
						</div>
					{:else}
						<div>
							<span>School:</span>
							{#if event.schoolId}<a href={`/scholen/${event.schoolId}`} target="_blank"
									>{event.schoolName}</a
								>{:else}-{/if}
						</div>
					{/if}
					{#if isAdmin}
						<div>
							<span>Vakdocent:</span>
							{#if event.teacherId}<a href={`/team/${event.teacherId}`} target="_blank"
									>{event.teacherName}</a
								>{:else}-{/if}
						</div>
					{/if}
					<div><span>Datum:</span> {formatDate(event.start)}</div>
					<div><span>Tijd:</span> {formatTimeRange(event.start, event.end)}</div>
					<div><span>Totale workshoptijd:</span> {(() => {
						const totalMinutes = event.totalDuration || event.length;
						const hours = Math.floor(totalMinutes / 60);
						const minutes = totalMinutes % 60;
						
						if (hours === 0) {
							return `${minutes} minuten`;
						} else if (minutes === 0) {
							return `${hours} ${hours === 1 ? 'uur' : 'uur'}`;
						} else {
							return `${hours} ${hours === 1 ? 'uur' : 'uur'} en ${minutes} ${minutes === 1 ? 'minuut' : 'minuten'}`;
						}
					})()}</div>
					<div><span>Materialen:</span> {event.materialen}</div>
					<div><span>Beschrijving:</span> {event.description}</div>
					{#if address}
						<div class="address-row">
							<span>Adres:</span>
							{address}
							<span class="address-actions">
								<a
									href={`https://www.openstreetmap.org/search?query=${mapsQuery}`}
									target="_blank"
									title="Bekijk op OpenStreetMap"
									class="address-icon"><Map color="var(--accent)" size={20} /></a
								>
								<a
									href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
									target="_blank"
									title="Bekijk op Google Maps"
									class="address-icon"><MapPin color="var(--warning)" size={20} /></a
								>
								<a
									href="#"
									class="address-icon clipboard-btn"
									title={copied ? 'Gekopieerd!' : 'Kopieer adres'}
									aria-label="Kopieer adres"
									on:click|preventDefault={copyAddress}
									><Clipboard color="var(--foreground)" size={20} /></a
								>
							</span>
						</div>
					{/if}
					{#if phone}
						<div><span>Telefoon:</span> <a href={`tel:${phone}`}>{phone}</a></div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div>Geen gegevens beschikbaar.</div>
	{/if}
	
	{#if isVakdocent && isAvailable}
		<div class="accept-button-container">
			<button class="accept-btn" on:click={acceptWorkshop}>
				<Check size={20} />
				Workshop Accepteren
			</button>
		</div>
	{/if}
	
	{#if isAssignedToMe}
		<div class="start-lesson-container">
			<button class="start-lesson-btn" on:click={startLesson}>
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="5,3 19,12 5,21" />
				</svg>
				Start Les
			</button>
		</div>
	{/if}
</div>

<style>
	.workshop-view-card {
		width: 100%;
		background: var(--background, #fff);
		color: var(--foreground, #222);
		border-radius: 12px;
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
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
		margin: 0;
		font-size: 1.4rem;
		font-weight: bold;
		color: var(--accent, #3ba39b);
	}
	
	:global(.workshop-status-button) {
		background: none;
		border: none;
		font-size: 0.9rem;
		font-weight: 500;
		line-height: 1.2;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s ease;
		margin: -0.2rem 0 1.5rem 0;
		display: inline-block;
	}

	:global(.workshop-status-button:hover) {
		background-color: var(--divider, #eaeaea);
	}

	:global(.status-popover-content) {
		min-width: 250px;
		max-width: 300px;
		padding: 1rem;
		font-size: 0.9rem;
		line-height: 1.4;
		background: var(--background, #fff) !important;
		border: 1px solid var(--divider, #eaeaea) !important;
		border-radius: 8px !important;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
		color: var(--foreground, #222) !important;
	}

	.status-popover-header {
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}

	.status-popover-body {
		color: var(--muted-foreground, #6c757d);
	}
	.workshop-info-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-size: 1.05rem;
	}
	.workshop-info-grid span {
		font-weight: 600;
		color: var(--foreground, #222);
		margin-right: 0.5rem;
	}

	/* Two-column layout for workshop content */
	.workshop-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.workshop-timeline-section {
		flex: 1;
	}

	.workshop-details-section {
		flex: 1;
	}

	.timeline-header {
		margin-bottom: 1rem;
	}

	.timeline-title {
		font-weight: 600;
		color: var(--foreground, #222);
		font-size: 1.05rem;
	}

	/* Responsive layout for tablet and desktop */
	@media (min-width: 768px) {
		.workshop-content {
			flex-direction: row;
			gap: 2.5rem;
		}
		
		.workshop-timeline-section {
			flex: 0 0 45%;
		}
		
		.workshop-details-section {
			flex: 1;
		}
		
		.workshop-info-grid {
			gap: 1rem;
		}
	}
	@media (max-width: 600px) {
		.workshop-view-card {
			padding: 1.2rem 0.5rem 1.5rem 0.5rem;
		}
		.close-btn {
			right: 0.5rem;
			top: 0.5rem;
			padding: 0.5rem;
			min-width: 44px;
			min-height: 44px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.edit-icon-btn {
			padding: 0.5rem;
			min-width: 44px;
			min-height: 44px;
			margin-left: 1rem;
		}
		.details-title-row {
			margin-bottom: 2rem;
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
		transition:
			background 0.15s,
			color 0.15s;
		font-size: 1.1rem;
		display: flex;
		align-items: center;
	}
	.icon-btn.edit-icon-btn:hover {
		background: var(--divider, #eaeaea);
		color: var(--warning, #eab308);
	}
	.accept-button-container {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--divider, #eaeaea);
		display: flex;
		justify-content: center;
	}
	.accept-btn {
		background: var(--accent, #3ba39b);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-family: 'Orbitron', 'Bebas Neue', Arial, sans-serif;
	}
	.accept-btn:hover {
		background: var(--warning, #eab308);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
	.accept-btn:active {
		transform: translateY(0);
	}

	.start-lesson-container {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--divider, #eaeaea);
		display: flex;
		justify-content: center;
	}

	.start-lesson-btn {
		background: var(--warning, #eab308);
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-family: 'Orbitron', 'Bebas Neue', Arial, sans-serif;
	}

	.start-lesson-btn:hover {
		background: var(--accent, #3ba39b);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.start-lesson-btn:active {
		transform: translateY(0);
	}

	/* Session timeline styles */

	.session-timeline-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		border-radius: 6px;
		border-left: 4px solid;
	}

	.session-timeline-item.session {
		border-left-color: var(--accent);
	}

	.session-timeline-item.break {
		border-left-color: var(--warning);
	}

	.session-timeline-item:last-child {
		margin-bottom: 0;
	}

	.session-timeline-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
	}

	.session-timeline-icon {
		font-size: 1.1rem;
	}

	.session-timeline-title {
		flex: 1;
		font-size: 0.9rem;
	}

	.session-timeline-time {
		font-size: 0.8rem;
		color: var(--muted-foreground, #6c757d);
		font-weight: 500;
	}

	.session-timeline-duration {
		font-size: 0.75rem;
		color: var(--muted-foreground, #6c757d);
		margin-left: 1.6rem;
	}

	.session-details {
		margin-top: 0.5rem;
		margin-left: 1.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.session-detail-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.session-detail-label {
		font-weight: 600;
		color: var(--muted-foreground, #6c757d);
		min-width: 80px;
	}

	.session-detail-value {
		color: var(--foreground, #222);
	}
</style>
