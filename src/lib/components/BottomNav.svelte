<script>
  import { goto } from '$app/navigation';
  import homeIcon from '$lib/assets/menu-icon-home.svg';
  import addIcon from '$lib/assets/menu-icon-add.svg';
  import medalIcon from '$lib/assets/menu-icon-medal.svg';
  import noteIcon from '$lib/assets/menu-icon-note.svg';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';

  // Optional prop for custom add button handler
  export let onAddClick = null;
</script>

<nav class="bottom-nav">
  <button type="button" class="nav-button" aria-label="Home" on:click={() => goto('/tasks')}>
    <img src={homeIcon} alt="Home"/>
  </button>
  <button type="button" class="nav-button" aria-label="Profile" on:click={() => goto('/profile')}>
    <img src={profileIcon} alt="Profile"/>
  </button>
  <button 
    class="fab nav-button" 
    type="button" 
    aria-label="Add new task" 
    on:click={() => onAddClick ? onAddClick() : goto('/tasks')}
  >
    <img src={addIcon} alt="Add"/>
  </button>
  <button type="button" class="nav-button" aria-label="Notes" on:click={() => goto('/notes')}>
    <img src={noteIcon} alt="Notes"/>
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
    justify-content: space-around;
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

  .nav-button img {
    width: 24px;
    height: 24px;
  }

  .fab {
    /* Add any special styling for the floating action button if needed */
  }

  @media (max-width: 420px) {
    .bottom-nav {
      width: 100%;
    }
  }
</style>

