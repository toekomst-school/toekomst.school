<script lang="ts">
	import { goto } from '$app/navigation';
	import LessonSelect from '$lib/components/LessonSelect.svelte';
	export let data;
	function handleLessonSelect(event) {
		console.log('Selected lesson:', event.detail.lesson);
	}
</script>

<span class="block h-20"></span>
<iframe
	src="https://bot.toekomst.school/homepage-uo9d6xo"
	style="border: none; width: 100%; height: 90vh; "
></iframe>
