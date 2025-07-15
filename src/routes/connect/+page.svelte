<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { databases } from '$lib/appwrite';
	import Select from 'svelte-select';
	import { user } from '$lib/stores/auth.js';
	import { createSocketManager, type SocketManager } from '$lib/stores/socketManager.js';

	let sessionCode = '';
	let isConnected = false;
	let isConnecting = false;
	let currentSlide = 0;
	let totalSlides = 0;
	let connectionError = '';
	let slides = '';
	let slideNotes: string[] = [];
	let currentSlideNotes = '';
	let lessonData: any = null;
	let workshopData: any = null;
	let availableLessons: any[] = [];
	let selectedLesson: any = null;
	let loadingLessons = false;
	let showLessonSelection = false;
	let upcomingWorkshops: any[] = [];
	
	// Socket.IO manager
	let socketManager: SocketManager | null = null;
	let connectionMode: 'websocket' | 'http' = 'websocket';
	
	// Long press state
	let longPressTimer: NodeJS.Timeout;
	let isLongPress = false;
	let lastCommandTime = 0;
	
	// Button visibility state
	let showButtons = true;

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
		
		// Add keyboard event listener for presentation navigation
		const handleKeydown = (e: KeyboardEvent) => {
			if (!isConnected) return;
			
			switch (e.key) {
				case 'ArrowLeft':
					e.preventDefault();
					hideButtonsOnKeyboardUse();
					prevSlide();
					break;
				case 'ArrowRight':
					e.preventDefault();
					hideButtonsOnKeyboardUse();
					nextSlide();
					break;
			}
		};
		
		document.addEventListener('keydown', handleKeydown);
		
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});



	onDestroy(() => {
			if (socketManager) {
			socketManager.disconnect();
		}
	});

	function countSlidesInMarkdown(markdown: string): number {
		if (!markdown) return 0;
		// Count slides by counting slide separators (---) plus 1
		const separators = (markdown.match(/^---$/gm) || []).length;
		return separators + 1;
	}

	function parseMarkdownSlidesWithNotes(markdown: string): { slides: string[], notes: string[] } {
		if (!markdown) return { slides: [], notes: [] };
		
		const slideTexts = markdown.split(/^---$/gm).filter(slide => slide.trim());
		const slides: string[] = [];
		const notes: string[] = [];
		
		slideTexts.forEach(slideText => {
			// Look for speaker notes in HTML comments (<!-- Note: ... -->)
			const htmlCommentMatch = slideText.match(/<!--\s*[Nn]ote[s]?:\s*(.*?)\s*-->/s);
			// Look for speaker notes in plain text (Note: ...)
			const plainTextMatch = slideText.match(/(?:^|\n)[Nn]ote[s]?:\s*(.+?)(?=\n|$)/s);
			
			let noteContent = '';
			let cleanSlideContent = slideText;
			
			if (htmlCommentMatch) {
				noteContent = htmlCommentMatch[1].trim();
				cleanSlideContent = slideText.replace(/<!--\s*[Nn]ote[s]?:.*?-->/s, '').trim();
			} else if (plainTextMatch) {
				noteContent = plainTextMatch[1].trim();
				cleanSlideContent = slideText.replace(/(?:^|\n)[Nn]ote[s]?:.*$/m, '').trim();
			}
			
			slides.push(cleanSlideContent);
			notes.push(noteContent);
		});
		
		return { slides, notes };
	}

	async function loadLessonData(lessonId: string) {
		try {
			lessonData = await databases.getDocument('lessen', 'les', lessonId);
			slides = lessonData.slides || '';
			totalSlides = countSlidesInMarkdown(slides);
			// Parse slides with notes
			const parsed = parseMarkdownSlidesWithNotes(slides);
			slideNotes = parsed.notes;
			// Update current slide notes
			currentSlideNotes = slideNotes[currentSlide] || '';
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
				await loadSchoolData(workshopData.school);
			}
			
			// Load lesson data if workshop has a lesson reference
			if (workshopData.lesson) {
				const lesson = await databases.getDocument('lessen', 'les', workshopData.lesson);
				slides = lesson.slides || '';
				totalSlides = countSlidesInMarkdown(slides);
				// Parse slides with notes
				const parsed = parseMarkdownSlidesWithNotes(slides);
				slideNotes = parsed.notes;
				// Update current slide notes
				currentSlideNotes = slideNotes[currentSlide] || '';
			}
		} catch (error) {
			console.error('Error loading workshop:', error);
			connectionError = 'Kon workshop niet laden';
		}
	}

	async function loadSchoolData(schoolId: string) {
		try {
			const school = await databases.getDocument('scholen', 'school', schoolId);
			workshopData.schoolName = school.name || school.NAAM || 'Onbekende school';
			console.log('🏫 Loaded school data:', { id: schoolId, name: workshopData.schoolName });
		} catch (schoolError) {
			console.error('Error loading school data:', schoolError);
			workshopData.schoolName = 'Onbekende school';
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
						const school = await databases.getDocument('scholen', 'school', workshopData.school);
						workshopData.schoolName = school.name || school.NAAM || 'Onbekende school';
						console.log('🏫 Auto-loaded school data:', { id: workshopData.school, name: workshopData.schoolName });
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
			if (isConnected && sessionCode && socketManager) {
				await socketManager.sendLessonUpdate(slides, totalSlides, workshopData, workshopData?.start, workshopData?.end);
			}
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
			
			// Create Socket.IO manager for this session
			socketManager = createSocketManager({
				sessionCode,
				isPresenter: false,
				onSlideUpdate: (current: number, total: number) => {
					currentSlide = current;
					totalSlides = total;
					// Update current slide notes
					currentSlideNotes = slideNotes[currentSlide] || '';
				},
				onLessonUpdate: (newSlides: string, totalSlidesCount: number, newWorkshopData?: any) => {
					console.log('📚 Lesson update received on connect page:', { 
						slidesLength: newSlides.length, 
						totalSlidesCount, 
						hasWorkshopData: !!newWorkshopData 
					});
					
					// Update slides data
					if (newSlides) {
						slides = newSlides;
						const parsed = parseMarkdownSlidesWithNotes(newSlides);
						slideNotes = parsed.notes;
						totalSlides = parsed.slides.length;
						currentSlideNotes = slideNotes[currentSlide] || '';
					}

					// Update workshop data and hide lesson selection
					if (newWorkshopData) {
						workshopData = newWorkshopData;
						showLessonSelection = false;
					}
				},
				onSessionState: (state: any) => {
					console.log('📊 Session state received on connect page:', state);
					
					// Update all session data
					currentSlide = state.currentSlide || 0;
					totalSlides = state.totalSlides || 0;
					
					// Update slides if provided
					if (state.slides && state.slides !== slides) {
						slides = state.slides;
						const parsed = parseMarkdownSlidesWithNotes(state.slides);
						slideNotes = parsed.notes;
						totalSlides = parsed.slides.length;
						currentSlideNotes = slideNotes[currentSlide] || '';
						
						// If we have slides but no workshop data, create lesson data for display
						if (!state.workshopData && state.slides) {
							lessonData = {
								onderwerp: 'Actieve presentatie',
								slides: state.slides
							};
						}
					}

					// Update workshop data if provided
					if (state.workshopData) {
						workshopData = state.workshopData;
						showLessonSelection = false;
						
						// Load school data if workshop has a school reference
						if (workshopData.school && !workshopData.schoolName) {
							loadSchoolData(workshopData.school);
						}
					}
				}
			});

			// Subscribe to Socket.IO transport changes
			socketManager.transport.subscribe(transport => {
				connectionMode = transport === 'websocket' ? 'websocket' : 'http';
				console.log('🔄 Transport mode updated to:', connectionMode, '(transport:', transport + ')');
			});

			// Connect using the Socket.IO manager
			await socketManager.connect();

			// Send slides data to session when connecting (if we have lesson/workshop data)
			if (slides && (lessonData || workshopData)) {
				await socketManager.connectDevice(slides, totalSlides);
			} else {
				await socketManager.connectDevice();
			}

			isConnected = true;
			isConnecting = false;

			// If lesson/workshop data already loaded (from URL params), send to presentation
			if ((lessonData || workshopData) && socketManager) {
				await socketManager.sendLessonUpdate(slides, totalSlides, workshopData, workshopData?.start, workshopData?.end);
			} else {
				// No lesson/workshop data loaded, check for current workshop first
				await loadAvailableLessons();
				await checkUpcomingWorkshops();
				
				// If we auto-loaded a lesson from workshop, send it to presentation
				if (lessonData && socketManager) {
					await socketManager.sendLessonUpdate(slides, totalSlides, workshopData, workshopData?.start, workshopData?.end);
				} else {
						// No workshop lesson found, show selection dropdown
					showLessonSelection = true;
				}
			}

			// No polling needed - Socket.IO handles real-time updates automatically

		} catch (error) {
			isConnecting = false;
			connectionError = error.message || 'Kan geen verbinding maken';
		}
	}

	async function sendCommand(command: string) {
		if (!isConnected || !socketManager) return;

		// Debounce commands to prevent double-sends
		const now = Date.now();
		if (now - lastCommandTime < 500) {
			console.log('🚫 Command debounced:', command);
			return;
		}
		lastCommandTime = now;

		try {
			console.log('🎮 Sending Socket.IO command:', command, 'from slide:', currentSlide);
			await socketManager.sendCommand(command);
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

	// Press handlers - 1 second press triggers long action
	function handlePressStart(action: 'prev' | 'next') {
		isLongPress = false;
		longPressTimer = setTimeout(() => {
			isLongPress = true;
			if (action === 'prev') {
				firstSlide();
			} else {
				// Go to second-to-last slide (one before the last)
				sendCommand('second-to-last');
			}
		}, 1000); // 1 second press
	}

	function handlePressEnd(action: 'prev' | 'next') {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
		}
		
		// Only perform regular action if it wasn't a long press
		if (!isLongPress) {
			if (action === 'prev') {
				prevSlide();
			} else {
				nextSlide();
			}
		}
		
		isLongPress = false;
	}

	function handlePressCancel() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
		}
		isLongPress = false;
	}

	function hideButtonsOnKeyboardUse() {
		showButtons = false;
	}
	
	function showButtonsOnTouch() {
		showButtons = true;
	}

	async function disconnect() {
		if (socketManager) {
			socketManager.disconnect();
			socketManager = null;
		}

		isConnected = false;
		sessionCode = '';
		showLessonSelection = false;
		upcomingWorkshops = [];
		showButtons = true; // Reset button visibility
	}
</script>

<div class="container mx-auto p-6 max-w-md">

	{#if !isConnected}
		<div class="bg-card rounded-lg border p-6 mb-6">
			<h2 class="text-xl font-semibold mb-4">Verbinden met presentatie</h2>
			<div class="mb-4 p-3 bg-muted border border-border rounded-md">
				<p class="text-foreground text-sm">📺 Ga op het digibord naar <code class="bg-background px-1 py-0.5 rounded text-xs font-mono font-bold">toekomst.school/present</code> om de presentatie te starten.</p>
			</div>
			
					
			{#if workshopData}
				<div class="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
					<div class="space-y-2">
						<div class="text-sm">
							{#if workshopData.schoolName}
								<p class="text-muted-foreground">📍 {workshopData.schoolName}</p>
							{/if}
							{#if workshopData.group}
								<p class="text-muted-foreground">👥 {workshopData.group}</p>
							{/if}
							{#if workshopData.start && workshopData.end}
								<p class="text-muted-foreground text-xs">
									⏰ {new Date(workshopData.start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - 
									{new Date(workshopData.end).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
								</p>
							{/if}
						</div>
						{#if lessonData}
							<div class="mt-2 pt-2 border-t border-primary/20">
								<p class="text-primary text-sm font-medium">{lessonData.onderwerp}</p>
							</div>
						{/if}
					</div>
				</div>
			{:else if lessonData}
				<div class="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
					<p class="text-primary text-sm font-medium">{lessonData.onderwerp}</p>
				</div>
			{/if}
			
			<div class="mb-4">
				<label for="sessionCode" class="block text-sm font-medium mb-2">Sessiecode:</label>
				<input
					id="sessionCode"
					type="text"
					bind:value={sessionCode}
					on:input={(e) => sessionCode = e.target.value.toUpperCase()}
					on:keydown={(e) => {
						if (e.key === 'Enter' && sessionCode.trim() && !isConnecting) {
							connectToSession();
						}
					}}
					placeholder="Voer 4-cijferige code in"
					maxlength="4"
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
		<!-- Top right controls -->
		<div class="absolute top-4 right-4 z-50 flex items-center gap-2">
			<!-- Connection status indicator -->
			<div class="text-gray-400 text-sm font-mono">
				{connectionMode === 'websocket' ? 'WS' : 'HTTP'}
			</div>
			
			<!-- Disconnect cross -->
			<div 
				class="text-destructive cursor-pointer hover:text-destructive/80 transition-colors"
				on:click={disconnect}
				on:keydown={(e) => e.key === 'Enter' && disconnect()}
				role="button"
				tabindex="0"
				aria-label="Verbreek verbinding"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</div>
		</div>
		
		<div class="space-y-6">

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

			{#if workshopData}
				<div class="bg-card rounded-lg border p-4 mb-4">
					<div class="flex items-center justify-between">
						<div class="space-y-2">
							<div class="text-sm">
								{#if workshopData.schoolName}
									<p class="text-muted-foreground">📍 {workshopData.schoolName}</p>
								{/if}
								{#if workshopData.group}
									<p class="text-muted-foreground">👥 {workshopData.group}</p>
								{/if}
								{#if workshopData.start && workshopData.end}
									<p class="text-muted-foreground text-xs">
										⏰ {new Date(workshopData.start).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} - 
										{new Date(workshopData.end).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
									</p>
								{/if}
							</div>
							{#if lessonData}
								<div class="mt-2 pt-2 border-t border-muted">
									<p class="text-primary text-sm font-medium">{lessonData.onderwerp}</p>
								</div>
							{/if}
						</div>
						<button 
							class="bg-muted hover:bg-muted/80 text-foreground px-3 py-1 rounded-md text-xs font-medium transition-colors"
							on:click={clearLessonSelection}
						>
							Wijzig
						</button>
					</div>
				</div>
			{:else if lessonData}
				<div class="bg-card rounded-lg border p-4 mb-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-primary text-sm font-medium">{lessonData.onderwerp}</p>
						</div>
						<button 
							class="bg-muted hover:bg-muted/80 text-foreground px-3 py-1 rounded-md text-xs font-medium transition-colors"
							on:click={clearLessonSelection}
						>
							Wijzig
						</button>
					</div>
				</div>
			{/if}

			{#if currentSlideNotes}
				<div class="slide-notes">
					<p class="text-foreground text-lg text-center">{currentSlideNotes}</p>
				</div>
			{/if}

			<div class="controls-layout">
				<!-- Floating slide counter -->
				<div class="floating-slide-counter">
					<span class="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
						Slide {currentSlide + 1} / {totalSlides}
					</span>
				</div>
				
				<!-- Navigation buttons - Fixed to bottom -->
				{#if showButtons}
					<div class="fixed-bottom-controls">
						<button 
							class="bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-lg flex flex-col items-center gap-2 font-medium transition-colors"
							on:mousedown={() => { showButtonsOnTouch(); handlePressStart('prev'); }}
							on:mouseup={() => handlePressEnd('prev')}
							on:mouseleave={handlePressCancel}
							on:touchstart={() => { showButtonsOnTouch(); handlePressStart('prev'); }}
							on:touchend={() => handlePressEnd('prev')}
							on:touchcancel={handlePressCancel}
						>
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polygon points="15,18 9,12 15,6" />
							</svg>
							Vorige
						</button>

						<button 
							class="bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-lg flex flex-col items-center gap-2 font-medium transition-colors"
							on:mousedown={() => { showButtonsOnTouch(); handlePressStart('next'); }}
							on:mouseup={() => handlePressEnd('next')}
							on:mouseleave={handlePressCancel}
							on:touchstart={() => { showButtonsOnTouch(); handlePressStart('next'); }}
							on:touchend={() => handlePressEnd('next')}
							on:touchcancel={handlePressCancel}
						>
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polygon points="9,18 15,12 9,6" />
							</svg>
							Volgende
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.controls-layout {
		position: relative;
		min-height: 40vh;
	}

	.floating-slide-counter {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 15;
	}

	.fixed-bottom-controls {
		position: fixed;
		bottom: 5rem;
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		width: calc(100% - 4rem);
		max-width: 320px;
		z-index: 10;
	}
	
	.fixed-bottom-controls button {
		max-width: 150px;
		padding: 0.75rem 1rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	@media (max-width: 640px) {
		.fixed-bottom-controls {
			width: calc(100% - 2rem);
			bottom: 6rem;
		}
		
		.fixed-bottom-controls button {
			max-width: none;
			padding: 1rem;
		}
		
		.floating-slide-counter {
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