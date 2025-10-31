<script>
  import TaskItem from '$lib/components/TaskItem.svelte';
  import homeIcon from '$lib/assets/menu-icon-home.svg';
  import addIcon from '$lib/assets/menu-icon-add.svg';
  import medalIcon from '$lib/assets/menu-icon-medal.svg';
  import noteIcon from '$lib/assets/menu-icon-note.svg';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';
  import liladdIcon from '$lib/assets/add-icon.svg';
//   import filtericon from '$lib/assets/filter-icon.svg';
  import { user, getUserDisplayName } from '$lib/stores/user.js';
  import { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, toggleTaskCompletion, getUsers } from '$lib/stores/tasks.js';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

</script>

<div class="notes-page">
  <header class="notes-header">
    <h1 class="notes-title">Household Notes</h1>
    <!-- <div class="filter-icons">
      <button class="nav-button" aria-label="Filter notes"><img src={filtericon} alt="Filter"/></button>
    </div> -->
  </header>

  <main class="notes-list">
    <div class="note-card">
      <p>Click to leave note to household!</p>
    </div>

    <div class="note-card">
      <p>Click to leave note to household!</p>
    </div>

    <div class="note-card">
      <p>Click to leave note to household!</p>
    </div>
  </main>

   <nav class="bottom-nav">
    <button type="button" class="nav-button" aria-label="Home" on:click={() => goto('/tasks')}><img src={homeIcon} alt="Home"/></button>
    <button type="button" class="nav-button" aria-label="Profile" on:click={() => goto('/tasks')}><img src={profileIcon} alt="Profile"/></button>
    <button class="fab, nav-button" on:click={() => (showAdd = !showAdd)} type="button" aria-label="Add new task"><img src={addIcon} alt="Add"/></button>
    <button type="button" class="nav-button" aria-label="Notes"><img src={noteIcon} alt="Notes"/></button>
    <button type="button" class="nav-button" aria-label="Achievements"><img src={medalIcon} alt="Achievements"/></button>
  </nav>

</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', sans-serif;
    background-color: white;
  }

.notes-header {
  position: relative;
  background-color: #a5d9d4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  height: 75px;
}

.notes-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
}

  .notes-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    justify-content: space-between;
  }

  .notes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
  }

  .notes-title {
    background: white;
    border-radius: 10px;
    padding: 0.6rem 1rem;
    font-weight: 600;
    color: #0d0d0d;
  }

  .filter-icons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .notes-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem 0;
    flex: 1;
    overflow-y: auto;
  }

  .note-card {
    position: relative;
    background: #dff5f3;
    width: 350px;
    height: 85px;
    padding: 1rem;
    border-radius: 10px;
    box-sizing: border-box;
    text-align: center;
  }

  .note-card p {
    margin: 0;
    font-size: 0.9rem;
    color: #0d0d0d;
    padding: center
  }

  .note-title {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    background: #ffd54f;
    color: #000;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: 10px;
    padding: 0.2rem 0.6rem;
  }

  .bottom-nav {
    display: flex;
    justify-content: space-around;
    align-items: center;
    background-color: #a5d9d4;
    padding: 0.5rem 0;
    border-top: 2px solid #0d0d0d10;
  }

  main {
    max-width: 420px;
    margin: 0 auto;
    padding: 28px 20px 100px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }

  .nav-button {
    background: none;
    border: none;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
  }

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

</style>

<!-- <h1>Login Page</h1> -->