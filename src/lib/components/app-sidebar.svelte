<script lang="ts" module>
	// Static navigation menu items - translations will be applied in instance script
	const navItems = [
		{ titleKey: 'nav.planning', url: '/planning', icon: 'calendar' },
		{ titleKey: 'nav.connect', url: '/connect', icon: 'presentation' },
		{ titleKey: 'nav.lessons', url: '/cursussen', icon: 'bookOpen' },
		{ titleKey: 'nav.game', url: '/game', icon: 'gamepad' }
	];
</script>

<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end';
	import type { ComponentProps } from 'svelte';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import UserIcon from '@lucide/svelte/icons/user';
	import { MessageSquare, Users, Building, Settings, GraduationCap, Calendar, Presentation, BookOpen, Gamepad2 } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import { _ } from 'svelte-i18n';
	import { notificationCounts, announcementActions } from '$lib/stores/announcements';
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet/index.js';
	import * as Dialog from "$lib/components/ui/dialog/index.js";

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
	
	const sidebar = Sidebar.useSidebar();
	
	// Create reactive navigation data with translations
	let data = $derived({
		navMain: navItems.map(item => ({
			title: $_(item.titleKey),
			url: item.url,
			icon: item.icon
		}))
	});

	const themeStore = writable('dark');
	let theme = $state('dark');
	const unsubscribe = themeStore.subscribe((value) => (theme = value));
	
	// User menu state
	let showUserMenu = $state(false);
	let showSettingsMenu = $state(false);
	
	// Admin status
	let isAdmin = $state(false);

	// PWA install prompt logic
	let deferredPrompt: BeforeInstallPromptEvent | null = null;
	let isInstallable = false;
	let isInstalled = false;
	let installButtonText = 'App installeren';

	type BeforeInstallPromptEvent = Event & {
		prompt: () => void;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	};

	function toggleTheme() {
		themeStore.update((current) => {
			const next = current === 'dark' ? 'light' : 'dark';
			document.documentElement.classList.toggle('dark', next === 'dark');
			document.documentElement.classList.toggle('light', next === 'light');
			localStorage.setItem('theme', next);
			return next;
		});
	}

	onMount(() => {
		const saved = localStorage.getItem('theme');
		if (saved === 'light' || saved === 'dark') {
			themeStore.set(saved);
			document.documentElement.classList.toggle('dark', saved === 'dark');
			document.documentElement.classList.toggle('light', saved === 'light');
		} else {
			themeStore.set('dark');
			document.documentElement.classList.add('dark');
		}
		
		// Check admin status
		if ($user?.labels?.includes('admin')) {
			isAdmin = true;
		}
		
		// Load announcement notifications for admin users
		if ($user?.labels?.includes('admin') || $user?.labels?.includes('planning')) {
			announcementActions.fetchAnnouncements({}, true);
		}
		
		// Add click outside listener to close menus
		function handleClickOutside(event: Event) {
			const target = event.target as Element;
			// Don't close menus if clicking on dialog elements
			if (target && (target.closest('[data-slot="dialog-trigger"]') || target.closest('[data-slot="dialog-content"]'))) {
				return;
			}
			if (showUserMenu && target && !target.closest('.user-menu-container')) {
				console.log('Clicking outside, closing user menu');
				showUserMenu = false;
			}
			if (showSettingsMenu && target && !target.closest('.user-menu-container')) {
				console.log('Clicking outside, closing settings menu');
				showSettingsMenu = false;
			}
		}
		
		document.addEventListener('click', handleClickOutside);
		
		// PWA Debug logging
		console.log('🔍 PWA Debug: Starting PWA detection...');
		
		// Detect if running as PWA (standalone)
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
		console.log('🔍 PWA Debug: Standalone detection:', {
			mediaQuery: window.matchMedia('(display-mode: standalone)').matches,
			navigatorStandalone: (window.navigator as any).standalone,
			isStandalone
		});
		
		if (isStandalone) {
			console.log('🔍 PWA Debug: App is already installed (standalone mode)');
			isInstalled = true;
			isInstallable = false;
			installButtonText = 'Geïnstalleerd';
			console.log('🔍 PWA Debug: State updated - isInstalled:', isInstalled, 'isInstallable:', isInstallable, 'text:', installButtonText);
			return;
		} else {
			// Show install button for non-standalone users
			isInstallable = true;
			installButtonText = 'App installeren';
		}

		// Listen for beforeinstallprompt
		window.addEventListener('beforeinstallprompt', (e) => {
			console.log('🔍 PWA Debug: beforeinstallprompt event fired!', e);
			e.preventDefault();
			deferredPrompt = e as BeforeInstallPromptEvent;
			isInstallable = true;
			isInstalled = false;
			installButtonText = 'App installeren';
			console.log('🔍 PWA Debug: State updated after beforeinstallprompt - isInstallable:', isInstallable, 'isInstalled:', isInstalled, 'text:', installButtonText);
		});

		// Listen for appinstalled
		window.addEventListener('appinstalled', (e) => {
			console.log(' PWA Debug: appinstalled event fired!', e);
			isInstalled = true;
			isInstallable = false;
			installButtonText = 'Geïnstalleerd';
			console.log('🔍 PWA Debug: State updated after appinstalled - isInstallable:', isInstallable, 'isInstalled:', isInstalled, 'text:', installButtonText);
		});
		
		// Log initial state
		console.log(' PWA Debug: Initial state - isInstallable:', isInstallable, 'isInstalled:', isInstalled, 'text:', installButtonText);
		
		// Check if service worker is registered
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistration().then(registration => {
				console.log(' PWA Debug: Service Worker registration:', registration);
			});
		} else {
			console.log(' PWA Debug: Service Worker not supported');
		}
		
		// Check if manifest is accessible
		fetch('/manifest.json')
			.then(response => {
				console.log('🔍 PWA Debug: Manifest fetch result:', response.status, response.ok);
				return response.json();
			})
			.then(manifest => {
				console.log('🔍 PWA Debug: Manifest content:', manifest);
			})
			.catch(error => {
				console.log('🔍 PWA Debug: Manifest fetch error:', error);
			});
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function handleMenuClick() {
		// Close mobile sidebar when clicking menu items
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}
	
	function toggleUserMenu() {
		console.log('Toggle user menu clicked, current state:', showUserMenu);
		showUserMenu = !showUserMenu;
		// Close settings menu if it's open
		if (showUserMenu && showSettingsMenu) {
			showSettingsMenu = false;
		}
		console.log('New state:', showUserMenu);
	}
	
	function closeUserMenu() {
		showUserMenu = false;
	}
	
	function toggleSettingsMenu() {
		showSettingsMenu = !showSettingsMenu;
		// Close user menu if it's open
		if (showSettingsMenu && showUserMenu) {
			showUserMenu = false;
		}
	}
	
	function closeSettingsMenu() {
		showSettingsMenu = false;
	}
	
	function handleSettingsNavClick(url: string) {
		goto(url);
		closeSettingsMenu();
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}

	function handlePwaInstall() {
		console.log(' PWA Debug: Install button clicked');
		console.log(' PWA Debug: Current state - deferredPrompt:', !!deferredPrompt, 'isInstallable:', isInstallable, 'isInstalled:', isInstalled);
		
		if (deferredPrompt) {
			console.log(' PWA Debug: Triggering install prompt...');
			deferredPrompt.prompt();
			deferredPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
				console.log(' PWA Debug: Install prompt result:', choiceResult);
				if (choiceResult.outcome === 'accepted') {
					console.log(' PWA Debug: Install accepted, updating state...');
					isInstalled = true;
					isInstallable = false;
					installButtonText = 'Geïnstalleerd';
					console.log('🔍 PWA Debug: State updated after install - isInstallable:', isInstallable, 'isInstalled:', isInstalled, 'text:', installButtonText);
				}
				deferredPrompt = null;
			});
		} else {
			console.log('🔍 PWA Debug: No deferredPrompt available');
		}
	}
	
	function getInstallInstructions() {
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isAndroid = /Android/.test(navigator.userAgent);
		const isChrome = /Chrome/.test(navigator.userAgent);
		const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;
		
		if (isIOS && isSafari) {
			return {
				title: "Installeer op iOS",
				steps: [
					"Tik op het deel-icoon onderin Safari",
					"Scroll naar beneden en tik op 'Voeg toe aan beginscherm'",
					"Tik op 'Voeg toe' om te bevestigen"
				]
			};
		} else if (isAndroid) {
			return {
				title: "Installeer op Android",
				steps: [
					"Tik op het menu (⋮) rechtsboven in je browser",
					"Selecteer 'App installeren' of 'Toevoegen aan startscherm'",
					"Tik op 'Installeren' om te bevestigen"
				]
			};
		} else {
			return {
				title: "Installeer op Desktop",
				steps: [
					"Klik op het installatie-icoon in de adresbalk",
					"Of ga naar het browsermenu en selecteer 'Toekomst School installeren'",
					"Volg de instructies om de app te installeren"
				]
			};
		}
	}
</script>

<Sidebar.Root variant="floating" {...restProps}>
	<Sidebar.Header>
		<div class="flex items-center justify-center py-6 relative">
			<img 
				src="/toekomst_logo.svg" 
				alt="Toekomst Logo" 
				class="logo-invert-light h-12 w-auto hover:opacity-80 transition-opacity cursor-pointer" 
				on:click={() => { goto('/dashboard'); handleMenuClick(); }}
				on:keydown={(e) => { if (e.key === 'Enter') { goto('/dashboard'); handleMenuClick(); } }}
				role="button"
				tabindex="0"
				aria-label="Ga naar dashboard"
			/>
			{#if $notificationCounts.total > 0}
				<div class="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse
					{$notificationCounts.hasUrgent ? 'bg-orange-500' : 'bg-teal-500'}">
				</div>
			{/if}
		</div>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.Menu class="gap-2">
				{#each data.navMain as item (item.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props })}
								<a href={item.url} class="flex items-center gap-2 font-medium" {...props} on:click={handleMenuClick}>
									{#if item.icon === 'calendar'}
										<Calendar size={16} />
									{:else if item.icon === 'presentation'}
										<Presentation size={16} />
									{:else if item.icon === 'bookOpen'}
										<BookOpen size={16} />
									{:else if item.icon === 'gamepad'}
										<Gamepad2 size={16} />
									{/if}
									{item.title}
								</a>
							{/snippet}
						</Sidebar.MenuButton>
						{#if item.children}
							<Sidebar.MenuSub>
								{#each item.children as subitem (subitem.title)}
									<Sidebar.MenuSubItem>
										<Sidebar.MenuSubButton>
											<a href={subitem.url} class="font-medium" on:click={handleMenuClick}>{subitem.title}</a>
										</Sidebar.MenuSubButton>
									</Sidebar.MenuSubItem>
								{/each}
							</Sidebar.MenuSub>
						{/if}
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<!-- User Menu -->
		{#if showUserMenu}
			<div class="user-menu-section border-sidebar-border border-t p-3">
				<div class="space-y-2">
					{#if $user}
						<div class="border-b border-border pb-2 text-sm font-medium text-foreground">
							{$user.name || $user.email || $_('user.profile')}
						</div>
					{:else}
						<div class="border-b border-border pb-2 text-sm font-medium text-foreground">
							{$_('user.profile')}
						</div>
					{/if}
					<a 
						href={$user ? `/profile/${$user.$id}` : '/profile'} 
						class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						on:click={() => { closeUserMenu(); handleMenuClick(); }}
					>
						<UserIcon size="16" />
						{$_('user.profile')}
					</a>
					{#if $user?.labels?.includes('teacher') || $user?.labels?.includes('vakdocent')}
						<a 
							href="/team" 
							class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							on:click={() => { closeUserMenu(); handleMenuClick(); }}
						>
							<Users size={16} />
							{$_('nav.team')}
						</a>
						<a 
							href="/scholen" 
							class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							on:click={() => { closeUserMenu(); handleMenuClick(); }}
						>
							<GraduationCap size={16} />
							{$_('nav.schools')}
						</a>
					{/if}
				</div>
			</div>
		{/if}
		
		{#if showSettingsMenu}
			<div class="user-menu-section border-sidebar-border border-t p-3">
				<div class="space-y-2">
					<div class="border-b border-border pb-2 text-sm font-medium text-foreground">
						{$_('app.settings')}
					</div>
					<a 
						href="/instellingen" 
						class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						on:click={() => handleSettingsNavClick('/instellingen')}
					>
						<Settings size={16} />
						{$_('user.settings')}
					</a>
					{#if isAdmin}
						<a 
							href="/admin/settings" 
							class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							on:click={() => handleSettingsNavClick('/admin/settings')}
						>
							<Settings size={16} />
							Admin {$_('user.settings')}
						</a>
						<a 
							href="/admin/mededelingen" 
							class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors relative"
							on:click={() => handleSettingsNavClick('/admin/mededelingen')}
						>
							<MessageSquare size={16} />
							<span class="flex-1">Mededelingen</span>
							{#if $notificationCounts.total > 0}
								<div class="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white
									{$notificationCounts.hasUrgent ? 'bg-orange-500' : 'bg-teal-500'}">
									{$notificationCounts.total > 99 ? '99+' : $notificationCounts.total}
								</div>
							{/if}
						</a>
					{/if}
					{#if (isInstallable || isInstalled) && !isInstalled}
						<Dialog.Root>
							<Dialog.Trigger class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors w-full" on:click={(e) => { e.stopPropagation(); console.log('Dialog trigger clicked!'); }}>
								<GalleryVerticalEndIcon size={16} />
								{$_('app.install')}
							</Dialog.Trigger>
							<Dialog.Content class="bg-[var(--background)] text-foreground border border-border" showCloseButton={false}>
								{@const instructions = getInstallInstructions()}
								<Dialog.Header>
									<Dialog.Title>{instructions.title}</Dialog.Title>
									<Dialog.Description>
										Volg deze stappen om Toekomst School als app te installeren:
									</Dialog.Description>
								</Dialog.Header>
								<div class="my-6">
									<ol class="space-y-3">
										{#each instructions.steps as step, index}
											<li class="flex gap-3">
												<span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
													{index + 1}
												</span>
												<span class="text-sm">{step}</span>
											</li>
										{/each}
									</ol>
								</div>
								<div class="flex justify-end gap-2">
									{#if deferredPrompt}
										<button 
											type="button" 
											class="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
											on:click={handlePwaInstall}
										>
											Installeer Nu
										</button>
									{/if}
									<Dialog.Close class="bg-muted hover:bg-muted/80 text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors">
										Sluiten
									</Dialog.Close>
								</div>
							</Dialog.Content>
						</Dialog.Root>
					{/if}
				</div>
			</div>
		{/if}
		
		<div class="border-sidebar-border user-menu-container flex items-center justify-around gap-2 border-t pt-2">
			<div
				aria-label={$_('app.theme')}
				on:click={toggleTheme}
				on:keydown={(e) => e.key === 'Enter' && toggleTheme()}
				role="button"
				tabindex="0"
				class="text-teal-500 hover:text-teal-600 rounded p-2 transition-colors cursor-pointer"
			>
				{#if theme === 'dark'}
					<SunIcon />
				{:else}
					<MoonIcon />
				{/if}
			</div>
			<div
				aria-label={$_('app.settings')}
				on:click={toggleSettingsMenu}
				on:keydown={(e) => e.key === 'Enter' && toggleSettingsMenu()}
				role="button"
				tabindex="0"
				class="text-teal-500 hover:text-teal-600 rounded p-2 transition-colors cursor-pointer"
			>
				<SettingsIcon />
			</div>
			<div
				aria-label={$_('user.profile')}
				on:click={toggleUserMenu}
				on:keydown={(e) => e.key === 'Enter' && toggleUserMenu()}
				role="button"
				tabindex="0"
				class="text-teal-500 hover:text-teal-600 rounded p-2 transition-colors cursor-pointer"
			>
				<UserIcon />
			</div>
		</div>
	</Sidebar.Footer>
</Sidebar.Root>

