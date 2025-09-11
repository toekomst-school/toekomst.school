<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Gamepad2, Users, Laptop, Star, Instagram, Linkedin, Youtube, TrendingUp, Sparkles, Code, Cpu, Wifi, Smartphone, Monitor, Headphones, Camera, Zap } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { animate } from 'animejs';
	
	// Theme detection
	let theme = 'dark';
	
	function detectTheme() {
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
			theme = 'light';
		} else {
			theme = 'dark';
		}
	}
	
	// Listen for theme changes
	if (typeof window !== 'undefined') {
		window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', event => {
			theme = event.matches ? 'light' : 'dark';
		});
	}
	
	// Manual theme toggle for testing
	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
	}
	
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
	
	const niveauData = [
		{
			id: 1,
			title: "Digitale Toegankelijkheid",
			subtitle: "Voor mensen die ondersteuning nodig hebben bij computergebruik",
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
			title: "Digitale Uitvinders",
			subtitle: "Nerds(neurodiversen) en alle andere geintereseerde welkom!",
			description: "Hier duiken we diep de technologie in. Perfect voor mensen die helemaal opgaan in techniek en echt willen begrijpen hoe dingen werken.",
			skills: [
				"Ethisch hacken en cybersecurity",
				"Hardware bouwen en aanpassen",
				"Geavanceerd programmeren",
				"Robotica en AI-projecten",
				"3D printen en makerspace vaardigheden"
			],
			buttonText: "Ontdek Digitale Uitvinders"
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
		// Detect theme on mount
		detectTheme();
		
		// Start typewriter animation
		typeText(texts[0]);
		
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

<main id="main-content" class="min-h-screen {theme}-theme">
	<!-- Hero Section -->
	<section class="relative min-h-screen flex items-center justify-center overflow-hidden">
		<!-- Background video placeholder -->
		<div class="absolute inset-0 z-0" aria-hidden="true">
			<div class="w-full h-full bg-gradient-to-br from-blackened-steel via-patina-copper to-blackened-steel opacity-90">
				<div class="absolute inset-0 flex items-center justify-center text-white/20">
					<p class="text-2xl font-bold">[ Achtergrondvideo Placeholder ]</p>
				</div>
			</div>
		</div>
		
		<!-- Hero content -->
		<div class="relative z-10 container mx-auto px-4 text-center">
			<h1 class="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white">
				DE TOEKOMST IS VAN IEDEREEN
			</h1>
			
			<!-- Typewriter animation container -->
			<div class="max-w-4xl mx-auto text-lg md:text-xl text-white/90 mb-12" style="min-height: 80px;">
				<p class="typewriter-text">
					{typewriterText}<span class="cursor" class:blinking={!isTyping}>|</span>
				</p>
			</div>
			
			<Button size="lg" variant="default" class="group">
				<Gamepad2 class="mr-2 h-5 w-5" />
				Start Mijn Toekomst
				<span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
			</Button>
			<p class="mt-4 text-white/60">Start met ons gratis introductie-spel</p>
		</div>
		
		<!-- Scroll indicator -->
		<div class="absolute bottom-16 left-1/2 transform -translate-x-1/2 animate-bounce">
			<button onclick={() => scrollToSection('learning-routes')} aria-label="Scroll naar leerroutes" class="text-white/60 hover:text-white transition-colors">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
				</svg>
			</button>
		</div>
	</section>

	<!-- Section 2: Learning Routes -->
	<section id="learning-routes" class="py-20 bg-background overflow-hidden relative">
		<!-- Animated background gradient -->
		<div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
		
		<div class="container mx-auto px-4 relative z-10">
			<h2 class="text-3xl md:text-5xl font-bold text-center mb-4">Leren op Jouw Niveau</h2>
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
							
							<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2">
								<CardHeader class="pb-3">
									<div class="mb-2">
										<CardTitle class="text-lg">{niveauData[0].title}</CardTitle>
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
							
							<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2">
								<CardHeader class="pb-3">
									<div class="mb-2">
										<CardTitle class="text-lg">{niveauData[1].title}</CardTitle>
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
							
							<div class="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
								<Star class="h-4 w-4" />
							</div>
							
							<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-2">
								<CardHeader class="pb-3">
									<div class="mb-2">
										<CardTitle class="text-lg">{niveauData[2].title}</CardTitle>
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
				<div class="absolute left-8 top-0 bottom-0 w-0.5 bg-primary/30"></div>
				
				<div class="space-y-12">
					<!-- Niveau 1 -->
					<div class="relative flex items-start">
						<!-- Timeline dot -->
						<div class="absolute left-6 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-10">
							1
						</div>
						
						<!-- Card -->
						<div class="ml-16 flex-1">
							<div class="relative group">
								<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
								
								<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl">
									<CardHeader class="pb-3">
										<div class="mb-2">
											<CardTitle class="text-lg">{niveauData[0].title}</CardTitle>
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
						<div class="absolute left-6 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-10">
							2
						</div>
						
						<!-- Card -->
						<div class="ml-16 flex-1">
							<div class="relative group">
								<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
								
								<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl">
									<CardHeader class="pb-3">
										<div class="mb-2">
											<CardTitle class="text-lg">{niveauData[1].title}</CardTitle>
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
						<div class="absolute left-6 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold z-10">
							3
						</div>
						
						<!-- Card -->
						<div class="ml-16 flex-1">
							<div class="relative group">
								<div class="absolute -inset-2 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
								
								<div class="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
									<Star class="h-4 w-4" />
								</div>
								
								<Card class="relative bg-gradient-to-br from-background to-muted/50 border-2 hover:border-primary transition-all duration-300 hover:shadow-2xl">
									<CardHeader class="pb-3">
										<div class="mb-2">
											<CardTitle class="text-lg">{niveauData[2].title}</CardTitle>
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
	<section class="py-20 bg-muted/50">
		<div class="container mx-auto px-4">
			<div class="max-w-3xl mx-auto text-center space-y-8">
				<h2 class="text-4xl md:text-6xl font-bold">Klaar om te Beginnen?</h2>
				<p class="text-xl text-muted-foreground">
					Start vandaag nog met jou unieke leerroute, ontdek het binnen 10 minuten
				</p>
				
				<Button size="lg" class="group text-lg px-8 py-4">
					<Gamepad2 class="mr-2 h-6 w-6" />
					Start Mijn Toekomst
					<span class="ml-2 group-hover:translate-x-1 transition-transform">→</span>
				</Button>
				
				<p class="text-primary font-bold">✨ Al 1.200+ kinderen gingen je voor deze maand</p>
			</div>
		</div>
	</section>

	<!-- Section 4: For Teachers -->
	<section class="py-20 bg-background">
		<div class="container mx-auto px-4">
			<h2 class="text-3xl md:text-5xl font-bold text-center mb-4">Voor Docenten</h2>
			<p class="text-xl text-center text-muted-foreground mb-2">Maak Je Digitale Lessen Inclusiever En Makkelijker</p>
			<div class="w-20 h-1 bg-primary mx-auto mb-16"></div>
			
			<div class="max-w-4xl mx-auto">
				<Card class="p-8">
					<CardContent class="space-y-6">
						<h3 class="text-2xl font-bold">Wat kunnen wij voor je betekenen?</h3>
						<p class="text-lg">
							Ontdek hoe ons platform jouw lessen over digitale geletterdheid naar een hoger niveau tilt, met extra aandacht voor inclusief onderwijs waar iedereen bij kan.
						</p>
						
						<div class="grid md:grid-cols-2 gap-6">
							<div class="space-y-4">
								<h4 class="font-bold text-xl">Wat je krijgt:</h4>
								<ul class="space-y-2">
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span>Gebruiksklare lesmodules voor alle niveaus</span>
									</li>
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span>Toegankelijke tools voor leerlingen met verschillende behoeften</span>
									</li>
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span>Realtime voortgang bijhouden</span>
									</li>
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span>Ondersteuning bij het implementeren van inclusief ICT-onderwijs</span>
									</li>
									<li class="flex items-start">
										<span class="text-primary mr-2">✓</span>
										<span>Gratis trainingen en kennisuitwisseling</span>
									</li>
								</ul>
							</div>
							
							<div class="flex items-center justify-center">
								<div class="text-center space-y-4">
									<div class="bg-primary/10 p-8 rounded-lg">
										<p class="text-4xl font-bold text-primary">85</p>
										<p class="text-lg">scholen in Nederland</p>
									</div>
									<p class="text-sm text-muted-foreground">📚 Gebruikt door</p>
								</div>
							</div>
						</div>
						
						<div class="text-center">
							<Button size="lg" variant="default">
								Bekijk Docentenportaal →
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	</section>

	<!-- Section 5: Mobile Teaching -->
	<section class="py-20 bg-muted/50">
		<div class="container mx-auto px-4">
			<h2 class="text-3xl md:text-5xl font-bold text-center mb-4">docent on demand</h2>
			<p class="text-xl text-center text-muted-foreground mb-2">bij jou op locatie of online</p>
			<div class="w-20 h-1 bg-primary mx-auto mb-16"></div>
			
			<div class="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
				<div class="space-y-6">
					<h3 class="text-2xl font-bold">Mobiel Onderwijs</h3>
					<p class="text-lg">
						Geen tijd of middelen om zelf de les te geven? Wij sturen ervaren docenten naar scholen, buurthuizen, verzorgingstehuizen en andere locaties. Onze tabletkoffers met vakdocent maken overal kwalitatief digitaal onderwijs mogelijk.
					</p>
					
					<div class="space-y-4">
						<h4 class="font-bold text-xl">Onze aanpak:</h4>
						<ul class="space-y-2">
							<li class="flex items-start">
								<span class="text-primary mr-2">•</span>
								<span>Gekwalificeerde docenten met ervaring in inclusief onderwijs</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2">•</span>
								<span>Alle benodigde apparatuur nemen we mee</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2">•</span>
								<span>Flexibele planning aangepast aan jullie behoeften</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2">•</span>
								<span>Workshops voor groepen van 5 tot 30 personen</span>
							</li>
						</ul>
					</div>
				</div>
				
				<div class="space-y-6">
					<div class="bg-primary/10 p-6 rounded-lg">
						<h4 class="font-bold text-xl mb-4">Perfect voor:</h4>
						<ul class="space-y-3">
							<li class="flex items-center">
								<Users class="h-5 w-5 text-primary mr-3 flex-shrink-0" />
								<span>Scholen die hun digitale onderwijs willen versterken</span>
							</li>
							<li class="flex items-center">
								<Users class="h-5 w-5 text-primary mr-3 flex-shrink-0" />
								<span>Buurthuizen en wijkcentra</span>
							</li>
							<li class="flex items-center">
								<Users class="h-5 w-5 text-primary mr-3 flex-shrink-0" />
								<span>Zorglocaties en bibliotheken</span>
							</li>
							<li class="flex items-center">
								<Users class="h-5 w-5 text-primary mr-3 flex-shrink-0" />
								<span>Bedrijven die hun teams willen bijscholen</span>
							</li>
						</ul>
					</div>
					
					<div class="text-center lg:text-left">
						<Button size="lg">Plan Een Bezoek In →</Button>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 6: Tablet App -->
	<section class="py-20 bg-background">
		<div class="container mx-auto px-4">
			<h2 class="text-3xl md:text-5xl font-bold text-center mb-4">Thuis verder ontdekken?</h2>
			<p class="text-xl text-center text-muted-foreground mb-2">beschikbaar via web en android</p>
			<div class="w-20 h-1 bg-primary mx-auto mb-16"></div>
			
			<div class="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
				<div class="space-y-6">
					<h3 class="text-2xl font-bold">De App Die Meegaat</h3>
					<p class="text-lg">
						Transformeer je tablet in een complete digitale school! Onze app brengt inclusief technologieonderwijs direct in je huiskamer.
					</p>
					
					<div class="space-y-4">
						<h4 class="font-bold text-xl">Bijzondere kenmerken:</h4>
						<ul class="space-y-2">
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span><strong>Werkt offline</strong> - perfecte voor onderweg</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span><strong>Toegankelijk ontwerp</strong> voor verschillende behoeften</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span><strong>Ouderportaal</strong> om voortgang te volgen</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span><strong>Speels leren</strong> met badges en uitdagingen</span>
							</li>
							<li class="flex items-start">
								<span class="text-primary mr-2 font-bold">•</span>
								<span><strong>Verschillende moeilijkheidsgraden</strong> in één app</span>
							</li>
						</ul>
					</div>
					
					<div class="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
						<Star class="h-8 w-8 text-primary flex-shrink-0" />
						<div>
							<p class="font-bold text-lg">4.6/5 sterren</p>
							<p class="text-sm text-muted-foreground">450+ reviews</p>
						</div>
					</div>
				</div>
				
				<div class="space-y-6">
					<Card class="p-6">
						<CardContent class="space-y-4">
							<h4 class="font-bold text-xl">Speciaal ontworpen voor:</h4>
							<ul class="space-y-2">
								<li class="flex items-start">
									<span class="text-primary mr-2">✓</span>
									<span>Kinderen met ADHD, autisme of andere neurodiversiteit</span>
								</li>
								<li class="flex items-start">
									<span class="text-primary mr-2">✓</span>
									<span>Leerlingen met dyslexie of andere leerbehoeften</span>
								</li>
								<li class="flex items-start">
									<span class="text-primary mr-2">✓</span>
									<span>Visueel of auditief beperkte kinderen</span>
								</li>
								<li class="flex items-start">
									<span class="text-primary mr-2">✓</span>
									<span>Iedereen die op zijn eigen manier leert</span>
								</li>
							</ul>
						</CardContent>
					</Card>
					
					<div class="text-center">
						<Button size="lg" variant="default">
							<Laptop class="mr-2 h-5 w-5" />
							Download de App →
						</Button>
						<p class="mt-2 text-sm text-muted-foreground">30 dagen gratis proberen</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Section 7: Contact & Testimonials -->
	<section class="py-20 bg-muted/50">
		<div class="container mx-auto px-4">
			<!-- Testimonials -->
			<div class="max-w-4xl mx-auto mb-20">
				<h2 class="text-3xl md:text-4xl font-bold text-center mb-12">Wat Anderen Zeggen</h2>
				
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
			
			<!-- Contact -->
			<div class="max-w-4xl mx-auto">
				<h2 class="text-3xl md:text-5xl font-bold text-center mb-4">Contact</h2>
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
	<footer class="py-20 bg-blackened-steel text-white">
		<div class="container mx-auto px-4">
			<div class="max-w-4xl mx-auto text-center space-y-8">
				<div>
					<h3 class="text-2xl font-bold mb-6">Waarom Toekomst School?</h3>
					<div class="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
						<div class="flex items-start">
							<span class="text-primary mr-2">✓</span>
							<span>Erkend door Nederlandse onderwijsinstanties</span>
						</div>
						<div class="flex items-start">
							<span class="text-primary mr-2">✓</span>
							<span>1.200+ tevreden leerlingen dit jaar</span>
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
				
				<div class="pt-8 border-t border-white/20">
					<h3 class="text-xl font-bold mb-4">Start Vandaag Nog</h3>
					<p class="mb-6">De toekomst wacht niet. Begin met kleine stapjes en ontdek wat mogelijk is.</p>
					<Button size="lg" variant="default" class="bg-white text-blackened-steel hover:bg-white/90">
						🚀 Begin Je Digitale Reis →
					</Button>
				</div>
				
				<div class="pt-8">
					<p class="text-lg italic text-white/80">
						"Technologie is er voor iedereen - laten we ervoor zorgen dat iedereen er ook bij kan."
					</p>
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
				<span>{selectedNiveau?.buttonText}</span>
				<TrendingUp class="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Theme Toggle Button for Testing -->
<button 
	onclick={toggleTheme}
	class="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
	title="Toggle theme for testing"
>
	{#if theme === 'light'}
		🌙
	{:else}
		☀️
	{/if}
</button>

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
	
	/* Light Theme - Keep original teal/copper colors, just fix backgrounds */
	.light-theme {
		--background: 220 13% 98%;
		--foreground: 222.2 84% 4.9%;
		--card: 220 13% 99%;
		--card-foreground: 222.2 84% 4.9%;
		--popover: 220 13% 99%;
		--popover-foreground: 222.2 84% 4.9%;
		/* Keep original teal/copper primary */
		--primary: 25 74% 55%; /* Original copper/orange */
		--primary-foreground: 0 0% 100%;
		/* Keep original teal secondary */
		--secondary: 184 24% 49%; /* Original teal */
		--secondary-foreground: 0 0% 100%;
		--muted: 220 13% 96%;
		--muted-foreground: 215.4 16.3% 46.9%;
		--accent: 184 24% 49%; /* Teal accent */
		--accent-foreground: 0 0% 100%;
		--destructive: 0 84.2% 60.2%;
		--destructive-foreground: 210 40% 98%;
		--border: 214.3 31.8% 91.4%;
		--input: 214.3 31.8% 91.4%;
		--ring: 25 74% 55%; /* Copper ring */
	}
	
	/* Dark Theme - Fix green backgrounds and add section variety */
	.dark-theme .bg-muted\/50 {
		background-color: hsl(220 14% 15%) !important; /* dark gray */
	}
	
	.dark-theme .bg-muted {
		background-color: hsl(220 14% 12%) !important; /* darker gray */
	}
	
	.dark-theme .bg-background {
		background-color: hsl(220 14% 8%) !important; /* darkest gray */
	}
	
	/* Different section backgrounds for dark theme */
	.dark-theme section:nth-of-type(2) {
		/* Leren op jouw niveau - medium dark */
		background-color: hsl(220 14% 10%) !important;
	}
	
	.dark-theme section:nth-of-type(3) {
		/* Klaar om te beginnen - lighter dark */
		background-color: hsl(220 14% 15%) !important;
	}
	
	.dark-theme section:nth-of-type(4) {
		/* Voor docenten - medium dark */
		background-color: hsl(220 14% 10%) !important;
	}
	
	.dark-theme section:nth-of-type(5) {
		/* Docent on demand - lighter dark */
		background-color: hsl(220 14% 15%) !important;
	}
	
	.dark-theme section:nth-of-type(6) {
		/* Thuis verder ontdekken - medium dark */
		background-color: hsl(220 14% 10%) !important;
	}
	
	/* Light theme section backgrounds and text */
	.light-theme {
		background-color: hsl(var(--background));
		color: hsl(var(--foreground));
	}
	
	.light-theme section {
		background-color: hsl(var(--background)) !important;
		color: hsl(var(--foreground)) !important;
	}
	
	.light-theme .bg-muted\/50 {
		background-color: hsl(220 13% 96%) !important; /* very light gray instead of white */
	}
	
	.light-theme .bg-background {
		background-color: hsl(220 13% 98%) !important; /* off-white instead of pure white */
	}
	
	/* Softer hero section colors */
	.light-theme section:first-of-type {
		background: linear-gradient(135deg, hsl(220 13% 98%) 0%, hsl(220 13% 95%) 50%, hsl(220 13% 98%) 100%) !important;
	}
	
	/* Different section backgrounds for light theme */
	.light-theme section:nth-of-type(2) {
		/* Leren op jouw niveau */
		background-color: hsl(220 13% 98%) !important;
	}
	
	.light-theme section:nth-of-type(3) {
		/* Klaar om te beginnen */
		background-color: hsl(220 13% 96%) !important;
	}
	
	.light-theme section:nth-of-type(4) {
		/* Voor docenten */
		background-color: hsl(220 13% 98%) !important;
	}
	
	.light-theme section:nth-of-type(5) {
		/* Docent on demand */
		background-color: hsl(220 13% 96%) !important;
	}
	
	.light-theme section:nth-of-type(6) {
		/* Thuis verder ontdekken */
		background-color: hsl(220 13% 98%) !important;
	}
	
	/* Light theme text overrides */
	.light-theme .text-white {
		color: hsl(var(--foreground)) !important;
	}
	
	.light-theme .text-white\/90 {
		color: hsl(var(--foreground) / 0.9) !important;
	}
	
	.light-theme .text-white\/60 {
		color: hsl(var(--foreground) / 0.6) !important;
	}
	
	/* Keep original stairs colors */
	.light-theme #stairGradient stop:first-child {
		stop-color: #D87C3D !important;
		stop-opacity: 0.6 !important;
	}
	
	.light-theme #stairGradient stop:nth-child(2) {
		stop-color: #7E746F !important;
		stop-opacity: 0.5 !important;
	}
	
	.light-theme #stairGradient stop:last-child {
		stop-color: #D87C3D !important;
		stop-opacity: 0.6 !important;
	}
</style>