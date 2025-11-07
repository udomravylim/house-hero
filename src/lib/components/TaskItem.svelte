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

  function toggleDone() {
    dispatch('toggle', { id: task.id });
  }

  function startEdit() {
    isEditing = true;
    editTitle = task.title;
    editDescription = task.description || '';
    editDueDate = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';
    // If assignee is current user, set to empty string so "Assign to me" is selected
    editAssignee = (task.assignee_email === currentUserEmail) ? '' : (task.assignee_email || '');
    editPriority = task.priority || 'medium';
  }

  function cancelEdit() {
    isEditing = false;
    editTitle = '';
    editDescription = '';
    editDueDate = '';
    editAssignee = '';
    editPriority = 'medium';
  }

  function saveEdit() {
    if (!editTitle.trim()) return;
    
    dispatch('edit', {
      id: task.id,
      title: editTitle,
      description: editDescription,
      due_date: editDueDate || null,
      assignee_email: editAssignee,
      priority: editPriority
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
        <option value="">Assign to me</option>
        {#each availableUsers as user}
          <option value={user.email}>Assign to {user.name}</option>
        {/each}
      </select>
      <select bind:value={editPriority} class="edit-select">
        <option value="low">Low Priority</option>
        <option value="medium">Medium Priority</option>
        <option value="high">High Priority</option>
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
        <span class="priority {task.priority}">{task.priority}</span>
      </div>
    </div>

    <div class="right">
      <div class="avatar">{task.assignee_initial}</div>
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
        <div class="detail-section">
          <h4>Title</h4>
          <p class="detail-value">{task.title}</p>
        </div>
        
        {#if task.description}
          <div class="detail-section">
            <h4>Description</h4>
            <p class="detail-value">{task.description}</p>
          </div>
        {/if}
        
        <div class="detail-section">
          <h4>Status</h4>
          <p class="detail-value">
            <span class="status {task.completed ? 'completed' : 'pending'}">
              {task.completed ? 'Completed' : 'Pending'}
            </span>
          </p>
        </div>
        
        <div class="detail-section">
          <h4>Priority</h4>
          <p class="detail-value">
            <span class="priority {task.priority}">{task.priority}</span>
          </p>
        </div>
        
        {#if task.due_date}
          <div class="detail-section">
            <h4>Due Date</h4>
            <p class="detail-value">{formatDate(task.due_date)}</p>
          </div>
        {/if}
        
        <div class="detail-section">
          <h4>Assignee</h4>
          <p class="detail-value">
            <span class="assignee">
              <span class="assignee-avatar">{task.assignee_initial}</span>
              {task.assignee_name || task.assignee_email}
            </span>
          </p>
        </div>
        
        <div class="detail-section">
          <h4>Created By</h4>
          <p class="detail-value">
            <span class="creator">
              <span class="creator-avatar">{task.created_by_name ? task.created_by_name.charAt(0).toUpperCase() : task.created_by.charAt(0).toUpperCase()}</span>
              {task.created_by_name || task.created_by}
            </span>
          </p>
        </div>
        
        <div class="detail-section">
          <h4>Created</h4>
          <p class="detail-value">{formatDate(task.created_at)}</p>
        </div>
        
        {#if task.updated_at && task.updated_at !== task.created_at}
          <div class="detail-section">
            <h4>Last Updated</h4>
            <p class="detail-value">{formatDate(task.updated_at)}</p>
          </div>
        {/if}
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
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
    text-transform: uppercase;
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
    border-radius: 12px;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
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
    padding: 24px;
  }

  .detail-section {
    margin-bottom: 20px;
  }

  .detail-section:last-child {
    margin-bottom: 0;
  }

  .detail-section h4 {
    margin: 0 0 8px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    margin: 0;
    font-size: 1rem;
    color: #111827;
    line-height: 1.5;
  }

  .status {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status.completed {
    background: #d1fae5;
    color: #065f46;
  }

  .status.pending {
    background: #fef3c7;
    color: #92400e;
  }

  .assignee, .creator {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .assignee-avatar, .creator-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #e24a2c;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.75rem;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
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
</style>
