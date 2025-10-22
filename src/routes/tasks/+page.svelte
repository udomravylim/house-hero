<script>
  import TaskItem from '$lib/components/TaskItem.svelte';
  import homeIcon from '$lib/assets/menu-icon-home.svg';
  import addIcon from '$lib/assets/menu-icon-add.svg';
  import medalIcon from '$lib/assets/menu-icon-medal.svg';
  import noteIcon from '$lib/assets/menu-icon-note.svg';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';
  import liladdIcon from '$lib/assets/add-icon.svg';

  let view = 'yours';
  let showAdd = false;
  let newTitle = '';
  let newDate = '';
  let newAssignee = 'J';

  let tasks = [
    { id: 1, title: 'Laundry', date: '10/3/25', assigneeInitial: 'J', assignedTo: 'jessica', done: false },
    { id: 2, title: 'Laundry', date: '10/3/25', assigneeInitial: 'J', assignedTo: 'unassigned', done: false },
    { id: 3, title: 'Laundry', date: '10/3/25', assigneeInitial: 'J', assignedTo: 'jessica', done: false },
    { id: 4, title: 'Laundry', date: '10/3/25', assigneeInitial: 'J', assignedTo: 'jessica', done: false },
    { id: 5, title: 'Laundry', date: '10/3/25', assigneeInitial: 'J', assignedTo: 'jessica', done: false }
  ];

  function filteredTasks() {
    return tasks.filter((t) => (view === 'yours' ? t.assignedTo === 'jessica' : t.assignedTo === 'unassigned'));
  }

  function handleToggle(ev) {
    const id = ev.detail.id;
    tasks = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  }

  function addTask() {
    if (!newTitle.trim()) return;
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    const date = newDate || new Date().toLocaleDateString('en-US');
    const assignedTo = newAssignee.toLowerCase() === 'j' ? 'jessica' : 'unassigned';
    tasks = [
      { id, title: newTitle, date, assigneeInitial: newAssignee.toUpperCase(), assignedTo, done: false },
      ...tasks
    ];
    newTitle = '';
    newDate = '';
    newAssignee = 'J';
    showAdd = false;
  }
</script>

<main>
  <header>
    <h1>Hi Jessica!</h1>
  </header>

  <section class="controls">
    <div class="tasks-label">
      <strong>Tasks</strong>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#222" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <path d="M10 18h4" />
        <path d="M3 6h18" />
        <path d="M6 12h12" />
      </svg>
    </div>

    <div class="tabs">
      <button class:active={view === 'yours'} on:click={() => (view = 'yours')}>Yours</button>
      <button class:active={view === 'unassigned'} on:click={() => (view = 'unassigned')}>Unassigned</button>
    </div>

    <!-- <div class="add-icon" on:click={() => (showAdd = !showAdd)}>
      <div class="plus">+</div>
    </div> -->
  </section>

  {#if showAdd}
    <div class="add-form">
      <input placeholder="Task title" bind:value={newTitle} />
      <input placeholder="Date (mm/dd/yy)" bind:value={newDate} />
      <input placeholder="Initial" bind:value={newAssignee} maxlength="1" style="width:60px" />
      <button on:click={addTask}>Add</button>
    </div>
  {/if}

  <section class="list">
    {#each filteredTasks() as task (task.id)}
      <TaskItem {task} on:toggle={handleToggle} />
    {/each}
  </section>

  <nav class="bottom-nav">
    <div><img src={homeIcon} alt="Filter"/></div>
    <div><img src={profileIcon} alt="Filter"/></div>
    <div><img src={addIcon} alt="Filter"/></div>
    <div><img src={noteIcon} alt="Filter"/></div>
    <div><img src={medalIcon} alt="Filter"/></div>
  </nav>
</main>

<style>
  main {
    max-width: 420px;
    margin: 0 auto;
    padding: 28px 20px 100px;
  }
  h1 {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 18px;
  }
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .tabs {
    display: flex;
    gap: 8px;
  }
  .tabs button {
    background: white;
    border: 1px solid #ddd;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
  }
  .tabs button.active {
    background: black;
    color: white;
  }
  /*.add-icon .plus {
    width: 36px;
    height: 36px;
    border: 2px solid #000;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }*/
  .add-form {
    margin: 10px 0;
    display: flex;
    gap: 8px;
    align-items: center;
    background: #fff5ef;
    padding: 10px;
    border-radius: 8px;
  }
  .add-form input {
    padding: 8px;
    border-radius: 6px;
    border: 1px solid #ddd;
  }
  .list {
    margin-top: 8px;
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
  /*.fab {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: -28px;
    font-size: 1.8rem;
    cursor: pointer;
  } */
</style>
