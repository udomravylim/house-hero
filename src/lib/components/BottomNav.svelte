<script>
  import { goto } from '$app/navigation';
  import homeIcon from '$lib/assets/menu-icon-home.svg';
  import addIcon from '$lib/assets/menu-icon-add.svg';
  import medalIcon from '$lib/assets/menu-icon-medal.svg';
  import noteIcon from '$lib/assets/menu-icon-note.svg';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';

  // Optional prop for custom add button handler
  export let onAddClick = null;
  // Optional prop for custom home button handler
  export let onHomeClick = null;

  function handleAddClick() {
    if (onAddClick) {
      // If we're on the tasks page and have the handler, use it
      onAddClick();
    } else {
      // If we're not on tasks page, navigate to tasks with add=true query param
      goto('/tasks?add=true');
    }
  }

  function handleHomeClick() {
    if (onHomeClick) {
      // If we have a custom handler, use it
      onHomeClick();
    } else {
      // Otherwise, just navigate to tasks
      goto('/tasks');
    }
  }
</script>

<nav class="bottom-nav">
  <button type="button" class="nav-button" aria-label="Home" on:click={handleHomeClick}>
    <img src={homeIcon} alt="Home"/>
  </button>
  <button 
    class="fab nav-button" 
    type="button" 
    aria-label="Add new task" 
    on:click={handleAddClick}
  >
    <img src={addIcon} alt="Add"/>
  </button>
  <button type="button" class="nav-button" aria-label="Achievements" on:click={() => goto('/leaderboard')}>
    <img src={medalIcon} alt="Achievements"/>
  </button>
</nav>

<style>
  .bottom-nav {
    max-width: 420px;
    margin: 0 auto;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 72px;
    background: #9fe0d9;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;    
    z-index: 100;
  }

  .nav-button {
    background: none;
    border: none;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }


  @media (max-width: 420px) {
    .bottom-nav {
      width: 100%;
    }
  }
</style>

