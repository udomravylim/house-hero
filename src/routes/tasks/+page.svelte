<script>
  import TaskItem from '$lib/components/TaskItem.svelte';
  import homeIcon from '$lib/assets/menu-icon-home.svg';
  import addIcon from '$lib/assets/menu-icon-add.svg';
  import medalIcon from '$lib/assets/menu-icon-medal.svg';
  import noteIcon from '$lib/assets/menu-icon-note.svg';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';
  import liladdIcon from '$lib/assets/add-icon.svg';
  import { user, getUserDisplayName } from '$lib/stores/user.js';
  import { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, toggleTaskCompletion, getUsers } from '$lib/stores/tasks.js';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let view = 'yours';
  let showAdd = false;
  let newTitle = '';
  let newDescription = '';
  let newDueDate = '';
  let newAssignee = '';
  let newPriority = 'medium';
  let availableUsers = [];

  onMount(async () => {
    await fetchTasks();
    availableUsers = await getUsers();
  });

  function filteredTasks() {
    const currentUser = $user?.email;
    if (!currentUser) return [];
    
    return $tasks.filter((task) => {
      if (view === 'yours') {
        return task.assignee_email === currentUser;
      } else {
        return task.assignee_email === 'unassigned' || !task.assignee_email;
      }
    });
  }

  async function handleToggle(ev) {
    const id = ev.detail.id;
    const task = $tasks.find(t => t.id === id);
    if (task) {
      await toggleTaskCompletion(id, !task.completed);
    }
  }

  async function handleEdit(ev) {
    const { id, ...updates } = ev.detail;
    await updateTask(id, updates);
  }

  async function handleDelete(ev) {
    const { id } = ev.detail;
    await deleteTask(id);
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    
    const currentUser = $user?.email;
    if (!currentUser) return;

    // Get current user's name for initial
    const currentUserName = getUserDisplayName($user);
    const currentUserInitial = currentUserName.charAt(0).toUpperCase();

    const taskData = {
      title: newTitle,
      description: newDescription,
      due_date: newDueDate || null,
      assignee_email: newAssignee || currentUser,
      assignee_initial: newAssignee ? availableUsers.find(u => u.email === newAssignee)?.initial || newAssignee.charAt(0).toUpperCase() : currentUserInitial,
      assignee_name: newAssignee ? availableUsers.find(u => u.email === newAssignee)?.name || newAssignee.split('@')[0] : currentUserName,
      priority: newPriority
    };

    const success = await createTask(taskData);
    if (success) {
      // Reset form
      newTitle = '';
      newDescription = '';
      newDueDate = '';
      newAssignee = '';
      newPriority = 'medium';
      showAdd = false;
      
      // Refresh users list
      availableUsers = await getUsers();
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US');
  }
</script>

<main>
  <header>
    <h1>Hi {getUserDisplayName($user)}!</h1>
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
      <input placeholder="Task title" bind:value={newTitle} required />
      <textarea placeholder="Description (optional)" bind:value={newDescription}></textarea>
      <input type="date" bind:value={newDueDate} />
      <select bind:value={newAssignee}>
        <option value="">Assign to me</option>
        {#each availableUsers as user}
          <option value={user.email}>{user.name} ({user.email})</option>
        {/each}
      </select>
      <select bind:value={newPriority}>
        <option value="low">Low Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="high">High Priority</option>
      </select>
      <button on:click={addTask} disabled={$loading}>Add Task</button>
    </div>
  {/if}

  {#if $error}
    <div class="error-message">
      {$error}
    </div>
  {/if}

  <section class="list">
    {#if $loading}
      <div class="loading">Loading tasks...</div>
    {:else if filteredTasks().length === 0}
      <div class="empty-state">
        <p>No tasks found.</p>
        <p>Click the + button to add your first task!</p>
      </div>
    {:else}
      {#each filteredTasks() as task (task.id)}
        <TaskItem {task} on:toggle={handleToggle} on:edit={handleEdit} on:delete={handleDelete} />
      {/each}
    {/if}
  </section>
  <nav class="bottom-nav">
    <button type="button" class="nav-button" aria-label="Home" on:click={() => goto('/tasks')}><img src={homeIcon} alt="Home"/></button>
    <button type="button" class="nav-button" aria-label="Profile" on:click={() => goto('/tasks')}><img src={profileIcon} alt="Profile"/></button>
    <button class="fab, nav-button" on:click={() => (showAdd = !showAdd)} type="button" aria-label="Add new task"><img src={addIcon} alt="Add"/></button>
    <button type="button" class="nav-button" aria-label="Notes"><img src={noteIcon} alt="Notes"/></button>
    <button type="button" class="nav-button" aria-label="Achievements"><img src={medalIcon} alt="Achievements"/></button>
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
  .nav-button {
    background: none;
    border: none;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
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
    flex-direction: column;
    gap: 8px;
    background: #fff5ef;
    padding: 15px;
    border-radius: 8px;
  }
  .add-form input, .add-form textarea, .add-form select {
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #ddd;
    font-size: 14px;
  }
  .add-form textarea {
    min-height: 60px;
    resize: vertical;
  }
  .add-form button {
    padding: 10px;
    background: #27ae60;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }
  .add-form button:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }
  .list {
    margin-top: 8px;
  }
  .loading, .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }
  .empty-state p {
    margin: 8px 0;
  }
  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 10px;
    border-radius: 6px;
    margin: 10px 0;
    text-align: center;
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
