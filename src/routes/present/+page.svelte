<script lang="ts">
	import QrCode from 'svelte-qrcode';
	import { onMount, onDestroy } from 'svelte';
	import { marked } from 'marked';
	import { createSocketManager, type SocketManager, type SessionData } from '$lib/stores/socketManager.js';
	import { animate } from 'animejs';

	let sessionCode = '';
	let isPresenting = false;
	let qrUrl = '';
	let connectedDevices = 0;
	let currentSlide = 0;
	let totalSlides = 5; // Demo slides
	// Socket.IO manager (replaces polling)
	let socketManager: SocketManager | null = null;
	let connectionState = 'disconnected';
	let connectionError = '';
	let isWebSocketConnected = false;
	let slides = '';
	let parsedSlides: string[] = [];
	let slideNotes: string[] = [];
	let currentSlideNotes = '';
	let presentationComponent: any;
	let revealInstance: any;
	let revealLoaded = false;
	let highContrastMode = false;
	let isFullscreen = false;
	let autoFullscreenOnFirstClick = true;
	let confettiTriggered = false;
	let isChangingSlide = false;
	let previousSlideIndex = 0;
	let navigationDirection: 'next' | 'prev' | null = null;
	
	// Workshop time tracking
	let workshopStartTime = null;
	let workshopEndTime = null;
	let workshopTimeProgress = 0;
	let timeUpdateInterval;
	let currentTime = new Date();
	let workshopData = null;
	
	// Anime.js animation utilities
	const animationUtils = {
		// Slide entrance animations
		slideInFromRight: (elements: HTMLElement[]) => {
			if (!elements || elements.length === 0) return;
			
			// Filter out any invalid elements
			const validElements = elements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
			if (validElements.length === 0) return;
			
			// Use anime.js v4 syntax
			try {
				animate(validElements, {
					x: [
						{ from: 100, to: 0, duration: 800, ease: 'out(3)' }
					],
					y: [
						{ from: 0, to: 0, duration: 800 } // Reset any Y transform
					],
					opacity: [
						{ from: 0, to: 1, duration: 800, ease: 'out(3)' }
					],
					delay: (el: any, i: number) => i * 100
				});
			} catch (error) {
				console.warn('Anime.js error, using CSS fallback:', error);
				// CSS fallback
				validElements.forEach((el: any, i: number) => {
					if (el.style) {
						el.style.opacity = '0';
						el.style.transform = 'translateX(100px)';
						el.style.transition = `opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 100}ms, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 100}ms`;
						requestAnimationFrame(() => {
							el.style.opacity = '1';
							el.style.transform = 'translateX(0px)';
						});
					}
				});
			}
		},
		
		slideInFromLeft: (elements: HTMLElement[]) => {
			if (!elements || elements.length === 0) return;
			
			// Filter out any invalid elements
			const validElements = elements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
			if (validElements.length === 0) return;
			
			console.log('slideInFromLeft: targeting elements:', validElements);
			
			// Use anime.js v4 syntax
			try {
				animate(validElements, {
					x: [
						{ from: -100, to: 0, duration: 800, ease: 'out(3)' }
					],
					y: [
						{ from: 0, to: 0, duration: 800 } // Reset any Y transform
					],
					opacity: [
						{ from: 0, to: 1, duration: 800, ease: 'out(3)' }
					],
					delay: (el: any, i: number) => i * 100
				});
			} catch (error) {
				console.warn('Anime.js error, using CSS fallback:', error);
				// CSS fallback
				validElements.forEach((el: any, i: number) => {
					if (el.style) {
						el.style.opacity = '0';
						el.style.transform = 'translateX(-100px)';
						el.style.transition = `opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 100}ms, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 100}ms`;
						requestAnimationFrame(() => {
							el.style.opacity = '1';
							el.style.transform = 'translateX(0px)';
						});
					}
				});
			}
		},
		
		fadeInUp: (elements: HTMLElement[]) => {
			if (!elements || elements.length === 0) return;
			
			// Filter out any invalid elements
			const validElements = elements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
			if (validElements.length === 0) return;
			
			// Use anime.js v4 syntax
			try {
				animate(validElements, {
					x: [
						{ from: 0, to: 0, duration: 600 } // Reset any X transform
					],
					y: [
						{ from: 50, to: 0, duration: 600, ease: 'out(3)' }
					],
					opacity: [
						{ from: 0, to: 1, duration: 600, ease: 'out(3)' }
					],
					delay: (el: any, i: number) => i * 150
				});
			} catch (error) {
				console.warn('Anime.js error, using CSS fallback:', error);
				// CSS fallback
				validElements.forEach((el: any, i: number) => {
					if (el.style) {
						el.style.opacity = '0';
						el.style.transform = 'translateY(50px)';
						el.style.transition = `opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 150}ms, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 150}ms`;
						requestAnimationFrame(() => {
							el.style.opacity = '1';
							el.style.transform = 'translateY(0px)';
						});
					}
				});
			}
		},
		
		scaleIn: (elements: HTMLElement[]) => {
			if (!elements || elements.length === 0) return;
			
			// Filter out any invalid elements
			const validElements = elements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
			if (validElements.length === 0) return;
			
			// Use anime.js v4 syntax
			try {
				animate(validElements, {
					scale: [
						{ from: 0.8, to: 1, duration: 500, ease: 'outBack(3)' }
					],
					opacity: [
						{ from: 0, to: 1, duration: 500, ease: 'out(3)' }
					],
					delay: (el: any, i: number) => i * 100
				});
			} catch (error) {
				console.warn('Anime.js error, using CSS fallback:', error);
				// CSS fallback
				validElements.forEach((el: any, i: number) => {
					if (el.style) {
						el.style.opacity = '0';
						el.style.transform = 'scale(0.8)';
						el.style.transition = `opacity 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${i * 100}ms, transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${i * 100}ms`;
						requestAnimationFrame(() => {
							el.style.opacity = '1';
							el.style.transform = 'scale(1)';
						});
					}
				});
			}
		},
		
		// Enhanced confetti animation
		enhancedConfetti: (elements: HTMLElement[]) => {
			if (!elements || elements.length === 0) return;
			
			// Filter out any invalid elements
			const validElements = elements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
			if (validElements.length === 0) return;
			
			try {
				animate(validElements, {
					scale: [
						{ from: 0, to: 1, duration: 2000, ease: 'out(4)' }
					],
					rotate: [
						{ from: 0, to: () => Math.random() * 720 - 360, duration: 2000, ease: 'out(4)' }
					],
					y: [
						{ from: 0, to: -100, duration: 2000, ease: 'out(4)' }
					],
					x: [
						{ from: 0, to: () => Math.random() * 400 - 200, duration: 2000, ease: 'out(4)' }
					],
					opacity: [
						{ from: 1, to: 0, duration: 2000, ease: 'out(4)' }
					],
					delay: (el: any, i: number) => 100 + i * 50
				});
			} catch (error) {
				console.warn('Animation error in enhancedConfetti:', error);
				// CSS fallback for confetti
				validElements.forEach((el: any, i: number) => {
					if (el.style) {
						const rotation = Math.random() * 720 - 360;
						const translateX = Math.random() * 400 - 200;
						el.style.transform = `scale(0) rotate(${rotation}deg) translate(${translateX}px, 0px)`;
						el.style.transition = `all 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${100 + i * 50}ms`;
						requestAnimationFrame(() => {
							el.style.transform = `scale(1) rotate(${rotation}deg) translate(${translateX}px, -100px)`;
							el.style.opacity = '0';
						});
					}
				});
			}
		},
		
		// Animate bullet points with more pronounced staggering
		animateBulletPoints: (elements: HTMLElement[]) => {
			if (!elements || elements.length === 0) return;
			
			// Filter out any invalid elements
			const validElements = elements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
			if (validElements.length === 0) return;
			
			// Use anime.js v4 syntax with longer delays for bullet points
			try {
				animate(validElements, {
					x: [
						{ from: 0, to: 0, duration: 500 } // Reset any X transform
					],
					y: [
						{ from: 30, to: 0, duration: 500, ease: 'out(3)' }
					],
					opacity: [
						{ from: 0, to: 1, duration: 500, ease: 'out(3)' }
					],
					delay: (el: any, i: number) => i * 200 // 200ms delay between each bullet
				});
			} catch (error) {
				console.warn('Anime.js error, using CSS fallback:', error);
				// CSS fallback
				validElements.forEach((el: any, i: number) => {
					if (el.style) {
						el.style.opacity = '0';
						el.style.transform = 'translateY(30px)';
						el.style.transition = `opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 200}ms, transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 200}ms`;
						requestAnimationFrame(() => {
							el.style.opacity = '1';
							el.style.transform = 'translateY(0px)';
						});
					}
				});
			}
		},
		
		// Ensure elements are hidden before animation (CSS handles this, but reinforcement for safety)
		hideElementsBeforeAnimation: (slideElement: HTMLElement) => {
			if (!slideElement) return;
			
			// CSS already handles initial hiding, this is just a safety net
			const allAnimatedElements = slideElement.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, img, pre, code');
			allAnimatedElements.forEach((el: any) => {
				if (el.style && el.style.opacity !== '0') {
					el.style.opacity = '0';
					el.style.transform = 'translateY(20px)';
				}
			});
		},
		
		// Animate slide content based on type and direction
		animateSlideContent: (slideElement: HTMLElement, direction: 'next' | 'prev' | null = null) => {
			if (!slideElement) return;
			
			// Hide all elements first
			animationUtils.hideElementsBeforeAnimation(slideElement);
			
			try {
				const headings = slideElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
				const paragraphs = slideElement.querySelectorAll('p');
				const lists = slideElement.querySelectorAll('ul, ol');
				const images = slideElement.querySelectorAll('img');
				const codeBlocks = slideElement.querySelectorAll('pre, code');
				
				// Animate headings first - direction matters here
				if (headings.length > 0) {
					console.log('Animating headings:', headings.length, 'direction:', direction);
					if (direction === 'prev') {
						animationUtils.slideInFromRight(Array.from(headings) as HTMLElement[]);
					} else {
						animationUtils.slideInFromLeft(Array.from(headings) as HTMLElement[]);
					}
				}
				
				// Then paragraphs and bullet points
				setTimeout(() => {
					try {
						if (paragraphs.length > 0) {
							animationUtils.fadeInUp(Array.from(paragraphs) as HTMLElement[]);
						}
						
						// Animate bullet points individually with staggered timing
						const listItems = slideElement.querySelectorAll('li');
						if (listItems.length > 0) {
							console.log('Animating list items:', listItems.length);
							animationUtils.animateBulletPoints(Array.from(listItems) as HTMLElement[]);
						}
						
						// Animate list containers (ul/ol) if they have no list items (empty lists)
						if (lists.length > 0 && listItems.length === 0) {
							animationUtils.fadeInUp(Array.from(lists) as HTMLElement[]);
						}
					} catch (error) {
						console.warn('Error animating paragraphs/lists:', error);
					}
				}, 200);
				
				// Then images and code blocks
				setTimeout(() => {
					try {
						if (images.length > 0) {
							animationUtils.scaleIn(Array.from(images) as HTMLElement[]);
						}
						if (codeBlocks.length > 0) {
							// Code blocks slide from opposite direction of headings
							if (direction === 'prev') {
								animationUtils.slideInFromLeft(Array.from(codeBlocks) as HTMLElement[]);
							} else {
								animationUtils.slideInFromRight(Array.from(codeBlocks) as HTMLElement[]);
							}
						}
					} catch (error) {
						console.warn('Error animating images/code:', error);
					}
				}, 400);
			} catch (error) {
				console.warn('Error in animateSlideContent:', error);
			}
		}
	};

	// Generate a random 4-character code (A-Z, 0-9)
	function generateCode() {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let result = '';
		for (let i = 0; i < 4; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	function countSlidesInMarkdown(markdown: string): number {
		if (!markdown) return 0;
		// Count slides by counting slide separators (---) plus 1
		const separators = (markdown.match(/^---$/gm) || []).length;
		const lessonSlideCount = separators + 1;
		// Add 1 for the hardcoded "Einde van de workshop" slide
		return lessonSlideCount + 1;
	}

	function parseMarkdownSlides(markdown: string): string[] {
		if (!markdown) return [];
		// Split by slide separators (---) and filter out empty slides
		return markdown.split(/^---$/gm).filter(slide => slide.trim());
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

	function updateWorkshopTimeProgress() {
		currentTime = new Date();
		
		if (workshopStartTime && workshopEndTime) {
			const start = new Date(workshopStartTime);
			const end = new Date(workshopEndTime);
			const total = end.getTime() - start.getTime();
			const elapsed = currentTime.getTime() - start.getTime();
			
			workshopTimeProgress = Math.max(0, Math.min(100, (elapsed / total) * 100));
			
			// Debug progress calculation
			console.log('⏰ Time progress update:', {
				currentTime: currentTime.toLocaleTimeString('nl-NL'),
				startTime: start.toLocaleTimeString('nl-NL'),
				endTime: end.toLocaleTimeString('nl-NL'),
				elapsed: Math.round(elapsed / (1000 * 60)) + ' minutes',
				total: Math.round(total / (1000 * 60)) + ' minutes',
				progress: Math.round(workshopTimeProgress) + '%'
			});
		} else {
			// No workshop found, use session start time (start from 0)
			workshopTimeProgress = 0;
			console.log('⏰ No workshop timing available, progress = 0%');
		}
	}

	function startTimeTracking() {
		// Update every 30 seconds for better performance
		timeUpdateInterval = setInterval(updateWorkshopTimeProgress, 30000);
		updateWorkshopTimeProgress(); // Initial update
	}

	function stopTimeTracking() {
		if (timeUpdateInterval) {
			clearInterval(timeUpdateInterval);
			timeUpdateInterval = null;
		}
	}

	async function checkForActiveWorkshop() {
		try {
			// Check if this presentation is part of an active workshop
			const workshopId = new URLSearchParams(window.location.search).get('workshop');
			
			if (workshopId) {
				// Load workshop data from URL parameter
				const { databases } = await import('$lib/appwrite');
				const workshop = await databases.getDocument('lessen', 'planning', workshopId);
				
				workshopStartTime = workshop.start;
				workshopEndTime = workshop.end;
				console.log('Workshop found:', { start: workshopStartTime, end: workshopEndTime });
			} else {
				// No workshop, start timing from now
				workshopStartTime = null;
				workshopEndTime = null;
				console.log('No workshop found, starting from session start');
			}
		} catch (error) {
			console.error('Error checking for workshop:', error);
			workshopStartTime = null;
			workshopEndTime = null;
		}
	}

	async function requestFullscreen() {
		try {
			console.log('Attempting to enter fullscreen mode...');
			
			if (document.fullscreenElement) {
				console.log('Already in fullscreen mode');
				return;
			}
			
			if (document.documentElement.requestFullscreen) {
				console.log('Using standard requestFullscreen');
				await document.documentElement.requestFullscreen();
				console.log('Fullscreen request completed');
			} else if ((document.documentElement as any).webkitRequestFullscreen) {
				console.log('Using webkit requestFullscreen');
				await (document.documentElement as any).webkitRequestFullscreen();
				console.log('Webkit fullscreen request completed');
			} else if ((document.documentElement as any).msRequestFullscreen) {
				console.log('Using ms requestFullscreen');
				await (document.documentElement as any).msRequestFullscreen();
				console.log('MS fullscreen request completed');
			} else {
				console.log('Fullscreen API not supported');
			}
		} catch (error) {
			console.error('Fullscreen request failed:', error);
			// Try alternative approach - simulate F11 key press hint
			console.log('Fullscreen failed. User may need to press F11 manually or allow fullscreen permissions.');
		}
	}

	onMount(async () => {
		// Load Reveal.js from CDN
		await loadRevealJS();
		
		// Check for workshop and initialize time tracking
		await checkForActiveWorkshop();
		
		// Check if there's a session code in the URL (from present page)
		const urlSessionCode = new URLSearchParams(window.location.search).get('session');
		
		// Check for lesson/workshop parameters (when coming from /connect instructions)
		const lessonId = new URLSearchParams(window.location.search).get('lesson');
		const workshopId = new URLSearchParams(window.location.search).get('workshop');
		
		if (urlSessionCode) {
			sessionCode = urlSessionCode;
			
			// Setup Socket.IO connection immediately after getting session code
			console.log('Setting up Socket.IO connection for existing session:', sessionCode);
			setupSocketManager();
			
			// Load session data
			try {
				const response = await fetch(`/api/presentation/${sessionCode}`);
				if (response.ok) {
					const data = await response.json();
					totalSlides = data.totalSlides || 0;
					currentSlide = data.currentSlide || 0;
					connectedDevices = data.connectedDevices || 0;
					
					// Parse slides if available
					if (data.slides) {
						slides = data.slides;
						totalSlides = countSlidesInMarkdown(slides);
						const parsed = parseMarkdownSlidesWithNotes(slides);
						parsedSlides = parsed.slides;
						slideNotes = parsed.notes;
						// Update current slide notes
						currentSlideNotes = slideNotes[currentSlide] || '';
					}
					
					// Start the lesson automatically for existing sessions
					await startLesson();
				}
			} catch (error) {
				console.error('Error loading session:', error);
			}
		} else {
			// Generate new session code for new presentations
			sessionCode = generateCode();
			
			// Setup Socket.IO connection immediately after generating session code
			console.log('Setting up Socket.IO connection for new session:', sessionCode);
			setupSocketManager();
			
			// Load slides from lesson or workshop if specified
			if (lessonId) {
				await loadLessonData(lessonId);
			} else if (workshopId) {
				await loadWorkshopData(workshopId);
			}
			
			// Initialize presenter session with Socket.IO
			if (socketManager && slides) {
				await socketManager.initPresenter(slides, totalSlides);
			}
			
			// If we have slides, start immediately, otherwise wait for connection
			if (slides && slides.trim()) {
				console.log('Starting lesson with slides:', parsedSlides.length, 'slides');
				await startLesson();
			} else {
				console.log('No slides found, waiting for connection via Socket.IO');
				// Socket.IO connection will handle lesson updates via onLessonUpdate callback
			}
		}
		
		const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
		qrUrl = `${baseUrl}/connect?code=${sessionCode}`;

		// Update URL to include session parameter if we have one
		if (sessionCode) {
			const newUrl = new URL(window.location);
			if (!newUrl.searchParams.get('session')) {
				newUrl.searchParams.set('session', sessionCode);
				window.history.replaceState({}, '', newUrl);
			}
		}
		
		// Socket.IO connection already established above for both new and existing sessions
		
		// Add keyboard navigation
		document.addEventListener('keydown', handleKeydown);
		
		// Add fullscreen change listeners
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('msfullscreenchange', handleFullscreenChange);
	});

	async function loadLessonData(lessonId: string) {
		try {
			const lessonResponse = await fetch(`/api/lessons/${lessonId}`);
			if (!lessonResponse.ok) {
				// Try Appwrite directly
				const lesson = await databases.getDocument('lessen', 'les', lessonId);
				slides = lesson.slides || '';
			} else {
				const lesson = await lessonResponse.json();
				slides = lesson.slides || '';
			}
			
			if (slides) {
				const parsed = parseMarkdownSlidesWithNotes(slides);
				parsedSlides = parsed.slides;
				slideNotes = parsed.notes;
				totalSlides = parsed.slides.length;
				// Update current slide notes
				currentSlideNotes = slideNotes[currentSlide] || '';
			}
		} catch (error) {
			console.error('Error loading lesson:', error);
		}
	}

	async function loadWorkshopData(workshopId: string) {
		try {
			const workshopResponse = await fetch(`/api/workshops/${workshopId}`);
			if (!workshopResponse.ok) {
				// Try Appwrite directly
				const workshop = await databases.getDocument('workshops', 'workshop', workshopId);
				slides = workshop.slides || '';
			} else {
				const workshop = await workshopResponse.json();
				slides = workshop.slides || '';
			}
			
			if (slides) {
				const parsed = parseMarkdownSlidesWithNotes(slides);
				parsedSlides = parsed.slides;
				slideNotes = parsed.notes;
				totalSlides = parsed.slides.length;
				// Update current slide notes
				currentSlideNotes = slideNotes[currentSlide] || '';
			}
		} catch (error) {
			console.error('Error loading workshop:', error);
		}
	}


	async function loadRevealJS() {
		return new Promise((resolve, reject) => {
			if (typeof window !== 'undefined' && (window as any).Reveal) {
				revealLoaded = true;
				resolve(true);
				return;
			}
			
			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.js';
			script.onload = () => {
				revealLoaded = true;
				resolve(true);
			};
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	onDestroy(() => {
		if (socketManager) {
			socketManager.disconnect();
		}
		stopTimeTracking();
		
		// Remove keyboard event listener
		document.removeEventListener('keydown', handleKeydown);
	});

	// Keyboard navigation handler
	function handleKeydown(e: KeyboardEvent) {
		if (!isPresenting || !revealInstance) return;
		
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				e.preventDefault();
				handleCommand('prev', 'keyboard');
				break;
			case 'ArrowRight':
			case 'ArrowDown':
			case ' ': // Spacebar
				e.preventDefault();
				handleCommand('next', 'keyboard');
				break;
			case 'Home':
				e.preventDefault();
				handleCommand('first', 'keyboard');
				break;
			case 'End':
				e.preventDefault();
				handleCommand('last', 'keyboard');
				break;
			case 'f':
			case 'F':
				// Toggle fullscreen on 'f' key
				e.preventDefault();
				if (document.fullscreenElement) {
					document.exitFullscreen();
				} else {
					requestFullscreen();
				}
				break;
		}
	}


	// Connection manager callback functions
	function handleSlideUpdate(current: number, total: number) {
		// This is called when other devices change slides
		// For presenter, this would be if multiple presenters somehow existed
		console.log('🔄 Slide update received:', { current, total });
	}

	function handleCommand(command: string, commandId: string) {
		console.log('🎮 Command received:', { command, commandId });
		
		if (!revealInstance) {
			console.warn('RevealJS not ready, ignoring command:', { command, commandId });
			return;
		}

		switch (command) {
			case 'next':
				revealInstance.next();
				break;
			case 'prev':
				revealInstance.prev();
				break;
			case 'first':
				revealInstance.slide(0);
				break;
			case 'last':
				revealInstance.slide(totalSlides - 1);
				break;
			case 'second-to-last':
				revealInstance.slide(Math.max(0, totalSlides - 2));
				break;
		}
	}

	async function handleLessonUpdate(newSlides: string, totalSlidesCount: number, newWorkshopData?: any) {
		console.log('📚 Lesson update received:', { slidesLength: newSlides.length, totalSlidesCount, hasWorkshopData: !!newWorkshopData });
		
		// Update slides data
		if (newSlides) {
			slides = newSlides;
			const parsed = parseMarkdownSlidesWithNotes(newSlides);
			parsedSlides = parsed.slides;
			slideNotes = parsed.notes;
			totalSlides = parsed.slides.length + 1; // +1 for end slide
			currentSlideNotes = slideNotes[currentSlide] || '';
			
			// Reset confetti flag when new lesson loads
			confettiTriggered = false;
			console.log('Lesson updated, reset confetti flag. Total slides:', totalSlides);
		}

		// Update workshop data
		if (newWorkshopData) {
			workshopData = newWorkshopData;
			workshopStartTime = newWorkshopData.start;
			workshopEndTime = newWorkshopData.end;
			startTimeTracking();
		}

		// Reinitialize Reveal.js with new slides if we're already presenting
		if (isPresenting && revealInstance) {
			// Destroy and recreate Reveal.js with new slides
			revealInstance.destroy();
			revealInstance = null;
			await startLesson();
		} else if (!isPresenting && slides) {
			// Start lesson if we weren't presenting yet
			startLesson();
		}
	}

	function handleControllerCount(count: number) {
		connectedDevices = count;
		console.log('👥 Controller count updated:', count);
	}

	function handleSessionState(state: SessionData) {
		console.log('📊 Session state received:', state);
		
		// Update all session data
		connectedDevices = state.connectedDevices;
		
		// Update slides if provided
		if (state.slides && state.slides !== slides) {
			handleLessonUpdate(state.slides, state.totalSlides, state.workshopData);
		}

		// Update workshop timing
		if (state.workshopStartTime && state.workshopEndTime) {
			workshopStartTime = state.workshopStartTime;
			workshopEndTime = state.workshopEndTime;
			workshopData = state.workshopData;
			startTimeTracking();
		}
	}

	function setupSocketManager() {
		if (!sessionCode) {
			console.warn('setupSocketManager called but no sessionCode available');
			return;
		}

		console.log('Creating Socket.IO manager for session:', sessionCode);
		socketManager = createSocketManager({
			sessionCode,
			isPresenter: true,
			onSlideUpdate: handleSlideUpdate,
			onCommand: handleCommand,
			onLessonUpdate: handleLessonUpdate,
			onControllerCount: handleControllerCount,
			onSessionState: handleSessionState
		});

		// Subscribe to connection state changes
		socketManager.state.subscribe(state => {
			connectionState = state;
			console.log('Socket.IO state changed to:', state);
		});

		socketManager.error.subscribe(error => {
			connectionError = error;
			if (error) console.error('Socket.IO error:', error);
		});

		socketManager.isConnected.subscribe(connected => {
			console.log('Socket.IO connection status changed:', { connected });
		});
		
		socketManager.transport.subscribe(transport => {
			isWebSocketConnected = transport === 'websocket';
			console.log('Socket.IO transport changed:', { transport, isWebSocket: isWebSocketConnected });
		});

		// Connect to the session
		console.log('Initiating Socket.IO connection to session:', sessionCode);
		socketManager.connect();
	}

	async function startLesson() {
		console.log('startLesson called, parsedSlides:', parsedSlides.length);
		isPresenting = true;
		
		// Start time tracking
		startTimeTracking();
		
		// Wait for DOM to be ready if starting immediately after mount
		if (!presentationComponent) {
			console.log('Presentation component not ready, waiting...');
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		// Initialize Reveal.js
		if (presentationComponent && revealLoaded && (window as any).Reveal) {
			console.log('Initializing Reveal.js with component:', !!presentationComponent);
			const Reveal = (window as any).Reveal;
			revealInstance = new Reveal(presentationComponent, {
				hash: true,
				center: true,
				transition: 'slide',
				transitionSpeed: 'fast',
				backgroundTransition: 'slide',
				controls: false,
				progress: false,
				keyboard: true,
				touch: true,
				loop: false,
				rtl: false,
				navigationMode: 'default',
				shuffle: false,
				fragments: true,
				fragmentInURL: false,
				embedded: false,
				help: true,
				showNotes: false,
				autoSlide: 0,
				autoSlideStoppable: true,
				mouseWheel: false,
				hideInactiveCursor: true,
				hideCursorTime: 5000,
				previewLinks: false,
				focusBodyOnPageVisibilityChange: true,
				theme: 'white',
				parallaxBackgroundImage: '',
				parallaxBackgroundSize: '',
				parallaxBackgroundHorizontal: null,
				parallaxBackgroundVertical: null
			});
			
			await revealInstance.initialize();
			console.log('Reveal.js initialized successfully');
			
			// Jump to the first slide
			revealInstance.slide(0);
			currentSlide = 0;
			currentSlideNotes = slideNotes[0] || '';
			console.log('Jumped to first slide (slide 0)');
			
			// Send slide change update to controllers
			updateSlide();
			
			// Fullscreen will be triggered on first user interaction
			
			// Listen for slide changes
			revealInstance.addEventListener('slidechanged', (event: any) => {
				const newSlideIndex = event.indexh;
				
				// Determine navigation direction
				if (newSlideIndex > previousSlideIndex) {
					navigationDirection = 'next';
				} else if (newSlideIndex < previousSlideIndex) {
					navigationDirection = 'prev';
				} else {
					navigationDirection = null; // Same slide or initial load
				}
				
				currentSlide = newSlideIndex;
				previousSlideIndex = newSlideIndex;
				
				// Update current slide notes
				currentSlideNotes = slideNotes[currentSlide] || '';
				updateSlide();
				
				// Reset keyboard navigation flag
				isChangingSlide = false;
				
				// Animate slide content with Anime.js
				const currentSlideElement = revealInstance.getCurrentSlide();
				if (currentSlideElement) {
					// Apply entrance animations to slide content with direction awareness
					// (Each slide change creates fresh animations, no need to clear previous ones)
					animationUtils.animateSlideContent(currentSlideElement, navigationDirection);
				}
				
				// Trigger confetti on the last slide
				const currentSlideIndex = revealInstance.getIndices().h;
				const isLastSlideByIndex = currentSlideIndex === totalSlides - 1;
				const isLastSlideByAttribute = currentSlideElement && currentSlideElement.getAttribute('data-slide') === 'last';
				
				console.log('Slide detection:', {
					currentSlideIndex,
					totalSlides,
					isLastSlideByIndex,
					isLastSlideByAttribute,
					dataSlideAttr: currentSlideElement?.getAttribute('data-slide'),
					confettiTriggered
				});
				
				if ((isLastSlideByAttribute || isLastSlideByIndex) && !confettiTriggered) {
					console.log('🎆 Triggering confetti!');
					confettiTriggered = true;
					triggerConfetti();
				} else if (!isLastSlideByAttribute && !isLastSlideByIndex) {
					// Reset confetti flag when leaving the last slide
					confettiTriggered = false;
				}
			});
			
			// Listen for fragment animations
			revealInstance.addEventListener('fragmentshown', (event: any) => {
				const fragment = event.fragment;
				if (fragment) {
					// Animate the fragment that just appeared
					animate({
						targets: fragment,
						opacity: [0, 1],
						scale: [0.9, 1],
						duration: 400,
						easing: 'easeOutQuad'
					});
				}
			});
			
			revealInstance.addEventListener('fragmenthidden', (event: any) => {
				const fragment = event.fragment;
				if (fragment) {
					// Animate the fragment that just disappeared
					animate({
						targets: fragment,
						opacity: [1, 0],
						scale: [1, 0.9],
						duration: 300,
						easing: 'easeInQuad'
					});
				}
			});
		} else {
			console.log('Failed to initialize Reveal.js - missing dependencies:', {
				presentationComponent: !!presentationComponent,
				revealLoaded,
				Reveal: !!(window as any).Reveal
			});
		}
		
		// Initialize presenter session with Socket.IO
		if (socketManager && slides) {
			await socketManager.initPresenter(slides, totalSlides);
		}

		// Socket.IO connection will handle all real-time updates:
		// - Session data via handleSessionState
		// - Commands via handleCommand
		// - Lesson updates via handleLessonUpdate
		// - Controller count via handleControllerCount
	}

	async function stopLesson() {
		isPresenting = false;
		
		// Destroy Reveal.js instance
		if (revealInstance) {
			revealInstance.destroy();
			revealInstance = null;
		}
		
		// Clear intervals (now handled by WebSocket connection)
		stopTimeTracking();
		
		// Clean up session will be handled by Socket.IO disconnect
		
		// Generate new session
		sessionCode = generateCode();
		const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
		qrUrl = `${baseUrl}/connect?code=${sessionCode}`;
		connectedDevices = 0;
		currentSlide = 0;
		confettiTriggered = false;
	}

	function handleRemoteCommand(command: string) {
		switch (command) {
			case 'next':
				nextSlide();
				break;
			case 'prev':
				prevSlide();
				break;
			case 'first':
				firstSlide();
				break;
			case 'last':
				lastSlide();
				break;
			case 'second-to-last':
				secondToLastSlide();
				break;
		}
	}

	function firstSlide() {
		if (revealInstance) {
			revealInstance.slide(0);
		}
	}

	function lastSlide() {
		if (revealInstance) {
			revealInstance.slide(totalSlides - 1);
		}
	}

	function secondToLastSlide() {
		if (revealInstance && totalSlides > 1) {
			revealInstance.slide(totalSlides - 2);
		}
	}

	function nextSlide() {
		if (revealInstance) {
			revealInstance.next();
		}
	}

	function prevSlide() {
		if (revealInstance) {
			revealInstance.prev();
		}
	}

	async function updateSlide() {
		if (!isPresenting || !socketManager) return;
		
		await socketManager.sendSlideChange(currentSlide, totalSlides);
	}

	function copyCode() {
		navigator.clipboard.writeText(sessionCode);
	}

	function copyUrl() {
		navigator.clipboard.writeText(qrUrl);
	}

	function toggleHighContrast() {
		highContrastMode = !highContrastMode;
	}

	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
			} else {
				await requestFullscreen();
			}
		} catch (error) {
			console.error('Error toggling fullscreen:', error);
		}
	}

	function handleFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;
	}

	function triggerConfetti() {
		console.log('Triggering SVG confetti!');
		
		// Create SVG container
		const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svgElement.style.position = 'fixed';
		svgElement.style.top = '0';
		svgElement.style.left = '0';
		svgElement.style.width = '100%';
		svgElement.style.height = '100%';
		svgElement.style.pointerEvents = 'none';
		svgElement.style.zIndex = '9999';
		svgElement.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
		document.body.appendChild(svgElement);
		
		const colors = ['#ffa94d', '#3ba39b', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#fd79a8', '#6c5ce7'];
		
		// Create 3 explosion points
		const explosionPoints = [
			{ x: window.innerWidth * 0.3, y: window.innerHeight * 0.3 },
			{ x: window.innerWidth * 0.7, y: window.innerHeight * 0.4 },
			{ x: window.innerWidth * 0.5, y: window.innerHeight * 0.6 }
		];
		
		const confettiPieces: SVGElement[] = [];
		
		explosionPoints.forEach((point, explosionIndex) => {
			for (let i = 0; i < 25; i++) {
				// Create different shapes randomly
				let shape: SVGElement;
				const shapeType = Math.floor(Math.random() * 3);
				const color = colors[Math.floor(Math.random() * colors.length)];
				
				if (shapeType === 0) {
					// Circle
					shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
					shape.setAttribute('r', '8');
					shape.setAttribute('cx', point.x.toString());
					shape.setAttribute('cy', point.y.toString());
				} else if (shapeType === 1) {
					// Rectangle
					shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
					shape.setAttribute('width', '12');
					shape.setAttribute('height', '8');
					shape.setAttribute('x', (point.x - 6).toString());
					shape.setAttribute('y', (point.y - 4).toString());
					shape.setAttribute('rx', '2');
				} else {
					// Triangle (polygon)
					shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
					const points = `${point.x},${point.y-8} ${point.x-8},${point.y+6} ${point.x+8},${point.y+6}`;
					shape.setAttribute('points', points);
				}
				
				shape.setAttribute('fill', color);
				shape.setAttribute('stroke', 'rgba(255,255,255,0.5)');
				shape.setAttribute('stroke-width', '1');
				shape.style.opacity = '1';
				
				svgElement.appendChild(shape);
				confettiPieces.push(shape);
			}
		});
		
		console.log(`Created ${confettiPieces.length} SVG confetti pieces`);
		
		// Animate using CSS animations and transforms
		confettiPieces.forEach((piece, index) => {
			const centerX = explosionPoints[Math.floor(index / 25)].x;
			const centerY = explosionPoints[Math.floor(index / 25)].y;
			
			// Random animation properties
			const endX = centerX + (Math.random() - 0.5) * 600;
			const endY = centerY + Math.random() * 600 + 200;
			const rotation = Math.random() * 720; // Multiple rotations
			const duration = 2000 + Math.random() * 1000; // Varying durations
			
			// Set transform origin to the center of the shape
			piece.style.transformOrigin = `${centerX}px ${centerY}px`;
			
			// Apply CSS animation
			piece.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${duration}ms ease-out`;
			
			// Start animation on next frame
			requestAnimationFrame(() => {
				piece.style.transform = `translate(${endX - centerX}px, ${endY - centerY}px) rotate(${rotation}deg) scale(0.5)`;
				piece.style.opacity = '0';
			});
		});
		
		// Clean up after animation
		setTimeout(() => {
			svgElement.remove();
			console.log('SVG confetti animation complete');
		}, 4000);
		
		// Add celebration text animation
		const celebrationText = document.createElement('div');
		celebrationText.textContent = '🎉 Presentation Complete! 🎉';
		celebrationText.style.position = 'fixed';
		celebrationText.style.top = '40%';
		celebrationText.style.left = '50%';
		celebrationText.style.transform = 'translate(-50%, -50%) scale(0.5)';
		celebrationText.style.fontSize = '2.5rem';
		celebrationText.style.fontWeight = 'bold';
		celebrationText.style.color = '#333';
		celebrationText.style.textAlign = 'center';
		celebrationText.style.zIndex = '10000';
		celebrationText.style.pointerEvents = 'none';
		celebrationText.style.opacity = '0';
		document.body.appendChild(celebrationText);
		
		// Animate celebration text with CSS fallback
		console.log('Animating celebration text');
		
		try {
			// Try anime.js v4 animation
			animate(celebrationText, {
				opacity: [
					{ from: 0, to: 1, duration: 1000, ease: 'outElastic(1)' }
				],
				scale: [
					{ from: 0.5, to: 1.1, duration: 500, ease: 'outElastic(1)' },
					{ from: 1.1, to: 1, duration: 500, ease: 'outElastic(1)' }
				],
				rotate: [
					{ from: -5, to: 5, duration: 500, ease: 'outElastic(1)' },
					{ from: 5, to: 0, duration: 500, ease: 'outElastic(1)' }
				],
				onComplete: () => {
					console.log('Celebration text animation completed');
					setTimeout(() => {
						animate(celebrationText, {
							opacity: [
								{ from: 1, to: 0, duration: 800, ease: 'out(2)' }
							],
							scale: [
								{ from: 1, to: 0.8, duration: 800, ease: 'out(2)' }
							],
							onComplete: () => {
								if (celebrationText.parentNode) {
									celebrationText.parentNode.removeChild(celebrationText);
								}
							}
						});
					}, 2500);
				}
			});
		} catch (error) {
			console.warn('Anime.js celebration text failed, using CSS fallback:', error);
			
			// CSS fallback animation
			celebrationText.style.transition = 'all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
			
			requestAnimationFrame(() => {
				celebrationText.style.opacity = '1';
				celebrationText.style.transform = 'translate(-50%, -50%) scale(1)';
			});
			
			// Fade out after delay
			setTimeout(() => {
				celebrationText.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
				celebrationText.style.opacity = '0';
				celebrationText.style.transform = 'translate(-50%, -50%) scale(0.8)';
				
				setTimeout(() => {
					if (celebrationText.parentNode) {
						celebrationText.parentNode.removeChild(celebrationText);
					}
				}, 800);
			}, 2500);
		}
	}


	function handleSlideClick(event: MouseEvent) {
		// Auto-fullscreen on first click
		if (autoFullscreenOnFirstClick && !document.fullscreenElement) {
			autoFullscreenOnFirstClick = false;
			requestFullscreen();
		}
		
		// General click handler for the slides container
		const target = event.target as HTMLElement;
		// Only handle clicks on the slides container itself, not its children
		if (target.classList.contains('slides-container')) {
			// Determine which side was clicked
			const rect = target.getBoundingClientRect();
			const clickX = event.clientX - rect.left;
			const middleX = rect.width / 2;
			
			if (clickX < middleX) {
				prevSlide();
			} else {
				nextSlide();
			}
		}
	}
</script>

<div class="connect-container">
	{#if !isPresenting}
		<h1>🖥️ Presentatie Gereed</h1>
		<p>Verbind je telefoon om de presentatie te starten</p>
		
		<div class="setup-section">
			<div class="code-section">
				<span class="code-label">Sessiecode:</span>
				<span class="code-value">{sessionCode}</span>
				<button class="copy-btn" on:click={copyCode}>📋</button>
			</div>
			
			<div class="qr-section">
				{#if qrUrl}
					<QrCode value={qrUrl} size={200} />
					<div class="qr-info">
						<p>Scan deze QR code met je telefoon</p>
						<p>of ga naar: <code>/connect</code> en voer de code in</p>
					</div>
				{/if}
			</div>
			
			<div class="connection-status">
				<div class="status-indicator">
					<div class="pulse-dot"></div>
					<span>Wachten op verbinding...</span>
				</div>
				<p class="status-text">Presentatie start automatisch zodra je telefoon verbindt</p>
			</div>
		</div>
	{:else}
		<div class="presentation-mode">
			<!-- Workshop time progress bar at top -->
			<div class="workshop-time-bar">
				<div class="workshop-time-fill" style="width: {workshopTimeProgress}%"></div>
			</div>
			
			<div class="control-bar">
				<div class="logo-container">
					<img src="/toekomst_logo.svg" alt="Toekomst Logo" class="logo" />
				</div>
				<div class="workshop-info">
					{#if workshopData && (workshopData.schoolName || workshopData.school)}
						<span class="school-name">{workshopData.schoolName || 'Onbekende school'}</span>
						{#if workshopData.group}
							<span class="class-name">{workshopData.group}</span>
						{/if}
					{/if}
				</div>
				<div class="controls-group">
					<span class="session-code">{sessionCode}</span>
					{#if !isWebSocketConnected}
						<span class="connection-status">HTTP</span>
					{/if}
					<button class="fullscreen-btn" class:active={isFullscreen} on:click={toggleFullscreen} title="Volledig scherm">
						{#if isFullscreen}⤓{:else}⤢{/if}
					</button>
					<button class="contrast-btn" on:click={toggleHighContrast} class:active={highContrastMode}>
						{#if highContrastMode}🔆{:else}☀️{/if}
					</button>
				</div>
			</div>
			
			<div class="slides-container" class:high-contrast={highContrastMode} on:click={handleSlideClick}>
				<div class="reveal" bind:this={presentationComponent}>
					<div class="slides">
						{#if parsedSlides.length > 0}
							{#each parsedSlides as slideContent, index}
								<section>
									<div class="slide-content">
										{@html marked(slideContent)}
									</div>
								</section>
							{/each}
							<section data-slide="last">
								<div class="slide-content last-slide">
									<h1>🎆 Einde van de workshop</h1>
									<h2>Thuis verder?</h2>
									<div class="game-link">
										<a href="https://game.toekomst.school" target="_blank">game.toekomst.school</a>
									</div>
								</div>
							</section>
						{:else}
							<section>
								<div class="slide-content">
									<h1>📚 Welkom bij de Les</h1>
									<h2>Introductie</h2>
									<ul>
										<li>Vandaag gaan we leren over...</li>
										<li>Belangrijke concepten</li>
										<li>Praktische voorbeelden</li>
									</ul>
								</div>
							</section>
						{/if}
					</div>
				</div>
				
				<!-- Click areas for navigation -->
				<div class="nav-area nav-area-left" on:click|stopPropagation={prevSlide}></div>
				<div class="nav-area nav-area-right" on:click|stopPropagation={nextSlide}></div>
			</div>
			
			<!-- Progress bar at bottom -->
			<div class="progress-bar">
				<div class="progress-fill" style="width: {totalSlides > 0 ? ((currentSlide + 1) / totalSlides) * 100 : 0}%"></div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Hide slide content before animation */
	.reveal .slides section h1,
	.reveal .slides section h2,
	.reveal .slides section h3,
	.reveal .slides section h4,
	.reveal .slides section h5,
	.reveal .slides section h6,
	.reveal .slides section p,
	.reveal .slides section li,
	.reveal .slides section img,
	.reveal .slides section pre,
	.reveal .slides section code {
		opacity: 0;
		transform: translateY(20px);
		transition: none; /* Disable default transitions to let anime.js handle them */
	}
	
	/* Show elements that shouldn't be animated */
	.reveal .slides section .no-animate {
		opacity: 1 !important;
		transform: none !important;
	}
	
	.connect-container {
		min-height: 100vh;
		background: 
			linear-gradient(135deg, #1d1f20 0%, #2a2d2e 50%, #1d1f20 100%),
			radial-gradient(ellipse at top, rgba(59, 163, 155, 0.1) 0%, transparent 50%),
			radial-gradient(ellipse at bottom, rgba(255, 169, 77, 0.05) 0%, transparent 50%);
		padding: 2rem;
		color: #b2b2a2;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
	}

	.connect-container h1 {
		font-size: 2.5rem;
		text-align: center;
		margin-bottom: 1rem;
		font-weight: 700;
		color: #3ba39b;
		font-family: 'Orbitron', 'Bebas Neue', Arial, sans-serif;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-shadow: 0 0 20px rgba(59, 163, 155, 0.3);
	}

	.connect-container p {
		text-align: center;
		font-size: 1.2rem;
		margin-bottom: 2rem;
		opacity: 0.9;
		color: #b2b2a2;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
	}

	.setup-section {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.code-section {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: white;
		color: #333;
		padding: 1rem 2rem;
		border-radius: 15px;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
	}

	.code-label {
		font-size: 1.2rem;
		font-weight: 600;
	}

	.code-value {
		font-family: monospace;
		font-size: 2rem;
		letter-spacing: 0.3em;
		color: #3ba39b;
		background: #f0f0f0;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		font-weight: bold;
	}

	.copy-btn {
		background: #3ba39b;
		color: white;
		border: none;
		padding: 0.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1.2rem;
		transition: background 0.3s ease;
	}

	.copy-btn:hover {
		background: #2d8a7f;
	}

	.qr-section {
		background: white;
		padding: 2rem;
		border-radius: 15px;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.qr-info {
		text-align: center;
		color: #666;
	}

	.qr-info p {
		margin: 0.5rem 0;
		font-size: 1rem;
	}

	.qr-info code {
		background: #f0f0f0;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-family: monospace;
		color: #3ba39b;
	}

	.connection-status {
		text-align: center;
		padding: 2rem;
		background: rgba(59, 163, 155, 0.1);
		border-radius: 15px;
		border: 1px solid rgba(59, 163, 155, 0.3);
	}

	.status-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1rem;
		font-size: 1.2rem;
		font-weight: 600;
		color: #3ba39b;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
	}

	.pulse-dot {
		width: 12px;
		height: 12px;
		background: #3ba39b;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}

	.status-text {
		color: #b2b2a2;
		font-size: 1rem;
		margin: 0;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
	}

	@keyframes pulse {
		0% {
			transform: scale(0.95);
			box-shadow: 0 0 0 0 rgba(59, 163, 155, 0.7);
		}
		70% {
			transform: scale(1);
			box-shadow: 0 0 0 10px rgba(59, 163, 155, 0);
		}
		100% {
			transform: scale(0.95);
			box-shadow: 0 0 0 0 rgba(59, 163, 155, 0);
		}
	}

	.start-btn {
		background: #2ecc71;
		color: white;
		border: none;
		padding: 1rem 2rem;
		border-radius: 12px;
		font-size: 1.3rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.3s ease;
		box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
	}

	.start-btn:hover {
		background: #27ae60;
		transform: translateY(-2px);
	}

	.presentation-mode {
		height: 100vh;
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
	}

	.workshop-time-bar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(178, 178, 162, 0.3);
		z-index: 10001;
		overflow: hidden;
	}

	.workshop-time-fill {
		height: 100%;
		background: linear-gradient(90deg, #3ba39b 0%, #ffa94d 100%);
		transition: width 1s ease;
		box-shadow: 0 0 4px rgba(59, 163, 155, 0.6);
	}

	.workshop-time-info {
		position: fixed;
		top: 8px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		padding: 0 1rem;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
		font-size: 0.8rem;
		color: #b2b2a2;
		z-index: 10002;
		pointer-events: none;
	}

	.time-start, .time-end {
		font-weight: 600;
		color: #3ba39b;
	}

	.time-current {
		font-weight: 700;
		color: #ffa94d;
		text-shadow: 0 0 4px rgba(255, 169, 77, 0.6);
	}

	.control-bar {
		background: linear-gradient(135deg, #1d1f20 0%, #2a2d2e 100%);
		color: #b2b2a2;
		padding: 1rem 2rem;
		border-radius: 15px;
		margin-bottom: 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(59, 163, 155, 0.2);
		flex-wrap: wrap;
		gap: 1rem;
	}

	.logo-container {
		display: flex;
		align-items: center;
	}

	.logo {
		height: 2.5rem;
		width: auto;
	}

	.workshop-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
		color: #b2b2a2;
	}

	.school-name {
		font-weight: 400;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		opacity: 0.7;
	}

	.class-name {
		font-weight: 500;
		font-size: 0.9rem;
		color: #ffa94d;
	}

	.session-fallback {
		font-weight: 600;
		color: #b2b2a2;
	}

	.session-code {
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
		font-size: 0.9rem;
		font-weight: 600;
		color: #b2b2a2;
		background: rgba(59, 163, 155, 0.1);
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		border: 1px solid rgba(59, 163, 155, 0.3);
	}
	
	.connection-status {
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
		font-size: 0.8rem;
		font-weight: 500;
		color: #888;
		background: rgba(136, 136, 136, 0.1);
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		border: 1px solid rgba(136, 136, 136, 0.2);
	}

	.controls-group {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.progress-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(178, 178, 162, 0.3);
		z-index: 10000;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #3ba39b 0%, #ffa94d 100%);
		transition: width 0.3s ease;
		box-shadow: 0 0 4px rgba(59, 163, 155, 0.6);
	}

	.contrast-btn {
		background: linear-gradient(135deg, #6e5849 0%, #5a453a 100%);
		color: #b2b2a2;
		border: 1px solid rgba(178, 178, 162, 0.3);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all 0.3s ease;
		font-size: 0.9rem;
	}

	.contrast-btn:hover {
		background: linear-gradient(135deg, #3ba39b 0%, #2d8a7f 100%);
		color: #1d1f20;
		box-shadow: 0 0 15px rgba(59, 163, 155, 0.4);
	}

	.contrast-btn.active {
		background: linear-gradient(135deg, #ffa94d 0%, #e6942a 100%);
		color: #1d1f20;
		box-shadow: 0 0 15px rgba(255, 169, 77, 0.6);
	}

	.fullscreen-btn {
		background: linear-gradient(135deg, #6e5849 0%, #5a453a 100%);
		color: #b2b2a2;
		border: 1px solid rgba(178, 178, 162, 0.3);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all 0.3s ease;
		font-size: 0.9rem;
	}

	.fullscreen-btn:hover {
		background: linear-gradient(135deg, #3ba39b 0%, #2d8a7f 100%);
		color: #1d1f20;
		box-shadow: 0 0 15px rgba(59, 163, 155, 0.4);
	}

	.fullscreen-btn.active {
		background: linear-gradient(135deg, #ffa94d 0%, #e6942a 100%);
		color: #1d1f20;
		box-shadow: 0 0 15px rgba(255, 169, 77, 0.6);
	}

	.last-slide {
		text-align: center;
		padding: 3rem 2rem;
	}

	.last-slide h1 {
		font-size: 3rem;
		color: var(--warning);
		margin-bottom: 1rem;
	}

	.last-slide h2 {
		font-size: 2.5rem;
		color: var(--accent);
		margin-bottom: 3rem;
	}

	.game-link {
		display: inline-block;
		padding: 1.5rem 2rem;
		background: var(--warning);
		border-radius: 15px;
		margin: 2rem auto;
		min-width: fit-content;
		width: auto;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		transform: scale(1) rotate(3deg);
		transition: all 0.3s ease;
		animation: game-button-pulse 2s ease-in-out infinite;
	}

	.game-link:hover {
		transform: scale(1.1) rotate(3deg);
		box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
		animation-play-state: paused;
	}

	.game-link a {
		color: black;
		font-size: 2.2rem;
		font-weight: bold;
		text-decoration: none;
		font-family: 'Orbitron', 'Bebas Neue', Arial, sans-serif;
		letter-spacing: 0.1em;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
	}

	@keyframes game-button-pulse {
		0% { 
			transform: scale(1) rotate(3deg);
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		}
		50% { 
			transform: scale(1.05) rotate(3deg);
			box-shadow: 0 15px 40px rgba(234, 179, 8, 0.4);
		}
		100% { 
			transform: scale(1) rotate(3deg);
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		}
	}

	:global(.confetti-container) {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 9999;
		overflow: hidden;
	}

	:global(.confetti-piece) {
		position: absolute;
		width: 8px;
		height: 8px;
		background: #ffa94d;
		animation: confetti-explode ease-out forwards;
		opacity: 1;
		transform: translate(-50%, -50%);
	}

	:global(.confetti-piece):nth-child(odd) {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	:global(.confetti-piece):nth-child(even) {
		width: 6px;
		height: 12px;
		border-radius: 2px;
	}

	:global(.confetti-piece):nth-child(3n) {
		width: 12px;
		height: 6px;
		border-radius: 2px;
	}

	:global(.confetti-piece):nth-child(4n) {
		width: 8px;
		height: 8px;
		border-radius: 1px;
		transform: translate(-50%, -50%) rotate(45deg);
	}

	@keyframes confetti-explode {
		0% {
			transform: translate(-50%, -50%) scale(0) rotate(0deg);
			opacity: 1;
		}
		15% {
			transform: translate(calc(-50% + var(--end-x) * 0.3), calc(-50% + var(--end-y) * 0.3)) scale(1.2) rotate(180deg);
			opacity: 1;
		}
		100% {
			transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0.3) rotate(720deg);
			opacity: 0;
		}
	}

	.nav-area {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 50%;
		z-index: 10;
		cursor: pointer;
		background: transparent;
	}

	.nav-area-left {
		left: 0;
	}

	.nav-area-right {
		right: 0;
	}

	.slide-content h1,
	.slides-container :global(.reveal h1),
	.slides-container :global(.reveal .slides section h1) {
		font-size: 3rem !important;
		margin-bottom: 1.5rem !important;
		color: #ffa94d !important;
		font-family: 'Orbitron', 'Bebas Neue', Arial, sans-serif !important;
		font-weight: 700 !important;
		text-transform: uppercase !important;
		letter-spacing: 0.1em !important;
		text-shadow: 0 0 20px rgba(255, 169, 77, 0.6), 0 2px 4px rgba(0, 0, 0, 0.5) !important;
	}

	.slide-content h2,
	.slides-container :global(.reveal h2),
	.slides-container :global(.reveal .slides section h2) {
		font-size: 2.2rem !important;
		margin-bottom: 1.5rem !important;
		color: #ffa94d !important;
		font-family: 'Orbitron', 'Bebas Neue', Arial, sans-serif !important;
		font-weight: 600 !important;
		text-transform: uppercase !important;
		letter-spacing: 0.05em !important;
		text-shadow: 0 0 15px rgba(255, 169, 77, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3) !important;
	}

	.slide-content h3,
	.slides-container :global(.reveal h3),
	.slides-container :global(.reveal .slides section h3) {
		font-size: 1.8rem !important;
		margin-bottom: 1rem !important;
		color: #ffa94d !important;
		font-family: 'Orbitron', 'Bebas Neue', Arial, sans-serif !important;
		font-weight: 500 !important;
		text-shadow: 0 0 10px rgba(255, 169, 77, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3) !important;
	}

	.slide-content p {
		font-size: 1.4rem;
		margin-bottom: 1.5rem;
		line-height: 1.7;
		color: #b2b2a2;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
		font-weight: 400;
	}

	.slide-content ul {
		font-size: 1.3rem;
		line-height: 1.8;
		text-align: left;
		max-width: 700px;
		margin: 0 auto;
		color: #b2b2a2;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
	}

	.slide-content li {
		margin-bottom: 0.8rem;
		position: relative;
		padding-left: 1.5rem;
	}

	.slide-content li::before {
		content: '▶';
		position: absolute;
		left: 0;
		color: #3ba39b;
		font-size: 0.8em;
	}

	.slide-content blockquote {
		font-size: 1.5rem;
		font-style: italic;
		color: #6e5849;
		border-left: 4px solid #3ba39b;
		background: rgba(59, 163, 155, 0.05);
		padding: 1.5rem;
		margin: 2rem 0;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace;
		border-radius: 4px;
	}

	.slide-content strong {
		color: #ffa94d;
		font-weight: 600;
	}

	.slide-content em {
		color: #3ba39b;
		font-style: italic;
	}


	.slides-container {
		flex: 1;
		background: linear-gradient(135deg, #1d1f20 0%, #2a2d2e 100%);
		border-radius: 15px;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		min-height: 600px;
		cursor: pointer;
		border: 1px solid rgba(59, 163, 155, 0.2);
		transition: all 0.3s ease;
	}

	.slides-container.high-contrast {
		background: #ffffff !important;
		border: 3px solid #000000 !important;
		box-shadow: 0 0 30px rgba(0, 0, 0, 0.3) !important;
	}

	.slides-container :global(.reveal) {
		width: 100%;
		height: 100%;
	}

	.slide-content {
		text-align: center;
		padding: 3rem;
		color: #b2b2a2;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background: radial-gradient(ellipse at center, rgba(59, 163, 155, 0.03) 0%, transparent 70%);
		position: relative;
		transition: all 0.3s ease;
	}

	.slide-content::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: 
			linear-gradient(90deg, transparent 0%, rgba(59, 163, 155, 0.02) 50%, transparent 100%),
			linear-gradient(0deg, transparent 0%, rgba(29, 31, 32, 0.1) 100%);
		pointer-events: none;
		transition: opacity 0.3s ease;
	}

	.slides-container.high-contrast .slide-content {
		background: #ffffff !important;
		color: #000000 !important;
	}

	.slides-container.high-contrast .slide-content::before {
		opacity: 0 !important;
	}

	/* High contrast mode overrides for all text elements */
	.slides-container.high-contrast .slide-content h1,
	.slides-container.high-contrast :global(.reveal h1),
	.slides-container.high-contrast :global(.reveal .slides section h1) {
		color: #000000 !important;
		font-size: 4rem !important;
		font-weight: 900 !important;
		text-shadow: 
			0 0 2px #ffffff,
			0 0 4px #ffffff,
			0 2px 8px #ffffff,
			0 4px 16px #ffffff !important;
		text-stroke: 2px #ffffff;
		-webkit-text-stroke: 2px #ffffff;
	}

	.slides-container.high-contrast .slide-content h2,
	.slides-container.high-contrast :global(.reveal h2),
	.slides-container.high-contrast :global(.reveal .slides section h2) {
		color: #000000 !important;
		font-size: 3rem !important;
		font-weight: 800 !important;
		text-shadow: 
			0 0 2px #ffffff,
			0 0 4px #ffffff,
			0 2px 8px #ffffff !important;
		text-stroke: 1px #ffffff;
		-webkit-text-stroke: 1px #ffffff;
	}

	.slides-container.high-contrast .slide-content h3,
	.slides-container.high-contrast :global(.reveal h3),
	.slides-container.high-contrast :global(.reveal .slides section h3) {
		color: #000000 !important;
		font-size: 2.5rem !important;
		font-weight: 700 !important;
		text-shadow: 
			0 0 2px #ffffff,
			0 0 4px #ffffff,
			0 2px 8px #ffffff !important;
		text-stroke: 1px #ffffff;
		-webkit-text-stroke: 1px #ffffff;
	}

	.slides-container.high-contrast .slide-content p,
	.slides-container.high-contrast :global(.reveal p),
	.slides-container.high-contrast :global(.reveal .slides section p) {
		color: #000000 !important;
		font-size: 2rem !important;
		font-weight: 600 !important;
		text-shadow: 
			0 0 2px #ffffff,
			0 2px 4px #ffffff !important;
	}

	.slides-container.high-contrast .slide-content ul,
	.slides-container.high-contrast .slide-content li,
	.slides-container.high-contrast :global(.reveal ul),
	.slides-container.high-contrast :global(.reveal li) {
		color: #000000 !important;
		font-size: 1.8rem !important;
		font-weight: 600 !important;
		text-shadow: 
			0 0 2px #ffffff,
			0 2px 4px #ffffff !important;
	}

	.slides-container.high-contrast .slide-content strong,
	.slides-container.high-contrast :global(.reveal strong) {
		color: #000000 !important;
		font-weight: 900 !important;
	}

	.slides-container.high-contrast .slide-content em,
	.slides-container.high-contrast :global(.reveal em) {
		color: #000000 !important;
		font-weight: 700 !important;
	}


	.qr-display {
		margin-top: 2rem;
		padding: 1.5rem;
		background: rgba(29, 31, 32, 0.8);
		border: 1px solid rgba(59, 163, 155, 0.3);
		border-radius: 10px;
		display: inline-block;
		backdrop-filter: blur(10px);
	}

	.qr-display p {
		color: #b2b2a2 !important;
		font-family: 'IBM Plex Mono', 'Space Mono', monospace !important;
		margin-bottom: 1rem !important;
	}

	@media (max-width: 768px) {
		.control-bar {
			flex-direction: column;
			gap: 1rem;
		}

		.session-info {
			flex-direction: column;
			gap: 0.5rem;
		}

		.code-section {
			flex-direction: column;
			gap: 1rem;
		}
	}

</style>
