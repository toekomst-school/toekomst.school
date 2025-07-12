<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { account } from '$lib/appwrite';
	import { user } from '$lib/stores/auth.js';

	let status = 'Processing authentication...';
	let error = '';

	onMount(async () => {
		try {
			const urlParams = new URLSearchParams(window.location.search);
			const userId = urlParams.get('userId');
			const secret = urlParams.get('secret');
			
			// Check for stored redirect URL
			const storedRedirect = sessionStorage.getItem('redirectAfterAuth');
			const redirectTo = storedRedirect || '/dashboard';

			if (userId && secret) {
				console.log('Creating OAuth session with:', { userId, secret });

				// Create session using the OAuth callback parameters
				await account.createSession(userId, secret);
				
				// Update the auth store with the new user
				const userAccount = await account.get();
				user.set(userAccount);

				status = 'Authentication successful! Redirecting...';

				// Clear the stored redirect URL
				if (storedRedirect) {
					sessionStorage.removeItem('redirectAfterAuth');
				}

				// Wait a moment for the session to be established
				setTimeout(() => {
					goto(redirectTo);
				}, 1000);
			} else {
				console.log('No OAuth parameters found, checking if already authenticated');

				// Check if user is already authenticated
				const userAccount = await account.get();
				if (userAccount) {
					user.set(userAccount);
					goto(redirectTo);
				} else {
					throw new Error('No authentication parameters found');
				}
			}
		} catch (err) {
			console.error('Authentication error:', err);
			error = 'Authentication failed. Please try again.';
			status = 'Authentication failed';

			// Redirect to login after a delay
			setTimeout(() => {
				goto('/');
			}, 3000);
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="text-center">
		<div class="mb-4">
			<div class="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
		</div>

		<h2 class="mb-2 text-xl font-semibold">{status}</h2>

		{#if error}
			<p class="mb-4 text-red-600">{error}</p>
			<p class="text-gray-600">Redirecting to login page...</p>
		{/if}
	</div>
</div>
