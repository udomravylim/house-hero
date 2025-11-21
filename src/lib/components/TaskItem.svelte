<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let task;
  export let availableUsers = [];
  export let currentUserEmail = '';

  let isEditing = false;
  let showDetails = false;
  let editTitle = '';
  let editDescription = '';
  let editDueDate = '';
  let editAssignee = '';
  let editPriority = 'medium';
  let editDifficulty = 'hard';

  function toggleDone() {
    dispatch('toggle', { id: task.id });
  }

  function startEdit() {
    isEditing = true;
    editTitle = task.title;
    editDescription = task.description || '';
    editDueDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';
    // Set assignee: 'unassigned' if unassigned, '' if current user, otherwise the email
    if (task.assignee_email === 'unassigned' || !task.assignee_email) {
      editAssignee = 'unassigned';
    } else if (task.assignee_email === currentUserEmail) {
      editAssignee = 'me';
    } else {
      editAssignee = task.assignee_email;
    }
    editPriority = task.priority || 'medium';
    editDifficulty = task.difficulty || 'hard';
  }

  function cancelEdit() {
    isEditing = false;
    editTitle = '';
    editDescription = '';
    editDueDate = '';
    editAssignee = '';
    editPriority = 'medium';
    editDifficulty = 'hard';
  }

  function saveEdit() {
    if (!editTitle.trim()) return;
    
    dispatch('edit', {
      id: task.id,
      title: editTitle,
      description: editDescription,
      due_date: editDueDate || null,
      assignee_email: editAssignee,
      priority: editPriority,
      difficulty: editDifficulty
    });
    
    isEditing = false;
  }

  function deleteTask() {
    dispatch('delete', { id: task.id });
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US');
  }

  function toggleDetails() {
    showDetails = !showDetails;
  }

  function closeDetails() {
    showDetails = false;
  }

  // Calculate points based on priority and difficulty
  function calculatePoints(priority, difficulty) {
    // Priority points: low = 0, medium = 5, high = 10
    const priorityPoints = {
      low: 0,
      medium: 5,
      high: 10
    };
    
    // Difficulty points: easy = 5, medium = 10, hard = 15
    const difficultyPoints = {
      easy: 5,
      medium: 10,
      hard: 15
    };
    
    const priorityValue = priorityPoints[priority] || 0;
    const difficultyValue = difficultyPoints[difficulty] || 0;
    
    return priorityValue + difficultyValue;
  }

  // Get individual point values for display
  function getPriorityPoints(priority) {
    const priorityPoints = {
      low: 0,
      medium: 5,
      high: 10
    };
    return priorityPoints[priority] || 0;
  }

  function getDifficultyPoints(difficulty) {
    const difficultyPoints = {
      easy: 5,
      medium: 10,
      hard: 15
    };
    return difficultyPoints[difficulty] || 0;
  }

  $: taskPoints = calculatePoints(task.priority || 'medium', task.difficulty || 'hard');
  $: priorityPointsValue = getPriorityPoints(task.priority || 'medium');
  $: difficultyPointsValue = getDifficultyPoints(task.difficulty || 'hard');
</script>

<article class="task {task.completed ? 'done' : ''} {task.priority || 'medium'}">
  {#if isEditing}
    <div class="edit-form">
      <input 
        type="text" 
        bind:value={editTitle} 
        placeholder="Task title"
        class="edit-input"
      />
      <textarea 
        bind:value={editDescription} 
        placeholder="Description (optional)"
        class="edit-textarea"
      ></textarea>
      <input 
        type="date" 
        bind:value={editDueDate}
        class="edit-input"
      />
      <select bind:value={editAssignee} class="edit-select">
        <option value="unassigned">Unassigned</option>
        <option value="me">Assign to me</option>
        {#each availableUsers as user}
          <option value={user.email}>Assign to {user.name}</option>
        {/each}
      </select>
      <select bind:value={editPriority} class="edit-select">
        <option value="low">Low Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="high">High Priority</option>
      </select>
      <select bind:value={editDifficulty} class="edit-select">
        <option value="hard">Hard (15 points)</option>
        <option value="medium">Medium (10 points)</option>
        <option value="easy">Easy (5 points)</option>
      </select>
      <div class="edit-actions">
        <button on:click={saveEdit} class="save-btn">Save</button>
        <button on:click={cancelEdit} class="cancel-btn">Cancel</button>
      </div>
    </div>
  {:else}
    <label class="left">
      <input type="checkbox" checked={task.completed} on:change={toggleDone} />
    </label>

    <div class="content" on:click={toggleDetails} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleDetails()}>
      <div class="title">{task.title}</div>
      {#if task.description}
        <div class="description">{task.description}</div>
      {/if}
      <div class="meta">
        <span class="date">{formatDate(task.due_date)}</span>
        <span class="points">{taskPoints} pts</span>
      </div>
    </div>

    <div class="right">
      {#if task.assignee_email === 'unassigned' || !task.assignee_email}
        <div class="avatar unassigned">?</div>
      {:else}
        <div class="avatar">{task.assignee_initial}</div>
      {/if}
      <div class="actions">
        <button on:click={startEdit} class="edit-btn" title="Edit task">✏️</button>
        <button on:click={deleteTask} class="delete-btn" title="Delete task">🗑️</button>
      </div>
    </div>
  {/if}
</article>

{#if showDetails}
  <div class="modal-overlay" on:click={closeDetails} on:keydown={(e) => e.key === 'Escape' && closeDetails()} role="button" tabindex="0">
    <div class="modal-content" on:click|stopPropagation on:keydown={(e) => e.key === 'Escape' && closeDetails()} role="dialog" aria-labelledby="modal-title" aria-modal="true" tabindex="0">
      <div class="modal-header">
        <h3 id="modal-title">Task Details</h3>
        <button class="close-btn" on:click={closeDetails} title="Close">×</button>
      </div>
      
      <div class="modal-body">
        <div class="detail-section title-section">
          <h2 class="task-title">{task.title}</h2>
          <span class="status {task.completed ? 'completed' : 'pending'}">
            {task.completed ? 'Completed' : 'Pending'}
          </span>
        </div>
        
        {#if task.description}
          <div class="detail-section description-section">
            <h4>Description</h4>
            <p class="detail-value description-text">{task.description}</p>
          </div>
        {/if}
        
        <div class="info-grid">
          <div class="info-card points-card">
            <div class="info-card-header">
              <h4>Total Points</h4>
            </div>
            <div class="info-card-content">
              <span class="points-badge-large">{taskPoints}</span>
              <span class="points-label">points</span>
              <span class="points-breakdown">({priorityPointsValue} from priority + {difficultyPointsValue} from difficulty)</span>
            </div>
          </div>
          
          <div class="info-card">
            <div class="info-card-header">
              <h4>Priority</h4>
            </div>
            <div class="info-card-content">
              <span class="priority {task.priority}">{task.priority}</span>
              <span class="points-inline">{priorityPointsValue} pts</span>
            </div>
          </div>
          
          <div class="info-card">
            <div class="info-card-header">
              <h4>Difficulty</h4>
            </div>
            <div class="info-card-content">
              <span class="difficulty {task.difficulty || 'hard'}">{task.difficulty || 'hard'}</span>
              <span class="points-inline">{difficultyPointsValue} pts</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>Assignee</h4>
          <div class="detail-value">
            {#if task.assignee_email === 'unassigned' || !task.assignee_email}
              <span class="assignee unassigned">
                <span class="assignee-avatar">?</span>
                Unassigned
              </span>
            {:else}
              <span class="assignee">
                <span class="assignee-avatar">{task.assignee_initial}</span>
                {task.assignee_name || task.assignee_email}
              </span>
            {/if}
          </div>
        </div>
        
        {#if task.due_date}
          <div class="detail-section">
            <h4>Due Date</h4>
            <p class="detail-value date-value">
              <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {formatDate(task.due_date)}
            </p>
          </div>
        {/if}
        
        <div class="detail-section meta-info">
          <div class="meta-row">
            <span class="meta-label">Created by</span>
            <span class="creator">
              <span class="creator-avatar">{task.created_by_name ? task.created_by_name.charAt(0).toUpperCase() : task.created_by.charAt(0).toUpperCase()}</span>
              {task.created_by_name || task.created_by}
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Created</span>
            <span class="meta-value">{formatDate(task.created_at)}</span>
          </div>
          {#if task.updated_at && task.updated_at !== task.created_at}
            <div class="meta-row">
              <span class="meta-label">Last updated</span>
              <span class="meta-value">{formatDate(task.updated_at)}</span>
            </div>
          {/if}
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="edit-btn" on:click={() => { closeDetails(); startEdit(); }}>Edit Task</button>
        <button class="close-btn-secondary" on:click={closeDetails}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .task {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    background: #f3f3f3;
    padding: 0.9rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    transition: all 0.15s;
    border-left: 4px solid #ddd;
  }
  .task.done {
    opacity: 0.6;
    text-decoration: line-through;
  }
  .task.high {
    border-left-color: #e24a2c;
  }
  .task.medium {
    border-left-color: #f39c12;
  }
  .task.low {
    border-left-color: #27ae60;
  }
  .left input[type='checkbox'] {
    width: 20px;
    height: 20px;
    accent-color: #000;
    margin-top: 2px;
  }
  .content {
    flex: 1;
    cursor: pointer;
    transition: background-color 0.15s;
  }
  .content:hover {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    padding: 4px;
    margin: -4px;
  }
  .title {
    font-weight: 700;
    font-size: 1rem;
    color: #222;
    margin-bottom: 4px;
  }
  .description {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .meta {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .date {
    font-size: 0.8rem;
    color: #888;
  }
  .priority {
    font-size: 0.75rem;
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: 700;
    text-transform: capitalize;
    display: inline-block;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .priority.high {
    background: #e24a2c;
    color: white;
  }
  .priority.medium {
    background: #f39c12;
    color: white;
  }
  .priority.low {
    background: #27ae60;
    color: white;
  }
  .points {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
    background: #3498db;
    color: white;
  }
  .difficulty {
    font-size: 0.75rem;
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: 700;
    text-transform: capitalize;
    display: inline-block;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .difficulty.hard {
    background: #e24a2c;
    color: white;
  }
  .difficulty.medium {
    background: #f39c12;
    color: white;
  }
  .difficulty.easy {
    background: #27ae60;
    color: white;
  }
  .points-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 1rem;
    font-weight: 700;
    background: #3498db;
    color: white;
  }
  .points-inline {
    font-size: 0.75rem;
    color: #6b7280;
    margin-left: 8px;
    font-weight: 600;
    background: white;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .points-breakdown {
    display: block;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 8px;
    font-weight: 400;
  }
  .right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: #e24a2c;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.95rem;
  }
  .actions {
    display: flex;
    gap: 4px;
  }
  .edit-btn, .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    font-size: 14px;
    transition: background 0.15s;
  }
  .edit-btn:hover {
    background: #e3f2fd;
  }
  .delete-btn:hover {
    background: #ffebee;
  }
  .edit-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .edit-input, .edit-textarea, .edit-select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  .edit-textarea {
    min-height: 60px;
    resize: vertical;
  }
  .edit-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .save-btn, .cancel-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
  }
  .save-btn {
    background: #27ae60;
    color: white;
  }
  .save-btn:hover {
    background: #229954;
  }
  .cancel-btn {
    background: #95a5a6;
    color: white;
  }
  .cancel-btn:hover {
    background: #7f8c8d;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    max-width: 560px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    animation: modalSlideIn 0.2s ease-out;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 28px;
    border-bottom: 1px solid #e5e7eb;
    background: linear-gradient(to bottom, #fafafa, #ffffff);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #6b7280;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    padding: 4px;
    border-radius: 4px;
    transition: background-color 0.15s;
  }

  .close-btn:hover {
    background-color: #f3f4f6;
  }

  .modal-body {
    padding: 28px;
  }

  .detail-section {
    margin-bottom: 24px;
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .title-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 28px;
    padding-bottom: 20px;
    border-bottom: 2px solid #f3f4f6;
  }

  .task-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    line-height: 1.3;
    flex: 1;
  }

  .description-section {
    margin-bottom: 28px;
  }

  .description-text {
    background: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    border-left: 3px solid #f39c12;
    line-height: 1.6;
    color: #374151;
  }

  .detail-section h4 {
    margin: 0 0 12px 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .detail-value {
    margin: 0;
    font-size: 1rem;
    color: #111827;
    line-height: 1.6;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 16px;
    margin-bottom: 28px;
  }

  .info-card {
    background: #f9fafb;
    border-radius: 12px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    transition: all 0.2s ease;
  }

  .info-card:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .points-card {
    background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
    color: white;
    border: none;
  }

  .points-card:hover {
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  }

  .points-card .info-card-header h4 {
    color: rgba(255, 255, 255, 0.9);
  }

  .points-card .points-breakdown {
    color: rgba(255, 255, 255, 0.8);
  }

  .info-card-header {
    margin-bottom: 12px;
  }

  .info-card-header h4 {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .info-card-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .points-badge-large {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
    color: white;
  }

  .points-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  .date-value {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #374151;
    font-weight: 500;
  }

  .icon {
    color: #6b7280;
  }

  .meta-info {
    background: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    margin-top: 8px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .meta-row:last-child {
    border-bottom: none;
  }

  .meta-label {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .meta-value {
    font-size: 0.875rem;
    color: #374151;
  }

  .status {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .status.completed {
    background: #d1fae5;
    color: #065f46;
    box-shadow: 0 2px 4px rgba(5, 95, 70, 0.1);
  }

  .status.pending {
    background: #fef3c7;
    color: #92400e;
    box-shadow: 0 2px 4px rgba(146, 64, 14, 0.1);
  }

  .assignee, .creator {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
  }

  .assignee.unassigned {
    color: #9ca3af;
  }

  .assignee-avatar, .creator-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e24a2c 0%, #f39c12 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.875rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .assignee.unassigned .assignee-avatar {
    background: #d1d5db;
    color: #6b7280;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 20px 28px;
    border-top: 1px solid #e5e7eb;
    background: #fafafa;
  }

  .modal-footer .edit-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.15s;
  }

  .modal-footer .edit-btn:hover {
    background: #2563eb;
  }

  .close-btn-secondary {
    background: #6b7280;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: background-color 0.15s;
  }

  .close-btn-secondary:hover {
    background: #4b5563;
  }

  @media (max-width: 640px) {
    .info-grid {
      grid-template-columns: 1fr;
    }

    .title-section {
      flex-direction: column;
      align-items: flex-start;
    }

    .modal-content {
      max-width: 100%;
      border-radius: 16px 16px 0 0;
      max-height: 90vh;
    }

    .modal-body {
      padding: 20px;
    }

    .modal-header {
      padding: 20px;
    }
  }
</style>
