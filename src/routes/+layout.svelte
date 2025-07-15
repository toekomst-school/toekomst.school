<script lang="ts">
	import '../app.css';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
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
	
	export let data;
	
	// Initialize auth store
	onMount(async () => {
		if (data.user) {
			user.set(data.user);
			isLoading.set(false);
		} else {
			await initAuth();
		}
		
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
	
	let breadcrumbMain = 'Home';
	let breadcrumbSecond = '';
	let breadcrumbPage = '';
	let breadcrumbSecondHref = '';

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
			breadcrumbSecond = 'Lessen';
			breadcrumbSecondHref = '/lessen';
			if (currentPath === '/lessen') {
				breadcrumbPage = '';
			} else if (currentPath === '/lessen/nieuw') {
				breadcrumbPage = 'Nieuwe Les';
			} else if (/^\/lessen\/nieuw\/.+/.test(currentPath)) {
				breadcrumbPage = 'Les Bewerken';
			} else if (/^\/lessen\/[a-zA-Z0-9_-]+$/.test(currentPath)) {
				breadcrumbPage = 'Les Details';
			}
		} else if (currentPath.startsWith('/cursussen')) {
			breadcrumbSecond = 'Cursussen';
			breadcrumbSecondHref = '/cursussen';
			if (currentPath === '/cursussen') {
				breadcrumbPage = '';
			} else if (/^\/cursussen\/[a-zA-Z0-9_-]+$/.test(currentPath)) {
				breadcrumbPage = 'Cursus Details';
			}
		} else if (currentPath.startsWith('/scholen')) {
			breadcrumbSecond = 'Scholen';
			breadcrumbSecondHref = '/scholen';
			if (currentPath === '/scholen') {
				breadcrumbPage = '';
			} else if (/^\/scholen\/[a-zA-Z0-9_-]+\/bewerken$/.test(currentPath)) {
				breadcrumbPage = 'School Bewerken';
			} else if (/^\/scholen\/[a-zA-Z0-9_-]+(\/)?$/.test(currentPath)) {
				breadcrumbPage = 'School Details';
			}
		} else if (currentPath.startsWith('/team')) {
			breadcrumbSecond = 'Team';
			breadcrumbSecondHref = '/team';
			if (currentPath === '/team') {
				breadcrumbPage = '';
			} else if (/^\/team\/[a-zA-Z0-9_-]+(\/)?$/.test(currentPath)) {
				breadcrumbPage = 'Team Details';
			}
		} else if (currentPath.startsWith('/planning')) {
			breadcrumbSecond = 'Planning';
			breadcrumbSecondHref = '/planning';
			if (currentPath === '/planning') {
				breadcrumbPage = '';
			} else if (currentPath === '/planning/beschikbaar') {
				breadcrumbPage = 'Beschikbaar';
			}
		} else if (currentPath.startsWith('/dashboard')) {
			breadcrumbSecond = 'Dashboard';
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
			breadcrumbSecond = 'Game';
			breadcrumbSecondHref = '/game';
			breadcrumbPage = '';
		} else if (currentPath.startsWith('/connect')) {
			breadcrumbSecond = 'Presentatie';
			breadcrumbSecondHref = '/connect';
			breadcrumbPage = 'Remote Control';
		} else {
			breadcrumbSecond = 'Overzicht';
			breadcrumbSecondHref = '/';
			breadcrumbPage = '';
		}
	} else {
		breadcrumbMain = 'Home';
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
				alert('Kon rol niet opslaan. Probeer opnieuw.');
			}
		} catch (e) {
			alert('Kon rol niet opslaan. Probeer opnieuw.');
			console.error(e);
		}
	}
	
</script>

{#if $user}
	{#if showRoleModal}
		<Sheet open={showRoleModal}>
			<SheetContent side="top">
				<SheetHeader>
					<SheetTitle>Kies je rol</SheetTitle>
					<SheetDescription>
						Ben je een leraar of een leerling? Dit helpt ons de juiste ervaring te bieden.
					</SheetDescription>
				</SheetHeader>
				<div class="my-6 flex justify-center gap-4">
					<Button
						on:click={() => setRole('teacher')}
						variant={selectedRole === 'teacher' ? 'secondary' : 'default'}>Leraar</Button
					>
					<Button
						on:click={() => setRole('student')}
						variant={selectedRole === 'student' ? 'secondary' : 'default'}>Leerling</Button
					>
				</div>
				<SheetFooter>
					<div class="text-center text-xs text-gray-500">
						Je kunt dit later aanpassen via je profiel.
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
	<div class="fixed top-4 right-4 z-50">
		<button
			on:click={() => loginWithOAuth()}
			class="flex h-10 items-center rounded bg-primary px-6 text-primary-foreground shadow-lg transition hover:bg-primary/90"
			style="line-height:1;"
		>
			Login
		</button>
	</div>
	<slot />
{/if}

<!-- {@render children()} -->
