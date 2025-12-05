<script>
  import TaskItem from '$lib/components/TaskItem.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import { user, getUserDisplayName } from '$lib/stores/user.js';
  import { tasks, loading, error, fetchTasks, createTask, updateTask, deleteTask, toggleTaskCompletion, getUsers } from '$lib/stores/tasks.js';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase.js';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';

  let view = 'all';
  let showAdd = false;
  let newTitle = '';
  let newDescription = '';
  let newDueDate = '';
  let newAssignee = '';
  let newPriority = '';
  let newDifficulty = '';
  let availableUsers = [];
  let userProfilePictureUrl = null;

  let authChecked = false;

  let showFilters = false;
  let filterPriority = '';
  let filterCompleted = '';
  let filterDifficulty = '';

  $: if ($page.url.searchParams.get('add') === 'true' && !showAdd) {
    showAdd = true;
    goto('/tasks', { replaceState: true });
  }

  $: if (showAdd && availableUsers.length === 0 && authChecked) {
    getUsers().then(users => {
      availableUsers = users;
    }).catch(err => {
      console.error('Error loading users:', err);
    });
  }

  onMount(async () => {
    await new Promise(resolve => setTimeout(resolve, 200));

    if (!$user) {
      goto('/?message=login-required');
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: householdMembership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      
      if (membershipError) {
        console.error('Error checking household membership:', membershipError);
        goto('/join-household');
        return;
      }
      
      if (!householdMembership) {
        goto('/join-household');
        return;
      }
    }

    authChecked = true;
    await fetchTasks();

    try {
      availableUsers = await getUsers();
    } catch (err) {
      console.error('Error loading users on mount:', err);
      availableUsers = [];
    }

    if (currentUser) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('profile_picture_url')
          .eq('id', currentUser.id)
          .maybeSingle();
        
        if (profile?.profile_picture_url) {
          userProfilePictureUrl = profile.profile_picture_url;
        }
      } catch (err) {
        console.error('Error fetching profile picture:', err);
      }
    }
  });

  $: if (authChecked && typeof window !== 'undefined' && $user === null) {
    goto('/?message=login-required');
  }

  $: otherUsers = availableUsers;

  $: filteredTasks = (() => {
    const currentUser = $user?.email;
    if (!currentUser || !$tasks || $tasks.length === 0) return [];
    
    let filtered = $tasks.filter(task => {
      if (view === 'all') return true;
      if (view === 'mine') return task.assignee_email === currentUser;
      if (view === 'unassigned') return task.assignee_email === 'unassigned' || !task.assignee_email;
      return true;
    });

    if (filterPriority) {
      filtered = filtered.filter(t => (t.priority || '').toLowerCase() === filterPriority);
    }

    if (filterCompleted) {
      if (filterCompleted === 'completed') filtered = filtered.filter(t => t.completed);
      else if (filterCompleted === 'uncompleted') filtered = filtered.filter(t => !t.completed);
    }

    if (filterDifficulty) {
      filtered = filtered.filter(t => (t.difficulty || '').toLowerCase() === filterDifficulty);
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return filtered.sort((a, b) => {
      const aCompleted = a.completed ? 1 : 0;
      const bCompleted = b.completed ? 1 : 0;
      
      if (aCompleted !== bCompleted) {
        return aCompleted - bCompleted;
      }
      
      const aPriority = priorityOrder[a.priority] ?? 1;
      const bPriority = priorityOrder[b.priority] ?? 1;

      if (aPriority !== bPriority) return aPriority - bPriority;

      return 0;
    });
  })();

  function toggleFilter() {
    showFilters = !showFilters;
  }

  async function handleToggle(ev) {
    const id = ev.detail.id;
    const task = $tasks.find(t => t.id === id);
    if (task) {
      const newCompletedStatus = !task.completed;
      tasks.update(currentTasks => 
        currentTasks.map(t => 
          t.id === id ? { ...t, completed: newCompletedStatus } : t
        )
      );
      toggleTaskCompletion(id, newCompletedStatus);
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

    let assigneeEmail = null;
    let assigneeInitial = null;
    let assigneeName = null;

    if (newAssignee === 'unassigned') {
      assigneeEmail = 'unassigned';
    } else if (newAssignee === 'me' || newAssignee === '') {
      assigneeEmail = currentUser;
      assigneeInitial = getUserDisplayName($user).charAt(0).toUpperCase();
      assigneeName = getUserDisplayName($user);
    } else if (newAssignee) {
      const selectedUser = availableUsers.find(u => u.email === newAssignee);
      assigneeEmail = newAssignee;
      assigneeInitial = selectedUser?.initial || newAssignee.charAt(0).toUpperCase();
      assigneeName = selectedUser?.name || newAssignee.split('@')[0];
    }

    const taskData = {
      title: newTitle,
      description: newDescription,
      due_date: newDueDate || null,
      assignee_email: assigneeEmail,
      assignee_initial: assigneeInitial,
      assignee_name: assigneeName,
      priority: newPriority || 'medium',
      difficulty: newDifficulty || 'hard'
    };

    const success = await createTask(taskData);
    if (success) {
      newTitle = '';
      newDescription = '';
      newDueDate = '';
      newAssignee = '';
      newPriority = '';
      newDifficulty = '';
      showAdd = false;

      availableUsers = await getUsers();
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      goto('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
</script>

<main>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />

  <header>
    <h1>Hi {getUserDisplayName($user)}!</h1>
    <button type="button" class="profile-button" aria-label="Profile" on:click={() => goto('/profile')}>
      {#if userProfilePictureUrl}
        <img src={userProfilePictureUrl} alt="Profile" class="profile-picture" />
      {:else}
        <img src={profileIcon} alt="Profile"/>
      {/if}
    </button>
  </header>

  <section class="controls">
    <div class="tasks-label">
      <strong>Tasks</strong>
      <button class="filter-btn" aria-label="Open filters" on:click={toggleFilter}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <path d="M10 18h4" />
          <path d="M3 6h18" />
          <path d="M6 12h12" />
        </svg>
      </button>
    </div>

    <div class="tabs">
      <button class:active={view === 'all'} on:click={() => (view = 'all')}>All</button>
      <button class:active={view === 'mine'} on:click={() => (view = 'mine')}>Assigned to Me</button>
      <button class:active={view === 'unassigned'} on:click={() => (view = 'unassigned')}>Unassigned</button>
    </div>
  </section>

  {#if showAdd}
    <div class="add-form">
      <input placeholder="Task title" bind:value={newTitle} required />
      <textarea placeholder="Description (optional)" bind:value={newDescription}></textarea>

      <div class="date-input-wrapper">
        <input type="date" bind:value={newDueDate} class:has-value={newDueDate} />
        {#if !newDueDate}
          <span class="date-placeholder">Select due date</span>
        {/if}
      </div>

      <select bind:value={newAssignee}>
        <option value="">Assign task to someone</option>
        <option value="unassigned">Unassigned</option>
        <option value="me">Assign to me</option>
        {#each otherUsers as user}
          <option value={user.email}>Assign to {user.name}</option>
        {/each}
      </select>

      <select bind:value={newPriority}>
        <option value="">Select priority</option>
        <option value="low">Low Priority (0 points)</option>
        <option value="medium">Medium Priority (5 points)</option>
        <option value="high">High Priority (10 points)</option>
      </select>
      <select bind:value={newDifficulty}>
        <option value="">Select difficulty</option>
        <option value="hard">Hard (15 points)</option>
        <option value="medium">Medium (10 points)</option>
        <option value="easy">Easy (5 points)</option>
      </select>

      <button on:click={addTask} disabled={$loading}>Add Task</button>
    </div>
  {/if}

  {#if $error}
    <div class="error-message">{$error}</div>
  {/if}

  {#if showFilters}
    <div class="filter-overlay" on:click={() => (showFilters = false)}></div>

    <div class="filter-sheet" role="dialog" aria-modal="true" aria-label="Filters">
      <div class="filter-header">
        <div class="filter-title">Filters</div>
        <button class="close-filter" on:click={() => (showFilters = false)} aria-label="Close filters">Close</button>
      </div>

      <div class="filter-content">
        <label class="filter-group">
          <div class="filter-label">Priority</div>
          <div class="priority-options">
            <button class:active={filterPriority === 'high'} on:click={() => filterPriority = filterPriority === 'high' ? '' : 'high'}>High</button>
            <button class:active={filterPriority === 'medium'} on:click={() => filterPriority = filterPriority === 'medium' ? '' : 'medium'}>Medium</button>
            <button class:active={filterPriority === 'low'} on:click={() => filterPriority = filterPriority === 'low' ? '' : 'low'}>Low</button>
          </div>
        </label>

        <label class="filter-group">
          <div class="filter-label">Completion</div>
          <div class="due-options">
            <button class:active={filterCompleted === 'completed'} on:click={() => filterCompleted = filterCompleted === 'completed' ? '' : 'completed'}>Completed</button>
            <button class:active={filterCompleted === 'uncompleted'} on:click={() => filterCompleted = filterCompleted === 'uncompleted' ? '' : 'uncompleted'}>Uncompleted</button>
          </div>
        </label>

        <label class="filter-group">
          <div class="filter-label">Difficulty</div>
          <div class="difficulty-options">
            <button class:active={filterDifficulty === 'hard'} on:click={() => filterDifficulty = filterDifficulty === 'hard' ? '' : 'hard'}>Hard</button>
            <button class:active={filterDifficulty === 'medium'} on:click={() => filterDifficulty = filterDifficulty === 'medium' ? '' : 'medium'}>Medium</button>
            <button class:active={filterDifficulty === 'easy'} on:click={() => filterDifficulty = filterDifficulty === 'easy' ? '' : 'easy'}>Easy</button>
          </div>
        </label>

        <div class="filter-actions">
          <button class="clear-btn" on:click={() => { filterPriority = ''; filterCompleted = ''; filterDifficulty = ''; }}>Clear</button>
          <button class="apply-btn" on:click={() => (showFilters = false)}>Apply</button>
        </div>
      </div>
    </div>
  {/if}

  <section class="list">
    {#if $loading}
      <div class="loading">Loading tasks...</div>
    {:else if filteredTasks.length === 0}
      <div class="empty-state">
        <p>No tasks found.</p>
        <p>Click the + button to add your first task!</p>
      </div>
    {:else}
      {#each filteredTasks as task (task.id)}
        <TaskItem
          {task}
          {availableUsers}
          currentUserEmail={$user?.email}
          on:toggle={handleToggle}
          on:edit={handleEdit}
          on:delete={handleDelete}
        />
      {/each}
    {/if}
  </section>

  <BottomNav 
    onAddClick={() => (showAdd = !showAdd)} 
    onHomeClick={() => {
      showAdd = false;
      goto('/tasks');
    }}
  />
</main>

<style>
  main {
    max-width: 420px;
    margin: 0 auto;
    padding: 28px 20px 100px;
  }

  :root {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
      Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  }

  body {
    font-family: inherit;
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
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .tasks-label {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .filter-btn {
    background: none;
    border: none;
    padding: 6px;
    cursor: pointer;
    border-radius: 6px;
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

  .add-form {
    margin: 10px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #fff5ef;
    padding: 15px;
    border-radius: 8px;
  }

  .add-form input,
  .add-form textarea,
  .add-form select {
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #ddd;
    font-size: 14px;
  }

  .date-input-wrapper {
    position: relative;
    width: 100%;
  }

  .date-input-wrapper input[type="date"] {
    width: 100%;
    position: relative;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #ddd;
    font-size: 14px;
    box-sizing: border-box;
  }

  .date-placeholder {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    pointer-events: none;
    font-size: 14px;
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

  .list {
    margin-top: 8px;
  }

  .empty-state,
  .loading {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 10px;
    border-radius: 6px;
    margin: 10px 0;
    text-align: center;
  }

  .profile-button {
    background: none;
    border: none;
    padding: 0;
    border-radius: 999px;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: transform 0.2s;
  }

  .profile-button:hover {
    transform: scale(1.05);
  }

  .profile-button img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-picture {
    border-radius: 50%;
  }

  .filter-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    z-index: 60;
  }

  .filter-sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 70;
    background: #fff;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    box-shadow: 0 -8px 30px rgba(0,0,0,0.12);
    padding: 16px;
    max-width: 420px;
    margin: 0 auto;
  }

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 420px;
    margin: 0 auto 8px;
  }

  .filter-title {
    font-weight: 700;
    font-size: 16px;
  }

  .close-filter {
    background: none;
    border: none;
    color: #555;
    font-weight: 600;
    cursor: pointer;
  }

  .filter-content {
    max-width: 420px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .filter-label {
    font-weight: 700;
    font-size: 13px;
    color: #333;
  }

  .priority-options,
  .due-options,
  .difficulty-options {
    display: flex;
    gap: 8px;
  }

  .priority-options button,
  .due-options button,
  .difficulty-options button {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #ddd;
    background: #fafafa;
    cursor: pointer;
    font-weight: 700;
  }

  .priority-options button.active,
  .due-options button.active,
  .difficulty-options button.active {
    background: #222;
    color: white;
    border-color: #222;
  }

  .filter-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .clear-btn {
    background: #f4f4f4;
    border: 1px solid #ddd;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
  }

  .apply-btn {
    background: #222;
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
  }
</style>
