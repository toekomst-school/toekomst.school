<script lang="ts">
  import { goto } from '$app/navigation';
  export let data;
  if (typeof window !== 'undefined' && data?.user) {
    goto('/dashboard');
  }
</script>

<iframe
  src="https://bot.toekomst.school/homepage-uo9d6xo"
  style="border: none; width: 100%; height: 100vh"
></iframe>
