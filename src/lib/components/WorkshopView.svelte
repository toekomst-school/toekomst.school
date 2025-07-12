<script lang="ts">
	export let event: any;
	export let currentUser: any = null;
	export let isVakdocent: boolean = false;
	import { createEventDispatcher } from 'svelte';
	import { Map, MapPin, Clipboard, Pencil, Check } from '@lucide/svelte';
	import { goto } from '$app/navigation';
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

	// Check if workshop is available (no teacher assigned or status is pending)
	$: isAvailable = !event.teacher || event.status === 'pending';
	
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
		<h2>Workshop details</h2>
		<button
			class="icon-btn edit-icon-btn"
			on:click={edit}
			aria-label="Bewerk"
			title="Bewerk deze workshop"><Pencil size={20} /></button
		>
	</div>
	{#if event}
		<div class="workshop-info-grid">
			<div>
				<span>Les:</span>
				{#if event.lessonId}<a href={`/lessen/${event.lessonId}`} target="_blank"
						>{event.lessonName}</a
					>{:else}-{/if}
			</div>
			<div>
				<span>School:</span>
				{#if event.schoolId}<a href={`/scholen/${event.schoolId}`} target="_blank"
						>{event.schoolName}</a
					>{:else}-{/if}
			</div>
			<div><span>Groep:</span> {event.group}</div>
			<div>
				<span>Vakdocent:</span>
				{#if event.teacherId}<a href={`/team/${event.teacherId}`} target="_blank"
						>{event.teacherName}</a
					>{:else}-{/if}
			</div>
			<div><span>Datum:</span> {formatDate(event.start)}</div>
			<div><span>Tijd:</span> {formatTimeRange(event.start, event.end)}</div>
			<div><span>Lengte:</span> {event.length} min</div>
			<div><span>Status:</span> {event.status}</div>
			<div><span>Materialen:</span> {event.materialen}</div>
			<div><span>Beschrijving:</span> {event.description}</div>
			{#if address}
				<div class="address-row" style="grid-column: 1 / -1;">
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
		max-width: 500px;
		margin: 0 auto;
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
		margin-bottom: 1.5rem;
		font-size: 1.4rem;
		font-weight: bold;
		color: var(--accent, #3ba39b);
	}
	.workshop-info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 2rem;
		font-size: 1.05rem;
	}
	.workshop-info-grid span {
		font-weight: 600;
		color: var(--foreground, #222);
		margin-right: 0.5rem;
	}
	@media (max-width: 600px) {
		.workshop-info-grid {
			grid-template-columns: 1fr;
		}
		.workshop-view-card {
			padding: 1.2rem 0.5rem 1.5rem 0.5rem;
		}
		.close-btn {
			right: 0.5rem;
			top: 0.5rem;
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
</style>
