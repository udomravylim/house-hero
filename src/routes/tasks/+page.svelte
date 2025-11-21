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
  let newPriority = 'medium';
  let newDifficulty = 'hard';
  let availableUsers = [];

  let authChecked = false;

  // Check for add query parameter immediately (reactive)
  $: if ($page.url.searchParams.get('add') === 'true' && !showAdd) {
    showAdd = true;
    // Remove the query parameter from URL
    goto('/tasks', { replaceState: true });
  }

  // Refresh users when form opens and auth is checked
  $: if (showAdd && availableUsers.length === 0 && authChecked) {
    getUsers().then(users => {
      availableUsers = users;
    }).catch(err => {
      console.error('Error loading users:', err);
    });
  }

  onMount(async () => {
    // Wait for auth to initialize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if user is authenticated
    if (!$user) {
      goto('/?message=login-required');
      return;
    }
    
    // Check if user is in a household
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
    
    // Load users after everything else is ready
    try {
      availableUsers = await getUsers();
    } catch (err) {
      console.error('Error loading users on mount:', err);
      availableUsers = [];
    }
  });

  // Handle authentication changes only after initial check
  $: if (authChecked && typeof window !== 'undefined' && $user === null) {
    goto('/?message=login-required');
  }

  // Use availableUsers directly since getUsers() already filters out current user
  $: otherUsers = availableUsers;

  // Reactive filtered and sorted tasks
  $: filteredTasks = (() => {
    const currentUser = $user?.email;
    if (!currentUser || !$tasks || $tasks.length === 0) return [];
    
    // Filter tasks based on view
    let filtered = $tasks.filter((task) => {
      if (view === 'all') {
        // Show all tasks in the household
        return true;
      } else if (view === 'mine') {
        // Show only tasks assigned to current user
        return task.assignee_email === currentUser;
      } else if (view === 'unassigned') {
        // Show only unassigned tasks
        return task.assignee_email === 'unassigned' || !task.assignee_email;
      }
      return true;
    });
    
    // Sort tasks: incomplete first, then by priority (high → medium → low), then completed
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    return filtered.sort((a, b) => {
      // First, sort by completion status (incomplete first)
      // Convert boolean to number: false = 0, true = 1
      const aCompleted = a.completed ? 1 : 0;
      const bCompleted = b.completed ? 1 : 0;
      
      if (aCompleted !== bCompleted) {
        return aCompleted - bCompleted; // 0 (incomplete) comes before 1 (completed)
      }
      
      // If same completion status, sort by priority
      const aPriority = priorityOrder[a.priority] ?? 1; // Default to medium if undefined
      const bPriority = priorityOrder[b.priority] ?? 1;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, maintain original order
      return 0;
    });
  })();

  async function handleToggle(ev) {
    const id = ev.detail.id;
    const task = $tasks.find(t => t.id === id);
    if (task) {
      const newCompletedStatus = !task.completed;
      // Optimistically update the UI immediately
      tasks.update(currentTasks => 
        currentTasks.map(t => 
          t.id === id ? { ...t, completed: newCompletedStatus } : t
        )
      );
      // Then update in the background
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

    // Determine assignee information based on selection
    let assigneeEmail = null;
    let assigneeInitial = null;
    let assigneeName = null;

    if (newAssignee === 'unassigned') {
      // Leave task unassigned
      assigneeEmail = 'unassigned';
      assigneeInitial = null;
      assigneeName = null;
    } else if (newAssignee === 'me' || newAssignee === '') {
      // Assign to current user
      assigneeEmail = currentUser;
      assigneeInitial = getUserDisplayName($user).charAt(0).toUpperCase();
      assigneeName = getUserDisplayName($user);
    } else if (newAssignee) {
      // Assign to selected user
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
      priority: newPriority,
      difficulty: newDifficulty
    };

    const success = await createTask(taskData);
    if (success) {
      // Reset form
      newTitle = '';
      newDescription = '';
      newDueDate = '';
      newAssignee = '';
      newPriority = 'medium';
      newDifficulty = 'hard';
      showAdd = false;
      
      // Refresh users list
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
    <img src={profileIcon} alt="Profile"/>
    </button>
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
        <option value="hard">Hard (15 points)</option>
        <option value="medium">Medium (10 points)</option>
        <option value="easy">Easy (5 points)</option>
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
    {:else if filteredTasks.length === 0}
      <div class="empty-state">
        <p>No tasks found.</p>
        <p>Click the + button to add your first task!</p>
      </div>
    {:else}
      {#each filteredTasks as task (task.id)}
        <TaskItem {task} {availableUsers} currentUserEmail={$user?.email} on:toggle={handleToggle} on:edit={handleEdit} on:delete={handleDelete} />
      {/each}
    {/if}
  </section>

  <!-- <a href="/leaderboard">Go to Leaderboard</a> -->

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
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
  }
  :root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
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
  .add-form input, .add-form textarea, .add-form select {
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
  .date-input-wrapper input[type="date"]:not(.has-value) {
    color: transparent;
  }
  .date-input-wrapper input[type="date"]:not(.has-value)::-webkit-datetime-edit {
    color: transparent;
  }
  .date-input-wrapper input[type="date"]:not(.has-value)::-webkit-datetime-edit-fields-wrapper {
    color: transparent;
  }
  .date-input-wrapper input[type="date"]:not(.has-value)::-webkit-datetime-edit-text {
    color: transparent;
  }
  .date-input-wrapper input[type="date"]:not(.has-value)::-webkit-datetime-edit-month-field,
  .date-input-wrapper input[type="date"]:not(.has-value)::-webkit-datetime-edit-day-field,
  .date-input-wrapper input[type="date"]:not(.has-value)::-webkit-datetime-edit-year-field {
    color: transparent;
  }
  .date-input-wrapper input[type="date"].has-value {
    color: inherit;
  }
  .date-input-wrapper input[type="date"]::-webkit-calendar-picker-indicator {
    position: absolute;
    right: 10px;
    z-index: 2;
    cursor: pointer;
    opacity: 1;
  }
  .date-placeholder {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
    pointer-events: none;
    font-size: 14px;
    z-index: 1;
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

  .profile-button {
    background: none;
    border: none;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
  }

</style>
