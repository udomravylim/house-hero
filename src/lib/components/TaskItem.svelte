<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let task;

  let isEditing = false;
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
    editAssignee = task.assignee_email || '';
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
    if (confirm('Are you sure you want to delete this task?')) {
      dispatch('delete', { id: task.id });
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US');
  }
</script>

<article class="task {task.completed ? 'done' : ''} {editPriority}">
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
      <input 
        type="email" 
        bind:value={editAssignee} 
        placeholder="Assignee email"
        class="edit-input"
      />
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

    <div class="content">
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
</style>
