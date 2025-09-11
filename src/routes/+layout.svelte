<script lang="ts">
	import '../app.css';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	// Initialize i18n
	import '$lib/i18n';
	import { _, locale, waitLocale } from 'svelte-i18n';
	import { initializeLocale } from '$lib/i18n/utils';
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription,
		SheetFooter
	} from '$lib/components/ui/sheet/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import { user, isLoading, initAuth, loginWithOAuth } from '$lib/stores/auth.js';
	import { Sun, Moon } from 'lucide-svelte';
	
	export let data;
	
	// Theme management
	let isDark = false;
	
	function initTheme() {
		// Check localStorage first, then system preference
		const stored = localStorage.getItem('theme');
		if (stored) {
			isDark = stored === 'dark';
		} else {
			isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		applyTheme();
	}
	
	function toggleTheme() {
		isDark = !isDark;
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		applyTheme();
	}
	
	function applyTheme() {
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}
	
	// Initialize auth store
	onMount(async () => {
		// Initialize theme
		initTheme();
		
		// Initialize user and locale
		if (data.user) {
			user.set(data.user);
			initializeLocale(data.user);
			isLoading.set(false);
		} else {
			await initAuth();
			// Initialize locale with user data after auth
			const currentUser = $user;
			if (currentUser) {
				initializeLocale(currentUser);
			}
		}
		
		// Wait for i18n to be ready
		await waitLocale();
		
		// Handle redirect after authentication
		const redirectUrl = sessionStorage.getItem('redirectAfterAuth');
		if (redirectUrl && $user) {
			sessionStorage.removeItem('redirectAfterAuth');
			goto(redirectUrl);
		}
		
		// Register service worker for PWA
		if ('serviceWorker' in navigator) {
			try {
				const registration = await navigator.serviceWorker.register('/sw.js');
				console.log('Service Worker registered:', registration);
				
				// Listen for service worker messages
				navigator.serviceWorker.addEventListener('message', (event) => {
					if (event.data.type === 'PLANNING_SYNCED') {
						console.log('Planning data synced in background');
						// Optionally refresh planning data in the app
					}
				});
				
				// Initialize offline functionality
				const { offlineActions } = await import('$lib/stores/offline');
				offlineActions.initialize();
				
				// Register for background sync if supported
				if (registration.sync) {
					registration.sync.register('background-sync-planning');
				}
			} catch (error) {
				console.log('Service Worker registration failed:', error);
			}
		}
	});
	
	// Define public routes that don't require authentication
	const PUBLIC_ROUTES = ['/', '/game', '/tabcontrol', '/present', '/auth/callback'];
	
	// Define routes that should not show the sidebar
	const NO_SIDEBAR_ROUTES = ['/', '/present'];
	
	let breadcrumbMain = '';
	let breadcrumbSecond = '';
	let breadcrumbPage = '';
	let breadcrumbSecondHref = '';
	
	// Initialize breadcrumb main with translation (only when locale is ready)
	$: {
		try {
			breadcrumbMain = $locale ? $_('nav.home') : 'Home';
		} catch (error) {
			console.warn('i18n not ready yet:', error);
			breadcrumbMain = 'Home';
		}
	}
	
	// Update document language when locale changes
	$: if (typeof document !== 'undefined') {
		document.documentElement.lang = $locale || 'nl';
	}

	let showRoleModal = false;
	let selectedRole = '';

	$: currentPath = $page && $page.url && $page.url.pathname ? $page.url.pathname : '';
	$: shouldShowSidebar = $user && !NO_SIDEBAR_ROUTES.includes(currentPath);
	$: isHomePage = currentPath === '/';
	
	// Handle route protection
	$: if (!$isLoading && !$user && !PUBLIC_ROUTES.includes(currentPath)) {
		// User is not authenticated and trying to access protected route
		handleAuthRedirect();
	}
	
	// Redirect logged-in users from homepage to dashboard
	$: if (!$isLoading && $user && currentPath === '/') {
		goto('/dashboard');
	}
	
	async function handleAuthRedirect() {
		// Store intended destination
		const intendedUrl = $page.url.pathname + $page.url.search + $page.url.hash;
		sessionStorage.setItem('redirectAfterAuth', intendedUrl);
		
		// Redirect to login (will trigger OAuth)
		goto('/');
	}
	$: if (typeof currentPath === 'string' && currentPath.length > 0) {
		if (currentPath.startsWith('/lessen')) {
			breadcrumbSecond = $_('nav.lessons');
			breadcrumbSecondHref = '/lessen';
			if (currentPath === '/lessen') {
				breadcrumbPage = '';
			} else if (currentPath === '/lessen/nieuw') {
				breadcrumbPage = $_('pages.new_lesson');
			} else if (/^\/lessen\/nieuw\/.+/.test(currentPath)) {
				breadcrumbPage = $_('pages.lesson_editing');
			} else if (/^\/lessen\/[a-zA-Z0-9_-]+$/.test(currentPath)) {
				breadcrumbPage = $_('pages.lesson_details');
			}
		} else if (currentPath.startsWith('/cursussen')) {
			breadcrumbSecond = $_('nav.courses');
			breadcrumbSecondHref = '/cursussen';
			if (currentPath === '/cursussen') {
				breadcrumbPage = '';
			} else if (/^\/cursussen\/[a-zA-Z0-9_-]+$/.test(currentPath)) {
				breadcrumbPage = $_('pages.course_details');
			}
		} else if (currentPath.startsWith('/scholen')) {
			breadcrumbSecond = $_('nav.schools');
			breadcrumbSecondHref = '/scholen';
			if (currentPath === '/scholen') {
				breadcrumbPage = '';
			} else if (/^\/scholen\/[a-zA-Z0-9_-]+\/bewerken$/.test(currentPath)) {
				breadcrumbPage = $_('pages.school_editing');
			} else if (/^\/scholen\/[a-zA-Z0-9_-]+(\/)?$/.test(currentPath)) {
				breadcrumbPage = $_('pages.school_details');
			}
		} else if (currentPath.startsWith('/team')) {
			breadcrumbSecond = $_('nav.team');
			breadcrumbSecondHref = '/team';
			if (currentPath === '/team') {
				breadcrumbPage = '';
			} else if (/^\/team\/[a-zA-Z0-9_-]+(\/)?$/.test(currentPath)) {
				breadcrumbPage = $_('pages.team_details');
			}
		} else if (currentPath.startsWith('/planning')) {
			breadcrumbSecond = $_('nav.planning');
			breadcrumbSecondHref = '/planning';
			if (currentPath === '/planning') {
				breadcrumbPage = '';
			} else if (currentPath === '/planning/beschikbaar') {
				breadcrumbPage = $_('pages.available');
			}
		} else if (currentPath.startsWith('/dashboard')) {
			breadcrumbSecond = $_('nav.dashboard');
			breadcrumbSecondHref = '/dashboard';
			breadcrumbPage = '';
		} else if (currentPath.startsWith('/remote')) {
			breadcrumbSecond = 'Remote';
			breadcrumbSecondHref = '/remote';
			breadcrumbPage = '';
		} else if (currentPath.startsWith('/tabcontrol')) {
			breadcrumbSecond = 'Tabcontrol';
			breadcrumbSecondHref = '/tabcontrol';
			breadcrumbPage = '';
		} else if (currentPath.startsWith('/game')) {
			breadcrumbSecond = $_('nav.game');
			breadcrumbSecondHref = '/game';
			breadcrumbPage = '';
		} else if (currentPath.startsWith('/connect')) {
			breadcrumbSecond = $_('nav.presentation');
			breadcrumbSecondHref = '/connect';
			breadcrumbPage = $_('nav.remote_control');
		} else if (currentPath.startsWith('/profile')) {
			// Determine breadcrumb based on user type
			// For team members (vakdocenten): team -> gebruiker
			// For school users (teachers/students): klas -> gebruiker  
			const isTeamMember = $user?.labels?.includes('vakdocent') || $user?.labels?.includes('admin') || $user?.labels?.includes('planning');
			
			if (isTeamMember) {
				breadcrumbSecond = $_('nav.team');
				breadcrumbSecondHref = '/team';
			} else {
				breadcrumbSecond = $_('nav.klas');
				breadcrumbSecondHref = '/klas';
			}
			
			if (/^\/profile\/[a-zA-Z0-9_-]+$/.test(currentPath)) {
				breadcrumbPage = $_('nav.gebruiker');
			} else if (currentPath === '/profile/edit') {
				breadcrumbPage = $_('pages.edit_profile');
			} else {
				breadcrumbPage = $_('pages.profile');
			}
		} else {
			breadcrumbSecond = $_('nav.overview');
			breadcrumbSecondHref = '/';
			breadcrumbPage = '';
		}
	} else {
		breadcrumbMain = $_('nav.home');
		breadcrumbSecond = '';
		breadcrumbSecondHref = '';
		breadcrumbPage = '';
	}

	$: if ($user && (!$user.labels || $user.labels.length === 0)) {
		// Automatically set user as student if no label is present
		setRole('student');
	}

	async function setRole(role: string) {
		if (!$user) return;
		selectedRole = role;
		try {
			const res = await fetch('/api/set-label', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: $user.$id, label: role })
			});
			const result = await res.json();
			if (result.success) {
				showRoleModal = false;
				// Update user store with new labels
				user.update(currentUser => ({
					...currentUser,
					labels: [...(currentUser?.labels || []), role]
				}));
			} else {
				alert($_('role.role_save_error'));
			}
		} catch (e) {
			alert($_('role.role_save_error'));
			console.error(e);
		}
	}
	
</script>

{#if $user}
	{#if showRoleModal}
		<Sheet open={showRoleModal}>
			<SheetContent side="top">
				<SheetHeader>
					<SheetTitle>{$_('user.choose_role')}</SheetTitle>
					<SheetDescription>
						{$_('user.choose_role_description')}
					</SheetDescription>
				</SheetHeader>
				<div class="my-6 flex justify-center gap-4">
					<Button
						on:click={() => setRole('teacher')}
						variant={selectedRole === 'teacher' ? 'secondary' : 'default'}>{$_('user.teacher')}</Button
					>
					<Button
						on:click={() => setRole('student')}
						variant={selectedRole === 'student' ? 'secondary' : 'default'}>{$_('user.student')}</Button
					>
				</div>
				<SheetFooter>
					<div class="text-center text-xs text-gray-500">
						{$_('role.change_later')}
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	{/if}
	
	
	{#if shouldShowSidebar}
		<Sidebar.Provider style="--sidebar-width: 19rem;">
			<AppSidebar />
			<Sidebar.Inset>
				<header class="flex h-16 shrink-0 items-center gap-2 px-4">
					<Sidebar.Trigger class="-ml-1" />
					<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
					<Breadcrumb.Root>
						<Breadcrumb.List>
							<Breadcrumb.Item class="hidden md:block">
								<Breadcrumb.Link href="/">{breadcrumbMain}</Breadcrumb.Link>
							</Breadcrumb.Item>
							{#if breadcrumbSecond}
								<Breadcrumb.Separator class="hidden md:block" />
								<Breadcrumb.Item>
									<Breadcrumb.Link href={breadcrumbSecondHref}>{breadcrumbSecond}</Breadcrumb.Link>
								</Breadcrumb.Item>
							{/if}
							{#if breadcrumbPage}
								<Breadcrumb.Separator class="hidden md:block" />
								<Breadcrumb.Item>
									<Breadcrumb.Page>{breadcrumbPage}</Breadcrumb.Page>
								</Breadcrumb.Item>
							{/if}
						</Breadcrumb.List>
					</Breadcrumb.Root>
				</header>
				<div class="flex flex-1 flex-col gap-4 p-4 pt-0">
					<slot />
				</div>
			</Sidebar.Inset>
		</Sidebar.Provider>
	{:else}
		<slot />
	{/if}
{:else}
	<div class="fixed top-4 left-4 z-50">
		<img src="/toekomst_logo.svg" alt="Toekomst Logo" class="h-12 w-auto logo-invert-light" />
	</div>
	<div class="fixed top-4 right-4 z-50 flex items-center gap-3">
		<!-- Theme toggle icon -->
		<button
			on:click={toggleTheme}
			class="transition-colors cursor-pointer"
			aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
			style="background: none; border: none; padding: 0; color: {isDark ? 'white' : 'black'};"
		>
			{#if isDark}
				<Sun class="h-6 w-6" />
			{:else}
				<Moon class="h-6 w-6" />
			{/if}
		</button>
		
		<!-- Login button -->
		<button
			on:click={() => loginWithOAuth()}
			class="flex h-10 items-center rounded bg-primary px-6 text-primary-foreground shadow-lg transition hover:bg-primary/90"
			style="line-height:1;"
		>
			{$_('user.login')}
		</button>
	</div>
	<slot />
{/if}

<!-- {@render children()} -->
