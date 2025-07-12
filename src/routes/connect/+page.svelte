<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { databases } from '$lib/appwrite';

	let sessionCode = '';
	let isConnected = false;
	let isConnecting = false;
	let currentSlide = 0;
	let totalSlides = 0;
	let connectionError = '';
	let pollInterval: NodeJS.Timeout;
	let slides = '';
	let lessonData: any = null;
	let workshopData: any = null;

	onMount(async () => {
		// Check if there's a session code in the URL (from QR code or manual entry)
		const code = $page.url.searchParams.get('code');
		if (code) {
			sessionCode = code;
			connectToSession();
			return;
		}

		// Check for lesson/workshop parameters (when coming from Start Les buttons)
		const lessonId = $page.url.searchParams.get('lesson');
		const workshopId = $page.url.searchParams.get('workshop');
		
		if (lessonId) {
			await loadLessonData(lessonId);
		} else if (workshopId) {
			await loadWorkshopData(workshopId);
		}
		
		// Always show manual entry interface - wait for user to enter session code from present page
	});



	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	function countSlidesInMarkdown(markdown: string): number {
		if (!markdown) return 0;
		// Count slides by counting slide separators (---) plus 1
		const separators = (markdown.match(/^---$/gm) || []).length;
		return separators + 1;
	}

	async function loadLessonData(lessonId: string) {
		try {
			lessonData = await databases.getDocument('lessen', 'les', lessonId);
			slides = lessonData.slides || '';
			totalSlides = countSlidesInMarkdown(slides);
		} catch (error) {
			console.error('Error loading lesson:', error);
			connectionError = 'Kon les niet laden';
		}
	}

	async function loadWorkshopData(workshopId: string) {
		try {
			workshopData = await databases.getDocument('workshops', 'workshop', workshopId);
			// Load lesson data if workshop has a lesson reference
			if (workshopData.lessonId) {
				const lesson = await databases.getDocument('lessen', 'les', workshopData.lessonId);
				slides = lesson.slides || '';
				totalSlides = countSlidesInMarkdown(slides);
			}
		} catch (error) {
			console.error('Error loading workshop:', error);
			connectionError = 'Kon workshop niet laden';
		}
	}


	async function connectToSession() {
		if (!sessionCode.trim()) {
			connectionError = 'Voer een sessiecode in';
			return;
		}

		isConnecting = true;
		connectionError = '';

		try {
			console.log('Connecting to session:', sessionCode);
			
			// Send slides data to session when connecting (if we have lesson/workshop data)
			const requestBody: any = { type: 'connect-device' };
			
			// If we have lesson/workshop data, send the slides
			if (slides && (lessonData || workshopData)) {
				requestBody.slides = slides;
				requestBody.totalSlides = totalSlides;
			}
			
			const response = await fetch(`/api/presentation/${sessionCode}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			console.log('Connection response:', response.status, response.statusText);

			if (!response.ok) {
				const errorData = await response.text();
				console.error('Connection failed:', errorData);
				throw new Error('Kan niet verbinden met sessie');
			}

			isConnected = true;
			isConnecting = false;

			// Start polling for slide updates
			pollInterval = setInterval(async () => {
				try {
					const response = await fetch(`/api/presentation/${sessionCode}`);
					if (response.ok) {
						const data = await response.json();
						currentSlide = data.currentSlide;
						totalSlides = data.totalSlides;
					} else {
						// Session might have ended
						if (response.status === 404) {
							connectionError = 'Sessie is beëindigd';
							disconnect();
						}
					}
				} catch (error) {
					console.error('Error polling session:', error);
				}
			}, 1000);

		} catch (error) {
			isConnecting = false;
			connectionError = error.message || 'Kan geen verbinding maken';
		}
	}

	async function sendCommand(command: string) {
		if (!isConnected) return;

		try {
			await fetch(`/api/presentation/${sessionCode}/commands`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ command })
			});
		} catch (error) {
			console.error('Error sending command:', error);
		}
	}

	function nextSlide() {
		sendCommand('next');
	}

	function prevSlide() {
		sendCommand('prev');
	}

	function firstSlide() {
		sendCommand('first');
	}

	function lastSlide() {
		sendCommand('last');
	}

	async function disconnect() {
		if (pollInterval) {
			clearInterval(pollInterval);
		}

		if (isConnected) {
			try {
				await fetch(`/api/presentation/${sessionCode}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ type: 'disconnect-device' })
				});
			} catch (error) {
				console.error('Error disconnecting:', error);
			}
		}

		isConnected = false;
		sessionCode = '';
	}
</script>

<div class="container mx-auto p-6 max-w-md">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-primary mb-2">📱 Presentatie Controle</h1>
		<p class="text-muted-foreground">Bedien je presentatie vanaf je telefoon</p>
	</div>

	{#if !isConnected}
		<div class="bg-card rounded-lg border p-6 mb-6">
			<h2 class="text-xl font-semibold mb-4">Verbinden met presentatie</h2>
			
			{#if lessonData}
				<div class="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
					<p class="text-primary text-sm font-medium">Les geladen: {lessonData.onderwerp}</p>
					<p class="text-muted-foreground text-xs mt-1">Klaar om slides te verzenden naar presentatie</p>
				</div>
			{:else if workshopData}
				<div class="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
					<p class="text-primary text-sm font-medium">Workshop geladen</p>
					<p class="text-muted-foreground text-xs mt-1">Klaar om slides te verzenden naar presentatie</p>
				</div>
			{/if}
			
			<div class="mb-4">
				<label for="sessionCode" class="block text-sm font-medium mb-2">Sessiecode:</label>
				<input
					id="sessionCode"
					type="text"
					bind:value={sessionCode}
					placeholder="Voer 6-cijferige code in"
					maxlength="6"
					disabled={isConnecting}
					class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-center text-lg font-mono tracking-wider"
				/>
			</div>

			{#if connectionError}
				<div class="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
					<p class="text-destructive text-sm">{connectionError}</p>
				</div>
			{/if}

			<button 
				class="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				on:click={connectToSession}
				disabled={isConnecting || !sessionCode.trim()}
			>
				{#if isConnecting}
					Verbinden...
				{:else}
					Verbinden
				{/if}
			</button>
		</div>
	{:else}
		<div class="space-y-6">
			<div class="bg-card rounded-lg border p-4">
				<div class="flex items-center justify-between mb-2">
					<div class="flex items-center gap-2">
						<div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
						<span class="font-medium">Verbonden met sessie: {sessionCode}</span>
					</div>
					<button 
						class="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-md text-sm font-medium transition-colors"
						on:click={disconnect}
					>
						Verbreek
					</button>
				</div>
				<div class="text-center">
					<span class="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
						Slide {currentSlide + 1} / {totalSlides}
					</span>
				</div>
			</div>


			<div class="controls-layout">
				<!-- Top row: Eerste and Laatste -->
				<div class="grid grid-cols-2 gap-4 mb-4">
					<button 
						class="bg-muted hover:bg-muted/80 text-foreground border border-border p-3 rounded-lg flex flex-col items-center gap-2 font-medium transition-colors"
						on:click={firstSlide}
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polygon points="11,19 2,12 11,5" />
							<polygon points="22,19 13,12 22,5" />
						</svg>
						Eerste
					</button>

					<button 
						class="bg-muted hover:bg-muted/80 text-foreground border border-border p-3 rounded-lg flex flex-col items-center gap-2 font-medium transition-colors"
						on:click={lastSlide}
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polygon points="13,19 22,12 13,5" />
							<polygon points="2,19 11,12 2,5" />
						</svg>
						Laatste
					</button>
				</div>

				<!-- Bottom row: Vorige and Volgende - Fixed to bottom -->
				<div class="fixed-bottom-controls">
					<button 
						class="bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-lg flex flex-col items-center gap-2 font-medium transition-colors"
						on:click={prevSlide}
					>
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polygon points="15,18 9,12 15,6" />
						</svg>
						Vorige
					</button>

					<button 
						class="bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-lg flex flex-col items-center gap-2 font-medium transition-colors"
						on:click={nextSlide}
					>
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polygon points="9,18 15,12 9,6" />
						</svg>
						Volgende
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.controls-layout {
		position: relative;
		min-height: 40vh;
	}

	.fixed-bottom-controls {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: calc(100% - 4rem);
		max-width: 400px;
		z-index: 10;
	}

	.fixed-bottom-controls button {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	@media (max-width: 640px) {
		.fixed-bottom-controls {
			width: calc(100% - 2rem);
			bottom: 1rem;
		}
	}
</style>