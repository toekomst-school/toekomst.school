<script lang="ts" module>
	// Only the requested menu items with correct URLs
	const data = {
		navMain: [
			{ title: 'Planning', url: '/planning', icon: 'calendar' },
			{ title: 'Connect', url: '/connect', icon: 'presentation' },
			{ title: 'Lessen', url: '/cursussen', icon: 'bookOpen' },
			{ title: 'Game', url: '/game', icon: 'gamepad' }
		]
	};
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

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();
	
	const sidebar = Sidebar.useSidebar();

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
	let showPwaInstall = false;

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
		
		// Add click outside listener to close menus
		function handleClickOutside(event: Event) {
			const target = event.target as Element;
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
		
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};

		// PWA install detection
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			showPwaInstall = true;
		});

		// Detect if running as PWA
		const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (typeof window.navigator.standalone !== 'undefined' && (window.navigator as any).standalone === true);
		if (isStandalone) {
			showPwaInstall = false;
		}
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
		if (deferredPrompt) {
			deferredPrompt.prompt();
			deferredPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
				if (choiceResult.outcome === 'accepted') {
					showPwaInstall = false;
				}
				deferredPrompt = null;
			});
		}
	}
</script>

<Sidebar.Root variant="floating" {...restProps}>
	<Sidebar.Header>
		<div class="flex items-center justify-center py-6">
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
							{$user.name || $user.email || 'Gebruiker'}
						</div>
					{:else}
						<div class="border-b border-border pb-2 text-sm font-medium text-foreground">
							Gebruiker
						</div>
					{/if}
					<a 
						href="/profile" 
						class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						on:click={() => { closeUserMenu(); handleMenuClick(); }}
					>
						<UserIcon size="16" />
						Mijn Profiel
					</a>
					{#if $user?.labels?.includes('teacher') || $user?.labels?.includes('vakdocent')}
						<a 
							href="/team" 
							class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							on:click={() => { closeUserMenu(); handleMenuClick(); }}
						>
							<Users size={16} />
							Team
						</a>
						<a 
							href="/scholen" 
							class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							on:click={() => { closeUserMenu(); handleMenuClick(); }}
						>
							<GraduationCap size={16} />
							Scholen
						</a>
					{/if}
				</div>
			</div>
		{/if}
		
		{#if showSettingsMenu}
			<div class="user-menu-section border-sidebar-border border-t p-3">
				<div class="space-y-2">
					<div class="border-b border-border pb-2 text-sm font-medium text-foreground">
						Instellingen
					</div>
					<a 
						href="/settings" 
						class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
						on:click={() => handleSettingsNavClick('/settings')}
					>
						<Settings size={16} />
						Mijn instellingen
					</a>
					{#if isAdmin}
						<a 
							href="/admin/settings" 
							class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							on:click={() => handleSettingsNavClick('/admin/settings')}
						>
							<Settings size={16} />
							Admin instellingen
						</a>
						<a 
							href="/admin/mededelingen" 
							class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
							on:click={() => handleSettingsNavClick('/admin/mededelingen')}
						>
							<MessageSquare size={16} />
							Mededelingen
						</a>
						{#if showPwaInstall}
							<button type="button" class="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors w-full" on:click={handlePwaInstall}>
								<GalleryVerticalEndIcon size={16} />
								App installeren
							</button>
						{/if}
					{/if}
				</div>
			</div>
		{/if}
		
		<div class="border-sidebar-border user-menu-container flex items-center justify-around gap-2 border-t pt-2">
			<div
				aria-label="Toggle theme"
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
				aria-label="Settings"
				on:click={toggleSettingsMenu}
				on:keydown={(e) => e.key === 'Enter' && toggleSettingsMenu()}
				role="button"
				tabindex="0"
				class="text-teal-500 hover:text-teal-600 rounded p-2 transition-colors cursor-pointer"
			>
				<SettingsIcon />
			</div>
			<div
				aria-label="Account"
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


