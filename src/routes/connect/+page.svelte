<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { databases } from '$lib/appwrite';
	import Select from 'svelte-select';
	import { user } from '$lib/stores/auth.js';

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
	let availableLessons: any[] = [];
	let selectedLesson: any = null;
	let loadingLessons = false;
	let showLessonSelection = false;
	let upcomingWorkshops: any[] = [];

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
		
		// If no lesson/workshop params, lesson selection will happen after connection
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
			workshopData = await databases.getDocument('lessen', 'planning', workshopId);
			
			// Load school data if workshop has a school reference
			if (workshopData.school) {
				try {
					const school = await databases.getDocument('lessen', 'school', workshopData.school);
					workshopData.schoolName = school.name;
					console.log('🏫 Loaded school data:', { id: workshopData.school, name: school.name });
				} catch (schoolError) {
					console.error('Error loading school data:', schoolError);
					workshopData.schoolName = 'Onbekende school';
				}
			}
			
			// Load lesson data if workshop has a lesson reference
			if (workshopData.lesson) {
				const lesson = await databases.getDocument('lessen', 'les', workshopData.lesson);
				slides = lesson.slides || '';
				totalSlides = countSlidesInMarkdown(slides);
			}
		} catch (error) {
			console.error('Error loading workshop:', error);
			connectionError = 'Kon workshop niet laden';
		}
	}

	async function loadAvailableLessons() {
		loadingLessons = true;
		try {
			const response = await databases.listDocuments('lessen', 'les');
			availableLessons = response.documents.map(lesson => ({
				value: lesson.$id,
				label: `${lesson.lesnummer || 'Les'} - ${lesson.onderwerp || 'Geen titel'}`,
				lesson: lesson
			}));
		} catch (error) {
			console.error('Error loading lessons:', error);
			connectionError = 'Kon lessen niet laden';
		} finally {
			loadingLessons = false;
		}
	}

	async function checkUpcomingWorkshops() {
		if (!$user) return;
		
		try {
			const now = new Date();
			const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
			
			// Get all workshops and filter in JavaScript (simpler than complex Appwrite queries)
			const response = await databases.listDocuments('lessen', 'planning');
			
			console.log('Checking workshops for user:', $user.$id, 'Total workshops:', response.documents.length);
			
			// Filter workshops assigned to current user that are currently happening or starting soon
			upcomingWorkshops = response.documents.filter(workshop => {
				if (workshop.teacher !== $user.$id) return false;
				
				const startTime = new Date(workshop.start);
				const endTime = new Date(workshop.end);
				
				// Include workshops that are:
				// 1. Currently happening (started but not ended)
				// 2. Starting within the next 10 minutes
				const isCurrentlyHappening = startTime <= now && endTime >= now;
				const isStartingSoon = startTime >= now && startTime <= tenMinutesFromNow;
				
				console.log('Workshop check:', {
					title: workshop.title,
					start: startTime.toLocaleString(),
					end: endTime.toLocaleString(),
					now: now.toLocaleString(),
					isCurrentlyHappening,
					isStartingSoon,
					teacher: workshop.teacher
				});
				
				return isCurrentlyHappening || isStartingSoon;
			});
			
			console.log('Found current/upcoming workshops:', upcomingWorkshops.length);
			if (upcomingWorkshops.length > 0) {
				console.log('First workshop:', upcomingWorkshops[0]);
				console.log('Workshop has lesson field:', !!upcomingWorkshops[0].lesson);
				console.log('Lesson value:', upcomingWorkshops[0].lesson);
			}
			
			// Auto-load lesson from current/upcoming workshop
			if (upcomingWorkshops.length > 0 && upcomingWorkshops[0].lesson) {
				console.log('Auto-loading lesson from current workshop:', upcomingWorkshops[0]);
				console.log('Workshop lesson ID:', upcomingWorkshops[0].lesson);
				
				// Store the workshop data BEFORE loading lesson
				workshopData = upcomingWorkshops[0];
				
				// Load school data for the workshop
				if (workshopData.school) {
					try {
						const school = await databases.getDocument('lessen', 'school', workshopData.school);
						workshopData.schoolName = school.name;
						console.log('🏫 Auto-loaded school data:', { id: workshopData.school, name: school.name });
					} catch (schoolError) {
						console.error('Error auto-loading school data:', schoolError);
						workshopData.schoolName = 'Onbekende school';
					}
				}
				
				await loadLessonData(upcomingWorkshops[0].lesson);
				showLessonSelection = false; // Hide selection since we loaded the workshop lesson
			}
		} catch (error) {
			console.error('Error checking upcoming workshops:', error);
			// Continue without auto-selection if workshop check fails
		}
	}

	async function onLessonSelect(event: any) {
		if (event.detail) {
			const selected = event.detail;
			selectedLesson = selected.value;
			await loadLessonData(selected.value);
			showLessonSelection = false;
			
			// Send lesson data to presentation if connected
			if (isConnected && sessionCode) {
				await sendLessonToPresentation();
			}
		}
	}

	async function sendLessonToPresentation() {
		if (!slides || !sessionCode) {
			console.log('Cannot send slides: missing slides or session code', { slides: !!slides, sessionCode });
			return;
		}
		
		try {
			console.log('Sending lesson slides to presentation:', { sessionCode, totalSlides, slidesLength: slides.length });
			
			// Debug: Check current state before sending
			console.log('🔍 CONNECT PAGE - Current state before sending:', {
				hasWorkshopData: !!workshopData,
				hasLessonData: !!lessonData,
				workshopDataFields: workshopData ? Object.keys(workshopData) : 'none',
				workshopStart: workshopData?.start,
				workshopEnd: workshopData?.end,
				workshopTitle: workshopData?.title
			});
			
			// Prepare the data to send
			const requestData = {
				type: 'update-slides',
				slides: slides,
				totalSlides: totalSlides
			};
			
			// Include full workshop details if available
			if (workshopData) {
				requestData.workshopData = workshopData;
				requestData.workshopStartTime = workshopData.start;
				requestData.workshopEndTime = workshopData.end;
				console.log('🚀 CONNECT PAGE - Including full workshop data in request:', { 
					workshopId: workshopData.$id,
					title: workshopData.title,
					start: workshopData.start, 
					end: workshopData.end,
					school: workshopData.school,
					schoolName: workshopData.schoolName,
					group: workshopData.group,
					teacher: workshopData.teacher
				});
			} else {
				console.log('❌ CONNECT PAGE - No workshop data available:', { 
					hasWorkshopData: !!workshopData,
					hasLessonData: !!lessonData
				});
			}
			
			console.log('📤 CONNECT PAGE - Full request data being sent:', requestData);
			
			const response = await fetch(`/api/presentation/${sessionCode}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestData)
			});
			
			if (response.ok) {
				console.log('Lesson slides successfully sent to presentation');
			} else {
				console.error('Failed to send slides:', response.status, response.statusText);
			}
		} catch (error) {
			console.error('Error sending lesson to presentation:', error);
		}
	}

	function clearLessonSelection() {
		lessonData = null;
		workshopData = null;
		slides = '';
		totalSlides = 0;
		selectedLesson = null;
		showLessonSelection = true;
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

			// If lesson/workshop data already loaded (from URL params), send to presentation
			if (lessonData || workshopData) {
				await sendLessonToPresentation();
			} else {
				// No lesson/workshop data loaded, check for current workshop first
				await loadAvailableLessons();
				await checkUpcomingWorkshops();
				
				// If we auto-loaded a lesson from workshop, send it to presentation
				if (lessonData) {
					await sendLessonToPresentation();
				} else {
					// No workshop lesson found, show selection dropdown
					showLessonSelection = true;
				}
			}

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
		showLessonSelection = false;
		upcomingWorkshops = [];
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
					{#if upcomingWorkshops.length > 0 && upcomingWorkshops.some(w => w.lessonId === lessonData.$id)}
						<p class="text-warning text-xs mt-1">🚀 Auto-geselecteerd van lopende workshop</p>
					{/if}
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
					on:input={(e) => sessionCode = e.target.value.toUpperCase()}
					placeholder="Voer 6-cijferige code in"
					maxlength="6"
					disabled={isConnecting}
					style="text-transform: uppercase;"
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

			{#if showLessonSelection && !lessonData && !workshopData}
				<div class="bg-card rounded-lg border p-4 mb-4">
					<h3 class="text-lg font-medium mb-3">Kies een les voor deze presentatie</h3>
					
					
					<div class="mb-4">
						<label for="lesson-select" class="block text-sm font-medium mb-2">Selecteer les:</label>
						<Select
							id="lesson-select"
							items={availableLessons}
							value={selectedLesson}
							placeholder="Zoek en selecteer een les..."
							on:select={onLessonSelect}
							on:clear={() => selectedLesson = null}
							isLoading={loadingLessons}
							clearable={true}
							searchable={true}
							class="lesson-select"
						/>
					</div>
				</div>
			{/if}

			{#if lessonData}
				<div class="bg-card rounded-lg border p-4 mb-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-primary text-sm font-medium">Les geladen: {lessonData.onderwerp}</p>
							<p class="text-muted-foreground text-xs mt-1">Slides zijn verzonden naar presentatie</p>
						</div>
						<button 
							class="bg-muted hover:bg-muted/80 text-foreground px-3 py-1 rounded-md text-xs font-medium transition-colors"
							on:click={clearLessonSelection}
						>
							Wijzig
						</button>
					</div>
				</div>
			{:else if workshopData}
				<div class="bg-card rounded-lg border p-4 mb-4">
					<p class="text-primary text-sm font-medium">Workshop geladen</p>
					<p class="text-muted-foreground text-xs mt-1">Slides zijn verzonden naar presentatie</p>
				</div>
			{/if}


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

	:global(.lesson-select) {
		--border: 1px solid hsl(var(--border));
		--border-radius: 0.5rem;
		--background: hsl(var(--background));
		--list-background: hsl(var(--background));
		--item-hover-bg: hsl(var(--muted));
		--item-color: hsl(var(--foreground));
		--placeholder-color: hsl(var(--muted-foreground));
		--focus-outline: 2px solid hsl(var(--ring));
	}

	:global(.lesson-select .svelte-select) {
		border: var(--border);
		border-radius: var(--border-radius);
		background: var(--background);
		padding: 0.5rem;
		font-size: 0.875rem;
	}

	:global(.lesson-select .list-container) {
		background: var(--list-background);
		border: var(--border);
		border-radius: var(--border-radius);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		max-height: 200px;
		overflow-y: auto;
	}

	:global(.lesson-select .item) {
		padding: 0.5rem;
		color: var(--item-color);
		cursor: pointer;
	}

	:global(.lesson-select .item.hover) {
		background: var(--item-hover-bg);
	}
</style>