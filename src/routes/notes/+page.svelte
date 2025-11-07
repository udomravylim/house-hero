<script>
  import BottomNav from '$lib/components/BottomNav.svelte';
  import { user, getUserDisplayName } from '$lib/stores/user.js';
</script>

<main>
  <header>
    <h1>Household Notes</h1>
  </header>

  <section class="list">
    <div class="note-card">
      <p>Click to leave note to household!</p>
    </div>

    <div class="note-card">
      <p>Click to leave note to household!</p>
    </div>

    <div class="note-card">
      <p>Click to leave note to household!</p>
    </div>
  </section>

  <BottomNav />
</main>

<style>
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

  h1 {
    font-size: 32px;
    font-weight: 800;
    margin: 0;
  }

  .list {
    margin-top: 8px;
  }

  .note-card {
    background: #dff5f3;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border-left: 4px solid #a5d9d4;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  }

  .note-card p {
    margin: 0;
    font-size: 0.9rem;
    color: #0d0d0d;
  }
</style>
