<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let task;

  function toggleDone() {
    dispatch('toggle', { id: task.id });
  }
</script>

<article class="task {task.done ? 'done' : ''}">
  <label class="left">
    <input type="checkbox" checked={task.done} on:change={toggleDone} />
  </label>

  <div class="content">
    <div class="title">{task.title}</div>
    <div class="date">{task.date}</div>
  </div>

  <div class="right">
    <div class="avatar">{task.assigneeInitial}</div>
  </div>
</article>

<style>
  .task {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: #f3f3f3;
    padding: 0.9rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    transition: background 0.15s;
  }
  .task.done {
    opacity: 0.6;
    text-decoration: line-through;
  }
  .left input[type='checkbox'] {
    width: 20px;
    height: 20px;
    accent-color: #000;
  }
  .content {
    flex: 1;
  }
  .title {
    font-weight: 700;
    font-size: 1rem;
    color: #222;
  }
  .date {
    font-size: 0.8rem;
    color: #888;
    margin-top: 4px;
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
</style>
