<script lang="ts">
  import { goto } from '$app/navigation';
  import LessonSelect from '$lib/components/LessonSelect.svelte';
  export let data;
  if (typeof window !== 'undefined' && data?.user) {
    goto('/dashboard');
  }
  function handleLessonSelect(event) {
    console.log('Selected lesson:', event.detail.lesson);
  }
</script>

<span class="h-20 block"></span>
<iframe
  src="https://bot.toekomst.school/homepage-uo9d6xo"
  style="border: none; width: 100%; height: 90vh; "
></iframe>
