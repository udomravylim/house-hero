<script>
import homeIcon from '$lib/assets/menu-icon-home.svg';
  import addIcon from '$lib/assets/menu-icon-add.svg';
  import medalIcon from '$lib/assets/menu-icon-medal.svg';
  import noteIcon from '$lib/assets/menu-icon-note.svg';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';
  import liladdIcon from '$lib/assets/add-icon.svg';
  import { goto } from '$app/navigation';
</script>
<main>
     <nav class="bottom-nav">
    <button type="button" class="nav-button" aria-label="Home" on:click={() => goto('/tasks')}><img src={homeIcon} alt="Home"/></button>
    <button type="button" class="nav-button" aria-label="Profile" on:click={() => goto('/tasks')}><img src={profileIcon} alt="Profile"/></button>
    <button class="fab, nav-button" on:click={() => (showAdd = !showAdd)} type="button" aria-label="Add new task"><img src={addIcon} alt="Add"/></button>
    <button type="button" class="nav-button" aria-label="Notes"><img src={noteIcon} alt="Notes"/></button>
    <button type="button" class="nav-button" aria-label="Achievements"><img src={medalIcon} alt="Achievements"/></button>
  </nav>
</main>
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
  }
.nav-button {
    background: none;
    border: none;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
  }
</style>