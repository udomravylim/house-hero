<script>
	import favicon from '$lib/assets/favicon.svg';
	import { initAuth } from '$lib/stores/user.js';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		initAuth();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
