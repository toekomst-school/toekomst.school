<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import { _ } from 'svelte-i18n';

	onMount(() => {
		// Redirect to user's own profile page
		if ($user?.$id) {
			goto(`/profile/${$user.$id}`, { replaceState: true });
		} else {
			// If no user, redirect to login or home
			goto('/connect', { replaceState: true });
		}
	});
</script>

<div class="flex items-center justify-center min-h-[400px]">
	<div class="text-center">
		<p class="text-muted-foreground">{$_('profile.redirecting')}</p>
	</div>
</div>