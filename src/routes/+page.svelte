<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Gamepad2, Users, Laptop, Star, Instagram, Linkedin, Youtube, TrendingUp, Sparkles, Code, Cpu, Wifi, Smartphone, Monitor, Headphones, Camera, Zap, GraduationCap, Heart, Gift, BookOpen } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { animate } from 'animejs';
	
	
	// Smooth scroll to section
	function scrollToSection(sectionId: string) {
		document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
	}
	
	// Typewriter animation
	let typewriterText = '';
	let isTyping = false;
	
	// Modal state
	let isModalOpen = false;
	let selectedNiveau: any = null;
	
	// Counter animation
	let currentCount = 0;
	
	const niveauData = [
		{
			id: 1,
			title: "Digitale Toegankelijkheid",
			subtitle: "Voor iedereen die ondersteuning nodig heeft bij computergebruik",
			description: "Speciaal ontwikkeld voor mensen die om verschillende redenen afstand ervaren tot computers en technologie. Of je nu een beperking hebt, moeite hebt met technologie door leeftijd, angst, of andere uitdagingen - wij zorgen ervoor dat ook jij mee kunt doen in de digitale wereld.",
			skills: [
				"Computer bedienen op een manier die voor jou werkt",
				"Veilig internetten en emailen",
				"Contact houden met familie en vrienden digitaal",
				"Belangrijke online diensten gebruiken (DigiD, zorgverleners)",
				"Hulpmiddelen ontdekken die jouw leven makkelijker maken"
			],
			buttonText: "Meer over Niveau 1"
		},
		{
			id: 2,
			title: "Digitale Basisvaardigheden",
			subtitle: "Gebaseerd op de Nederlandse SLO-leerlijn",
			description: "Hier leer je de digitale vaardigheden die aansluiten bij het Nederlandse onderwijs voor basisschool en voortgezet onderwijs. Perfect voor leerlingen, ouders en iedereen die deze belangrijke vaardigheden wil ontwikkelen.",
			skills: [
				"Tekstverwerking en presentaties maken",
				"Basis programmeren (Scratch, HTML)",
				"Digitale geletterdheid en mediawijsheid",
				"Veilig en effectief onderzoek doen online",
				"Creatief werken met digitale media"
			],
			buttonText: "Bekijk Lesprogramma's"
		},
		{
			id: 3,
			title: "Digitale\nUitvinders",
			subtitle: "Nerds(neurodiversen) en alle andere knutselaars welkom!",
			description: "Hier duiken we diep de technologie in. Perfect voor mensen die helemaal opgaan in techniek en echt willen begrijpen hoe dingen werken.",
			skills: [
				"Ethisch hacken en cybersecurity",
				"Hardware bouwen en aanpassen",
				"Geavanceerd programmeren",
				"Robotica en AI-projecten",
				"3D printen en makerspace vaardigheden"
			],
			buttonText: "Ontdek Digitale\nUitvinders"
		}
	];
	
	function openModal(niveau: any) {
		selectedNiveau = niveau;
		isModalOpen = true;
	}
	
	function closeModal() {
		isModalOpen = false;
		selectedNiveau = null;
	}
	
	const texts = [
		'Ontdek jouw plaats in de digitale wereld',
		'Samen bouwen we aan een toekomst waar iedereen kan meedoen',
		'inclusief technologie-onderwijs mogelijk voor iedereen, ongeacht achtergrond of ervaring'
	];
	
	let currentTextIndex = 0;
	
	async function typeText(text: string, speed = 50) {
		isTyping = true;
		typewriterText = '';
		
		for (let i = 0; i <= text.length; i++) {
			typewriterText = text.slice(0, i);
			await new Promise(resolve => setTimeout(resolve, speed));
		}
		
		isTyping = false;
		
		// Wait before starting to delete
		await new Promise(resolve => setTimeout(resolve, 3000));
		
		// Delete text
		for (let i = text.length; i >= 0; i--) {
			typewriterText = text.slice(0, i);
			await new Promise(resolve => setTimeout(resolve, 30));
		}
		
		// Move to next text
		currentTextIndex = (currentTextIndex + 1) % texts.length;
		
		// Wait before starting next text
		await new Promise(resolve => setTimeout(resolve, 500));
		
		// Start typing next text
		typeText(texts[currentTextIndex]);
	}

	// Animate levels on mount
	onMount(() => {
		// Start typewriter animation
		typeText(texts[0]);
		
		// Set up scroll-triggered counter animation
		let hasCounterAnimated = false;
		
		const setupCounterAnimation = () => {
			const counterElement = document.querySelector('.counter-section');
			if (!counterElement) return;
			
			const observer = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !hasCounterAnimated) {
						hasCounterAnimated = true;
						
						console.log('Counter animation triggered!');
						
						// Calculate target value: 48 * day of week (Monday=1, Sunday=7)
						const today = new Date();
						const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.
						const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert Sunday to 7
						const targetValue = 48 * adjustedDay;
						
						console.log('Day of week:', adjustedDay, 'Target value:', targetValue);
						
						// Use simple manual animation since anime.js is having issues
						const duration = 2000;
						const startTime = Date.now();
						
						const animateCounter = () => {
							const elapsed = Date.now() - startTime;
							const progress = Math.min(elapsed / duration, 1);
							
							// Easing function (ease out)
							const easeOut = 1 - Math.pow(1 - progress, 3);
							const value = Math.round(targetValue * easeOut);
							
							currentCount = value;
							
							if (progress < 1) {
								requestAnimationFrame(animateCounter);
							}
						};
						
						requestAnimationFrame(animateCounter);
						
						observer.disconnect();
					}
				});
			}, { threshold: 0.5 });
			
			observer.observe(counterElement);
		};
		
		// Set up counter animation after a short delay
		setTimeout(setupCounterAnimation, 100);
		
		// Set up mobile/tablet timeline animations
		if (window.innerWidth < 1024) {
			// Initially hide timeline cards
			const timelineCards = document.querySelectorAll('.timeline-card');
			const timelineDots = document.querySelectorAll('.timeline-dot');
			const timelineLine = document.querySelector('.timeline-line');
			
			timelineCards.forEach(card => {
				(card as HTMLElement).style.opacity = '0';
				(card as HTMLElement).style.transform = 'translateX(30px)';
			});
			
			timelineDots.forEach(dot => {
				(dot as HTMLElement).style.opacity = '0';
				(dot as HTMLElement).style.transform = 'scale(0)';
			});
			
			if (timelineLine) {
				(timelineLine as HTMLElement).style.height = '0%';
			}
			
			// Create intersection observer for mobile timeline animation
			const mobileObserver = new IntersectionObserver((entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						// First animate the timeline line
						if (timelineLine) {
							try {
								animate(timelineLine, {
									height: [
										{ from: '0%', to: '100%', duration: 1500, ease: 'out(3)' }
									]
								});
							} catch (error) {
								// Fallback animation
								(timelineLine as HTMLElement).style.transition = 'height 1.5s ease-out';
								(timelineLine as HTMLElement).style.height = '100%';
							}
						}
						
						// Then animate dots and cards in sequence
						const validDots = Array.from(timelineDots).filter(el => el && el.nodeType === Node.ELEMENT_NODE) as HTMLElement[];
						const validCards = Array.from(timelineCards).filter(el => el && el.nodeType === Node.ELEMENT_NODE) as HTMLElement[];
						
						// Animate dots
						if (validDots.length > 0) {
							try {
								animate(validDots, {
									opacity: [
										{ from: 0, to: 1, duration: 800, ease: 'out(3)' }
									],
									scale: [
										{ from: 0, to: 1, duration: 800, ease: 'out(3)' }
									],
									delay: (el: any, i: number) => 400 + (i * 300)
								});
							} catch (error) {
								// Fallback animation
								validDots.forEach((dot, i) => {
									setTimeout(() => {
										dot.style.transition = 'all 0.8s ease-out';
										dot.style.opacity = '1';
										dot.style.transform = 'scale(1)';
									}, 400 + (i * 300));
								});
							}
						}
						
						// Animate cards
						if (validCards.length > 0) {
							try {
								animate(validCards, {
									opacity: [
										{ from: 0, to: 1, duration: 1000, ease: 'out(3)' }
									],
									x: [
										{ from: 30, to: 0, duration: 1000, ease: 'out(3)' }
									],
									delay: (el: any, i: number) => 600 + (i * 300)
								});
							} catch (error) {
								// Fallback animation
								validCards.forEach((card, i) => {
									setTimeout(() => {
										card.style.transition = 'all 1s ease-out';
										card.style.opacity = '1';
										card.style.transform = 'translateX(0)';
									}, 600 + (i * 300));
								});
							}
						}
						
						mobileObserver.disconnect();
					}
				});
			}, { threshold: 0.2 });
			
			const section = document.querySelector('#learning-routes');
			if (section) mobileObserver.observe(section);
		}
		
		// Check if we're on desktop
		if (window.innerWidth >= 1024) {
			// Initial setup - hide cards
			const cards = document.querySelectorAll('.niveau-card');
			cards.forEach(card => {
				(card as HTMLElement).style.opacity = '0';
				(card as HTMLElement).style.transform = 'translateY(50px)';
			});
			
			// Create intersection observer for scroll-triggered animation
			const observer = new IntersectionObserver((entries) => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						// Animate the stair steps with stroke drawing
						const stairPath = document.querySelector('.stair-path') as SVGPathElement;
						if (stairPath) {
							const pathLength = stairPath.getTotalLength();
							stairPath.style.strokeDasharray = `${pathLength}`;
							stairPath.style.strokeDashoffset = `${pathLength}`;
							
							try {
								animate(stairPath, {
									strokeDashoffset: [
										{ from: pathLength, to: 0, duration: 2000, ease: 'inOut(2)', delay: 300 }
									]
								});
							} catch (error) {
								console.warn('Anime.js path animation error:', error);
							}
						}
						
						// Animate niveau cards in sequence
						const cardElements = Array.from(document.querySelectorAll('.niveau-card')) as HTMLElement[];
						if (cardElements.length > 0) {
							const validCards = cardElements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
							if (validCards.length > 0) {
								try {
									animate(validCards, {
										opacity: [
											{ from: 0, to: 1, duration: 1000, ease: 'out(3)' }
										],
										y: [
											{ from: 50, to: 0, duration: 1000, ease: 'out(3)' }
										],
										delay: (el: any, i: number) => 500 + (i * 400)
									});
								} catch (error) {
									console.warn('Anime.js card animation error:', error);
								}
							}
						}
						
						// Animate numbers
						const numberElements = Array.from(document.querySelectorAll('.niveau-number')) as HTMLElement[];
						if (numberElements.length > 0) {
							const validNumbers = numberElements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
							if (validNumbers.length > 0) {
								try {
									animate(validNumbers, {
										scale: [
											{ from: 0, to: 1, duration: 1500, ease: 'out(4)' }
										],
										rotate: [
											{ from: 45, to: 0, duration: 1500, ease: 'out(4)' }
										],
										opacity: [
											{ from: 0, to: 0.2, duration: 1500, ease: 'out(4)' }
										],
										delay: (el: any, i: number) => 300 + (i * 400)
									});
								} catch (error) {
									console.warn('Anime.js number animation error:', error);
								}
							}
						}
						
						// Animate floating elements
						const floatingElements = Array.from(document.querySelectorAll('.floating-icon')) as HTMLElement[];
						if (floatingElements.length > 0) {
							const validFloating = floatingElements.filter(el => el && el.nodeType === Node.ELEMENT_NODE);
							if (validFloating.length > 0) {
								try {
									animate(validFloating, {
										y: [
											{ from: 0, to: -10, duration: 1500, ease: 'inOut(2)' },
											{ from: -10, to: 0, duration: 1500, ease: 'inOut(2)' }
										],
										loop: true,
										delay: (el: any, i: number) => i * 200
									});
								} catch (error) {
									console.warn('Anime.js floating animation error:', error);
								}
							}
						}
						
						observer.disconnect();
					}
				});
			}, { threshold: 0.3 });
			
			const section = document.querySelector('#learning-routes');
			if (section) observer.observe(section);
		}
	});
</script>

<svelte:head>
	<title>Toekomst School - De Toekomst is van Iedereen</title>
	<meta name="description" content="Ontdek jouw plaats in de digitale wereld - samen bouwen we aan een toekomst waar iedereen kan meedoen. Inclusief technologie-onderwijs voor alle groepen in de samenleving." />
</svelte:head>

<!-- Skip to main content link for accessibility -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded">
	Skip to main content
</a>

<main id="main-content" class="min-h-screen">
	<!-- Hero Section -->
	<section class="relative min-h-screen flex items-center justify-center overflow-hidden">
		<!-- Background video placeholder -->
		<div class="absolute inset-0 z-0" aria-hidden="true">
			<div class="w-full h-full bg-background">
				<div class="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
					<p class="text-2xl font-bold">[ Achtergrondvideo Placeholder ]</p>
				</div>
			</div>
		</div>
		
		<!-- Hero content -->
		<div class="relative z-10 container mx-auto px-4 text-center">
			<h1 class="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-700 dark:text-white">
				DE TOEKOMST IS VAN IEDEREEN
			</h1>
			
			<!-- Typewriter animation container -->
			<div class="max-w-4xl mx-auto text-lg md:text-xl text-muted-foreground mb-12" style="min-height: 80px;">
				<p class="typewriter-text">
					{typewriterText}<span class="cursor" class:blinking={!isTyping}>|</span>
				</p>
			</div>
			
			<Button size="lg" variant="default" class="group">
				<Gamepad2 class="mr-2 h-5 w-5" />
				Start Mijn Toekomst
				<span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
			</Button>
			<p class="mt-4 text-muted-foreground">ontdek direct onze videogame</p>
		</div>
		
		<!-- Scroll indicator -->
		<div class="absolute bottom-16 left-1/2 transform -translate-x-1/2 animate-bounce">
			<button onclick={() => scrollToSection('learning-routes')} aria-label="Scroll naar leerroutes" class="text-muted-foreground hover:text-foreground transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
				</svg>
			</button>
		</div>
	</section>

	<!-- Section 2: Learning Routes -->
	<section id="learning-routes" class="py-20 bg-background overflow-hidden relative">
		<!-- Subtle brand color gradient -->
		<div class="absolute inset-0 bg-gradient-to-br from-[#6e7c62]/5 via-transparent to-[#b2b2a2]/5"></div>
		
		<div class="container mx-auto px-4 relative z-10">
			<h2 class="text-3xl md:text-5xl font-bold text-center mb-4 text-gray-700 dark:text-white">Leren op Jouw Niveau</h2>
			<div class="w-20 h-1 bg-primary mx-auto mb-16"></div>
			
			<!-- Desktop stair-step layout -->
			<div class="hidden lg:block max-w-6xl mx-auto relative py-16">
				<!-- Background floating particles -->
				<div class="absolute inset-x-0 -inset-y-20 w-screen left-1/2 transform -translate-x-1/2 pointer-events-none overflow-hidden z-0">
					<div class="floating-icon absolute top-10 left-20">
						<Sparkles class="h-10 w-10 text-primary/20" />
					</div>
					<div class="floating-icon absolute top-20 right-20">
						<Star class="h-8 w-8 text-secondary/20" />
					</div>
					<div class="floating-icon absolute bottom-20 left-40">
						<TrendingUp class="h-12 w-12 text-primary/20" />
					</div>
					<div class="floating-icon absolute top-32 right-40">
						<Code class="h-9 w-9 text-primary/15" />
					</div>
					<div class="floating-icon absolute bottom-32 right-60">
						<Cpu class="h-10 w-10 text-secondary/15" />
					</div>
					<div class="floating-icon absolute top-16 left-60">
						<Wifi class="h-8 w-8 text-primary/20" />
					</div>
					<div class="floating-icon absolute bottom-16 left-80">
						<Smartphone class="h-9 w-9 text-secondary/20" />
					</div>
					<div class="floating-icon absolute top-40 right-80">
						<Monitor class="h-10 w-10 text-primary/15" />
					</div>
					<div class="floating-icon absolute bottom-40 left-1/2">
						<Headphones class="h-9 w-9 text-secondary/15" />
					</div>
					<div class="floating-icon absolute top-24 right-1/4">
						<Camera class="h-8 w-8 text-primary/20" />
					</div>
					<div class="floating-icon absolute bottom-24 left-1/4">
						<Zap class="h-9 w-9 text-secondary/20" />
					</div>
					<div class="floating-icon absolute top-48 left-96">
						<Laptop class="h-10 w-10 text-primary/15" />
					</div>
				</div>
				
				<!-- Simple 3-column grid with transforms for stairs -->
				<div class="grid grid-cols-3 gap-8 items-start relative z-20 mb-8">
					<!-- Niveau 1 -->
					<div class="niveau-card transform translate-y-20">
						<div class="relative group">
							<div class="niveau-number absolute -top-10 -left-4 text-5xl font-bold text-primary/30">1</div>
							<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
							
							<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2 cursor-pointer" onclick={() => openModal(niveauData[0])}>
								<CardHeader class="pb-3">
									<div class="mb-2">
										<CardTitle class="text-lg text-gray-700 dark:text-white">{niveauData[0].title}</CardTitle>
									</div>
									<p class="text-sm text-muted-foreground">{niveauData[0].subtitle}</p>
								</CardHeader>
								<CardContent class="pt-0">
									<Button 
										variant="outline" 
										class="w-full group" 
										onclick={() => openModal(niveauData[0])}
									>
										<Sparkles class="mr-2 h-4 w-4" />
										<span>Meer info</span>
										<TrendingUp class="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>

					<!-- Niveau 2 -->
					<div class="niveau-card transform translate-y-0">
						<div class="relative group">
							<div class="niveau-number absolute -top-10 -left-4 text-5xl font-bold text-primary/30">2</div>
							<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
							
							<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2 cursor-pointer" onclick={() => openModal(niveauData[1])}>
								<CardHeader class="pb-3">
									<div class="mb-2">
										<CardTitle class="text-lg text-gray-700 dark:text-white">{niveauData[1].title}</CardTitle>
									</div>
									<p class="text-sm text-muted-foreground">{niveauData[1].subtitle}</p>
								</CardHeader>
								<CardContent class="pt-0">
									<Button 
										variant="outline" 
										class="w-full group" 
										onclick={() => openModal(niveauData[1])}
									>
										<Sparkles class="mr-2 h-4 w-4" />
										<span>Meer info</span>
										<TrendingUp class="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>

					<!-- Niveau 3 -->
					<div class="niveau-card transform -translate-y-20">
						<div class="relative group">
							<div class="niveau-number absolute -top-10 -left-4 text-5xl font-bold text-primary/30">3</div>
							<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
							
							<div class="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg z-20">
								<Star class="h-4 w-4" />
							</div>
							
							<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2 cursor-pointer" onclick={() => openModal(niveauData[2])}>
								<CardHeader class="pb-3">
									<div class="mb-2">
										<CardTitle class="text-lg text-gray-700 dark:text-white whitespace-pre-line">{niveauData[2].title}</CardTitle>
									</div>
									<p class="text-sm text-muted-foreground">{niveauData[2].subtitle}</p>
								</CardHeader>
								<CardContent class="pt-0">
									<Button 
										variant="outline" 
										class="w-full group" 
										onclick={() => openModal(niveauData[2])}
									>
										<Star class="mr-2 h-4 w-4" />
										<span>Meer info</span>
										<Sparkles class="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
				
				<!-- Animated stair path below cards -->
				<div class="relative z-10 mt-8 grid grid-cols-3 gap-8">
					<svg class="col-span-3 h-32 w-full" viewBox="0 0 1000 120" preserveAspectRatio="none">
						<!-- Gradient definitions -->
						<defs>
							<linearGradient id="stairGradient" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" style="stop-color:var(--color-primary);stop-opacity:0.6" />
								<stop offset="50%" style="stop-color:var(--color-secondary);stop-opacity:0.5" />
								<stop offset="100%" style="stop-color:var(--color-primary);stop-opacity:0.6" />
							</linearGradient>
						</defs>
						
						<!-- Main animated stair path - each stair exactly 33% width (going up) -->
						<path class="stair-path"
							d="M 0 100 L 333 100 L 333 60 L 666 60 L 666 20 L 1000 20" 
							stroke="url(#stairGradient)" 
							stroke-width="4" 
							fill="none" 
							stroke-dasharray="10,5"
						/>
						
						<!-- Decorative dots centered on each stair -->
						<circle cx="166" cy="100" r="8" fill="var(--color-primary)" opacity="0.8" />
						<circle cx="500" cy="60" r="8" fill="var(--color-primary)" opacity="0.7" />
						<circle cx="833" cy="20" r="8" fill="var(--color-primary)" opacity="0.6" />
						
						<!-- Upward arrows pointing to cards -->
						<path d="M 166 108 L 161 118 L 171 118 Z" fill="var(--color-primary)" opacity="0.4" />
						<path d="M 500 68 L 495 78 L 505 78 Z" fill="var(--color-primary)" opacity="0.4" />
						<path d="M 833 28 L 828 38 L 838 38 Z" fill="var(--color-primary)" opacity="0.4" />
					</svg>
				</div>
			</div>

			<!-- Tablet/Mobile layout with timeline -->
			<div class="lg:hidden relative max-w-4xl mx-auto">
				<!-- Timeline line -->
				<div class="timeline-line absolute left-8 top-0 bottom-0 w-0.5 bg-primary/30"></div>
				
				<div class="space-y-12">
					<!-- Niveau 1 -->
					<div class="relative flex items-start">
						<!-- Timeline dot -->
						<div class="timeline-dot absolute left-6 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-10">
							1
						</div>
						
						<!-- Card -->
						<div class="ml-16 flex-1">
							<div class="relative group">
								<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
								
								<Card class="timeline-card relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl cursor-pointer" onclick={() => openModal(niveauData[0])}>
									<CardHeader class="pb-3">
										<div class="mb-2">
											<CardTitle class="text-lg text-gray-700 dark:text-white">{niveauData[0].title}</CardTitle>
										</div>
										<p class="text-sm text-muted-foreground">{niveauData[0].subtitle}</p>
									</CardHeader>
									<CardContent class="pt-0">
										<Button 
											variant="outline" 
											class="w-full group" 
											onclick={() => openModal(niveauData[0])}
										>
											<Sparkles class="mr-2 h-4 w-4" />
											<span>Meer info</span>
											<TrendingUp class="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					</div>

					<!-- Niveau 2 -->
					<div class="relative flex items-start">
						<!-- Timeline dot -->
						<div class="timeline-dot absolute left-6 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-10">
							2
						</div>
						
						<!-- Card -->
						<div class="ml-16 flex-1">
							<div class="relative group">
								<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
								
								<Card class="timeline-card relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl cursor-pointer" onclick={() => openModal(niveauData[1])}>
									<CardHeader class="pb-3">
										<div class="mb-2">
											<CardTitle class="text-lg text-gray-700 dark:text-white">{niveauData[1].title}</CardTitle>
										</div>
										<p class="text-sm text-muted-foreground">{niveauData[1].subtitle}</p>
									</CardHeader>
									<CardContent class="pt-0">
										<Button 
											variant="outline" 
											class="w-full group" 
											onclick={() => openModal(niveauData[1])}
										>
											<Sparkles class="mr-2 h-4 w-4" />
											<span>Meer info</span>
											<TrendingUp class="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					</div>

					<!-- Niveau 3 -->
					<div class="relative flex items-start">
						<!-- Timeline dot -->
						<div class="timeline-dot absolute left-6 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-10">
							3
						</div>
						
						<!-- Card -->
						<div class="ml-16 flex-1">
							<div class="relative group">
								<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
								
								<div class="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg z-20">
									<Star class="h-4 w-4" />
								</div>
								
								<Card class="timeline-card relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl cursor-pointer" onclick={() => openModal(niveauData[2])}>
									<CardHeader class="pb-3">
										<div class="mb-2">
											<CardTitle class="text-lg text-gray-700 dark:text-white whitespace-pre-line">{niveauData[2].title}</CardTitle>
										</div>
										<p class="text-sm text-muted-foreground">{niveauData[2].subtitle}</p>
									</CardHeader>
									<CardContent class="pt-0">
										<Button 
											variant="outline" 
											class="w-full group" 
											onclick={() => openModal(niveauData[2])}
										>
											<Star class="mr-2 h-4 w-4" />
											<span>Meer info</span>
											<Sparkles class="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
										</Button>
									</CardContent>
								</Card>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 3: Call to Action -->
	<section class="py-20 bg-muted">
		<div class="container mx-auto px-4">
			<div class="max-w-3xl mx-auto text-center space-y-8">
				<h2 class="text-4xl md:text-6xl font-bold text-gray-700 dark:text-white">Klaar om te Beginnen?</h2>
				<p class="text-xl text-muted-foreground">
					Start vandaag nog met jou unieke leerroute, ontdek het binnen 10 minuten
				</p>
				
				<Button size="lg" class="group text-lg px-8 py-4">
					<Gamepad2 class="mr-2 h-6 w-6" />
					Start Mijn Toekomst
					<span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
				</Button>
				
				<p class="text-primary font-bold counter-section">✨ Al {currentCount.toLocaleString()}+ leerlingen gingen je deze maand voor</p>
			</div>
		</div>
	</section>

	<!-- Section 4: For Teachers -->
	<section class="py-20 bg-background">
		<div class="container mx-auto px-4">
			<h2 class="text-3xl md:text-5xl font-bold text-center mb-4 text-gray-700 dark:text-white">Voor Docenten</h2>
			<p class="text-xl text-center text-muted-foreground mb-2">Maak Je Digitale Leeromgeving Inclusiever En Makkelijker</p>
			<div class="w-20 h-1 bg-primary mx-auto mb-16"></div>
			
			<div class="max-w-4xl mx-auto">
				<Card class="p-8">
					<CardContent class="space-y-6">
						<h3 class="text-2xl font-bold text-gray-700 dark:text-white">Leerlijn digitale geletterdheid en burgerschap</h3>
						<p class="text-lg text-gray-700 dark:text-white">
							Ontdek hoe ons platform jouw lessen over digitale geletterdheid naar een hoger niveau tilt, met extra aandacht voor inclusief onderwijs waar iedereen bij kan.
						</p>
						
						<div class="grid md:grid-cols-2 gap-6">
							<div class="space-y-4">
								<h4 class="font-bold text-xl text-gray-700 dark:text-white">Wat je krijgt:</h4>
								<ul class="space-y-2">
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span class="text-gray-700 dark:text-white">Gebruiksklare lesmodules op basis van SLO richtlijnen</span>
									</li>
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span class="text-gray-700 dark:text-white">Toegankelijke tools voor leerlingen met verschillende behoeften</span>
									</li>
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span class="text-gray-700 dark:text-white">Realtime voortgang bijhouden</span>
									</li>
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span class="text-gray-700 dark:text-white">Ondersteuning bij het implementeren van inclusief ICT-onderwijs</span>
									</li>
								</ul>
							</div>
							
							<div class="flex items-center justify-center">
								<div class="text-center space-y-4">
									<p class="text-sm text-muted-foreground">📚 Gebruikt door</p>
									<div class="bg-primary/10 p-8 rounded-lg">
										<p class="text-4xl font-bold text-primary">85</p>
										<p class="text-lg text-gray-700 dark:text-white">scholen in Nederland</p>
									</div>
								</div>
							</div>
						</div>
						
						<div class="text-center">
							<Button size="lg" variant="default">
								Start Demo →
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</section>

	<!-- Section 5: Mobile Teaching -->
	<section class="py-20 bg-muted">
		<div class="container mx-auto px-4">
			<h2 class="text-3xl md:text-5xl font-bold text-center mb-4 text-gray-700 dark:text-white">docent on demand</h2>
			<p class="text-xl text-center text-muted-foreground mb-2">bij jou op locatie of online</p>
			<div class="w-20 h-1 bg-primary mx-auto mb-16"></div>
			
			<div class="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
				<div class="space-y-6">
					<h3 class="text-2xl font-bold text-gray-700 dark:text-white">Mobiel Onderwijs</h3>
					<p class="text-lg text-gray-700 dark:text-white">
						Geen tijd of middelen om zelf de les te geven? Wij sturen ervaren docenten naar scholen, buurthuizen, verzorgingstehuizen en andere locaties. Onze tabletkoffers met vakdocent maken overal kwalitatief digitaal onderwijs mogelijk.
					</p>
					
					<div class="space-y-4">
						<h4 class="font-bold text-xl text-gray-700 dark:text-white">Onze aanpak:</h4>
						<ul class="space-y-2">
							<li class="flex items-start">
								<span class="text-primary mr-2">•</span>
								<span class="text-gray-700 dark:text-white">Gekwalificeerde docenten met ervaring in inclusief onderwijs</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2">•</span>
								<span class="text-gray-700 dark:text-white">Alle benodigde apparatuur nemen we mee</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2">•</span>
								<span class="text-gray-700 dark:text-white">Flexibele planning aangepast aan jullie behoeften</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2">•</span>
								<span class="text-gray-700 dark:text-white">Workshops voor groepen van 5 tot 30 personen</span>
							</li>
						</ul>
					</div>
				</div>
				
				<div class="space-y-6">
					<!-- Image placeholder -->
					<div class="bg-muted rounded-lg p-16 text-center">
						<p class="text-muted-foreground">[ Image Placeholder ]</p>
					</div>
					
					<div class="bg-primary/10 p-6 rounded-lg">
						<h4 class="font-bold text-xl mb-4 text-gray-700 dark:text-white">Perfect voor:</h4>
						<ul class="space-y-3">
							<li class="flex items-center">
								<GraduationCap class="h-5 w-5 text-primary mr-3 flex-shrink-0" />
								<span class="text-gray-700 dark:text-white">basis en middelbare scholen</span>
							</li>
							<li class="flex items-center">
								<Heart class="h-5 w-5 text-primary mr-3 flex-shrink-0" />
								<span class="text-gray-700 dark:text-white">speciaal onderwijs en zorg locaties</span>
							</li>
							<li class="flex items-center">
								<Gift class="h-5 w-5 text-primary mr-3 flex-shrink-0" />
								<span class="text-gray-700 dark:text-white">kinderfeestjes en bedrijfsworkshops</span>
							</li>
							<li class="flex items-center">
								<BookOpen class="h-5 w-5 text-primary mr-3 flex-shrink-0" />
								<span class="text-gray-700 dark:text-white">bibliotheken en wijkcentra</span>
							</li>
						</ul>
					</div>
					
				</div>
			</div>
			
			<!-- Centered button below both columns -->
			<div class="text-center mt-16">
				<Button size="lg">Plan Een Bezoek In →</Button>
			</div>
		</div>
	</section>

	<!-- Section 6: Tablet App -->
	<section class="py-20 bg-background">
		<div class="container mx-auto px-4">
			<h2 class="text-3xl md:text-5xl font-bold text-center mb-4 text-gray-700 dark:text-white">Thuis verder ontdekken?</h2>
			<p class="text-xl text-center text-muted-foreground mb-2">beschikbaar via web en android</p>
			<div class="w-20 h-1 bg-primary mx-auto mb-16"></div>
			
			<div class="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
				<div class="space-y-6">
					<!-- Tablet app image -->
					<div class="rounded-lg overflow-hidden shadow-lg">
						<img src="/images/tablet-app-hero.jpg" alt="Tablet app interface showing educational content" class="w-full h-auto object-cover no-invert" />
					</div>
					
					<Card class="p-6">
						<CardContent class="space-y-4">
							<h4 class="font-bold text-xl text-gray-700 dark:text-white">Speciaal ontworpen voor:</h4>
							<ul class="space-y-2">
								<li class="flex items-start">
									<span class="text-primary mr-2">✓</span>
									<span class="text-gray-700 dark:text-white">Kinderen met ADHD, autisme of andere neurodiversiteit</span>
								</li>
								<li class="flex items-start">
									<span class="text-primary mr-2">✓</span>
									<span class="text-gray-700 dark:text-white">Leerlingen met dyslexie of andere leerbehoeften</span>
								</li>
								<li class="flex items-start">
									<span class="text-primary mr-2">✓</span>
									<span class="text-gray-700 dark:text-white">Visueel of auditief beperkte kinderen</span>
								</li>
								<li class="flex items-start">
									<span class="text-primary mr-2">✓</span>
									<span class="text-gray-700 dark:text-white">Iedereen die op zijn eigen manier leert</span>
								</li>
							</ul>
						</CardContent>
					</Card>
				</div>
				
				<div class="space-y-6">
					<div class="space-y-4">
						<h3 class="text-2xl font-bold text-gray-700 dark:text-white">De App Die Meegaat</h3>
						<p class="text-lg text-gray-700 dark:text-white">
							Transformeer je tablet in een veilige en volledige digitale leer omgeving! Onze app brengt inclusief technologieonderwijs direct in je huiskamer.
						</p>
					</div>
					
					<div class="space-y-4">
						<h4 class="font-bold text-xl text-gray-700 dark:text-white">Bijzondere kenmerken:</h4>
						<ul class="space-y-2">
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span class="text-gray-700 dark:text-white"><strong>Werkt offline</strong> - perfecte voor onderweg</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span class="text-gray-700 dark:text-white"><strong>Toegankelijk ontwerp</strong> voor verschillende behoeften</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span class="text-gray-700 dark:text-white"><strong>Ouderportaal</strong> om voortgang te volgen</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span class="text-gray-700 dark:text-white"><strong>Speels leren</strong> met badges en uitdagingen</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span class="text-gray-700 dark:text-white"><strong>Verschillende moeilijkheidsgraden</strong> in één app</span>
							</li>
						</ul>
					</div>
					
					<!-- Star rating, download button, and purchase option -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
						<!-- Left column: Rating and download -->
						<div class="space-y-6 flex flex-col items-center justify-center">
							<div class="inline-flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
								<Star class="h-8 w-8 text-primary flex-shrink-0" />
								<div>
									<p class="font-bold text-lg text-gray-700 dark:text-white">4.6/5 sterren</p>
									<p class="text-sm text-muted-foreground">450+ reviews</p>
								</div>
							</div>
							
							<div class="text-center">
								<Button size="lg" variant="default">
									<Laptop class="mr-2 h-5 w-5" />
									Download de App →
								</Button>
								<p class="mt-2 text-sm text-muted-foreground">30 dagen gratis proberen</p>
							</div>
						</div>
						
						<!-- Right column: Purchase option -->
						<div class="space-y-6">
							<div class="p-6 bg-secondary/10 rounded-lg border-2 border-secondary/20">
								<div class="text-center mb-6">
									<h4 class="font-bold text-xl text-gray-700 dark:text-white mb-2">nog geen tablet in huis?</h4>
									<p class="text-lg font-semibold text-gray-700 dark:text-white mb-3">koop dan nu een edutab</p>
									<p class="text-sm text-primary font-bold">incl gratis jaarlicentie toekomst.school</p>
								</div>
								
								<div class="text-center">
									<a 
										href="https://edutab.nl/shop" 
										target="_blank" 
										rel="noopener noreferrer"
									>
										<Button size="lg" variant="secondary">
											Bekijk Edutabs →
										</Button>
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 7: Testimonials -->
	<section class="py-20 bg-background">
		<div class="container mx-auto px-4">
			<!-- Testimonials -->
			<div class="max-w-4xl mx-auto">
				<h2 class="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-700 dark:text-white">Wat Anderen Zeggen</h2>
				
				<div class="space-y-8">
					<Card class="p-6">
						<CardContent>
							<p class="text-lg italic mb-4">
								"Eindelijk een platform waar mijn zoon met autisme helemaal zichzelf kan zijn en toch leert programmeren. De docenten begrijpen echt wat hij nodig heeft."
							</p>
							<p class="font-bold">- Marieke, moeder van Thijs (12)</p>
						</CardContent>
					</Card>
					
					<Card class="p-6">
						<CardContent>
							<p class="text-lg italic mb-4">
								"Als docent had ik altijd moeite om alle kinderen te bereiken in mijn ICT-lessen. De tools van Toekomst School maken het zoveel makkelijker om iedereen mee te laten doen."
							</p>
							<p class="font-bold">- Rob, basisschoolleerkracht</p>
						</CardContent>
					</Card>
					
					<Card class="p-6">
						<CardContent>
							<p class="text-lg italic mb-4">
								"Mijn oma van 78 heeft via het eerste niveau geleerd te videobellen. Nu spreekt ze elke week met haar kleinkinderen!"
							</p>
							<p class="font-bold">- Lisa, kleindochter</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 8: Social Media -->
	<section class="py-20 bg-muted">
		<div class="container mx-auto px-4">
			<!-- Social Media -->
			<div class="max-w-4xl mx-auto mb-20">
				<h2 class="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-700 dark:text-white">Volg ons op je favoriete platform</h2>
				<div class="w-20 h-1 bg-primary mx-auto mb-12"></div>
				
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<!-- Instagram -->
					<a 
						href="https://instagram.com/toekomstschool" 
						target="_blank" 
						rel="noopener noreferrer"
						class="group"
					>
						<Card class="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
							<CardContent class="text-center space-y-4">
								<div class="flex justify-center">
									<Instagram class="h-12 w-12 text-orange-500 group-hover:scale-110 transition-transform" />
								</div>
								<h3 class="font-bold text-xl text-primary">@toekomstschool</h3>
								<p class="text-muted-foreground">Dagelijkse tips en voorbeelden</p>
							</CardContent>
						</Card>
					</a>
					
					<!-- LinkedIn -->
					<a 
						href="https://linkedin.com/company/toekomstschool" 
						target="_blank" 
						rel="noopener noreferrer"
						class="group"
					>
						<Card class="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
							<CardContent class="text-center space-y-4">
								<div class="flex justify-center">
									<Linkedin class="h-12 w-12 text-orange-500 group-hover:scale-110 transition-transform" />
								</div>
								<h3 class="font-bold text-xl text-primary">Toekomst School</h3>
								<p class="text-muted-foreground">Professionele updates</p>
							</CardContent>
						</Card>
					</a>
					
					<!-- YouTube -->
					<a 
						href="https://youtube.com/@toekomstschool" 
						target="_blank" 
						rel="noopener noreferrer"
						class="group"
					>
						<Card class="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
							<CardContent class="text-center space-y-4">
								<div class="flex justify-center">
									<Youtube class="h-12 w-12 text-orange-500 group-hover:scale-110 transition-transform" />
								</div>
								<h3 class="font-bold text-xl text-primary">@toekomstschool</h3>
								<p class="text-muted-foreground">Gratis tutorials en webinars</p>
							</CardContent>
						</Card>
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Social Media Links -->
	<section class="py-12 bg-muted">
		<div class="container mx-auto px-4">
			<div class="text-center">
				<h3 class="text-xl font-bold mb-4 text-gray-700 dark:text-white">Volg ons op social media</h3>
				<div class="flex justify-center gap-6">
					<a href="https://linkedin.com/company/toekomst-school" target="_blank" rel="noopener noreferrer" 
					   class="text-muted-foreground hover:text-foreground transition-colors">
						<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
						</svg>
						<span class="sr-only">LinkedIn</span>
					</a>
					<a href="https://instagram.com/toekomst.school" target="_blank" rel="noopener noreferrer" 
					   class="text-muted-foreground hover:text-foreground transition-colors">
						<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
						</svg>
						<span class="sr-only">Instagram</span>
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 9: Contact -->
	<section class="py-20 bg-background">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto">
				<h2 class="text-3xl md:text-5xl font-bold text-center mb-4 text-gray-700 dark:text-white">Contact</h2>
				<p class="text-xl text-center text-muted-foreground mb-2">Vragen? We Helpen Graag!</p>
				<div class="w-20 h-1 bg-primary mx-auto mb-12"></div>
				
				<Card class="p-8">
					<CardContent class="space-y-6">
						<div class="text-center mb-8">
							<h3 class="text-2xl font-bold mb-2">Persoonlijke Ondersteuning</h3>
							<p class="text-lg">
								Heb je vragen over onze aanpak, wil je meer weten over inclusief onderwijs, of ben je benieuwd hoe wij jouw organisatie kunnen helpen?
							</p>
						</div>
						
						<div class="grid md:grid-cols-2 gap-8">
							<div class="space-y-4">
								<h4 class="font-bold text-xl">Bereik ons op verschillende manieren:</h4>
								<ul class="space-y-3">
									<li><strong>WhatsApp:</strong> 06-1234-5678 (snel en gemakkelijk)</li>
									<li><strong>Telefoon:</strong> 085-1234567</li>
									<li><strong>Email:</strong> info@toekomstschool.nl</li>
									<li><strong>Live chat:</strong> via de website tijdens kantooruren</li>
								</ul>
								
								<div class="pt-4">
									<h4 class="font-bold">Openingstijden:</h4>
									<p>Maandag t/m vrijdag: 9:00 - 17:00</p>
									<p>Weekend: voor urgente vragen</p>
								</div>
							</div>
							
							<div class="space-y-4">
								<div>
									<h4 class="font-bold text-xl mb-3">Bezoekadres:</h4>
									<p>Innovatie Campus</p>
									<p>Toekomstlaan 42</p>
									<p>1234 AB Apeldoorn</p>
								</div>
								
								<div class="pt-4">
									<h4 class="font-bold text-xl mb-3">Volg Ons Voor Inspiratie</h4>
									<div class="flex gap-4">
										<a href="#" aria-label="Instagram" class="hover:text-primary transition-colors">
											<Instagram class="h-6 w-6" />
										</a>
										<a href="#" aria-label="LinkedIn" class="hover:text-primary transition-colors">
											<Linkedin class="h-6 w-6" />
										</a>
										<a href="#" aria-label="YouTube" class="hover:text-primary transition-colors">
											<Youtube class="h-6 w-6" />
										</a>
									</div>
									<p class="text-sm text-muted-foreground mt-2">
										<strong>Instagram:</strong> @toekomstschool - Dagelijkse tips en voorbeelden<br/>
										<strong>LinkedIn:</strong> Toekomst School - Professionele updates<br/>
										<strong>YouTube:</strong> Gratis tutorials en webinars
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="py-20 bg-muted text-foreground">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto text-center space-y-8">
				<div>
					<h3 class="text-2xl font-bold mb-6 text-gray-700 dark:text-white">Waarom Toekomst School?</h3>
					<div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
						<div class="flex items-start">
							<span class="text-primary mr-2">✓</span>
							<span>Erkend door Nederlandse onderwijsinstanties</span>
						</div>
						<div class="flex items-start">
							<span class="text-primary mr-2">✓</span>
							<span>4500+ tevreden leerlingen sinds start</span>
						</div>
						<div class="flex items-start">
							<span class="text-primary mr-2">✓</span>
							<span>al ruim 8 jaar actief</span>
						</div>
						<div class="flex items-start">
							<span class="text-primary mr-2">✓</span>
							<span>Inclusief ontworpen voor iedereen</span>
						</div>
						<div class="flex items-start">
							<span class="text-primary mr-2">✓</span>
							<span>30 dagen gratis proberen</span>
						</div>
						<div class="flex items-start">
							<span class="text-primary mr-2">✓</span>
							<span>Persoonlijke begeleiding inbegrepen</span>
						</div>
					</div>
				</div>
				
				<div class="pt-8 border-t border-border">
					<h3 class="text-xl font-bold mb-4">Start Vandaag Nog</h3>
					<p class="mb-6">De toekomst wacht niet. Begin met kleine stapjes en ontdek wat mogelijk is.</p>
					<Button size="lg" variant="default">
						🚀 Begin Je Digitale Reis →
					</Button>
				</div>
				
				<div class="pt-8">
					<p class="text-lg italic text-muted-foreground">
						"Technologie is er voor iedereen - laten we ervoor zorgen dat iedereen er ook bij kan."
					</p>
					<div class="mt-8 flex justify-center gap-8 text-sm">
						<a href="/algemene-voorwaarden" class="text-muted-foreground hover:text-foreground transition-colors">
							Algemene Voorwaarden
						</a>
						<a href="/privacy-verklaring" class="text-muted-foreground hover:text-foreground transition-colors">
							Privacy Verklaring
						</a>
					</div>
				</div>
			</div>
		</div>
	</footer>
</main>

<!-- Modal for Niveau Details -->
<Dialog.Root bind:open={isModalOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-3">
				<div class="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center">
					<span class="text-sm font-bold text-primary">{selectedNiveau?.id}</span>
				</div>
				<span>Niveau {selectedNiveau?.id}: {selectedNiveau?.title}</span>
			</Dialog.Title>
			<Dialog.Description class="text-muted-foreground">
				{selectedNiveau?.subtitle}
			</Dialog.Description>
		</Dialog.Header>
		
		<div class="space-y-4">
			<p class="text-sm leading-relaxed">
				{selectedNiveau?.description}
			</p>
			
			<div class="space-y-3">
				<h4 class="font-bold flex items-center gap-2">
					<Sparkles class="h-4 w-4 text-primary" />
					Wat je leert:
				</h4>
				<ul class="space-y-2">
					{#each selectedNiveau?.skills || [] as skill}
						<li class="flex items-start gap-2 text-sm">
							<span class="text-primary mt-1">•</span>
							<span>{skill}</span>
						</li>
					{/each}
				</ul>
			</div>
		</div>
		
		<Dialog.Footer>
			<Button class="group w-full">
				<span class="whitespace-pre-line">{selectedNiveau?.buttonText}</span>
				<TrendingUp class="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>


<style>
	/* Additional animations */
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	/* Typewriter cursor animation */
	@keyframes blink {
		0%, 50% { opacity: 1; }
		51%, 100% { opacity: 0; }
	}
	
	.cursor {
		color: var(--color-primary);
		font-weight: bold;
	}
	
	.cursor.blinking {
		animation: blink 1s infinite;
	}
	
	.typewriter-text {
		font-family: 'IBM Plex Mono', monospace;
		line-height: 1.6;
	}
	
	section {
		animation: fadeIn 0.8s ease-out;
	}
	
	.niveau-card {
		margin: 15px;
	}
	
</style>