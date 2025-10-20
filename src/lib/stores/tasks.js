import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// Create a writable store for tasks
export const tasks = writable([]);
export const loading = writable(false);
export const error = writable(null);

// Get all tasks for the current user
export async function fetchTasks() {
  loading.set(true);
  error.set(null);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      tasks.set([]);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .or(`assignee_email.eq.${user.email},created_by.eq.${user.email}`)
      .order('created_at', { ascending: false });

    if (fetchError) {
      error.set(fetchError.message);
    } else {
      tasks.set(data || []);
    }
  } catch (err) {
    error.set('Failed to fetch tasks');
    console.error('Error fetching tasks:', err);
  } finally {
    loading.set(false);
  }
}

// Create a new task
export async function createTask(taskData) {
  loading.set(true);
  error.set(null);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      error.set('User not authenticated');
      return null;
    }

    // Get user's display name for initial
    const userName = user.user_metadata?.full_name || user.email.split('@')[0];
    const userInitial = userName.charAt(0).toUpperCase();

    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert([{
        title: taskData.title,
        description: taskData.description || '',
        due_date: taskData.due_date || null,
        assignee_email: taskData.assignee_email || user.email,
        assignee_initial: taskData.assignee_initial || userInitial,
        assignee_name: taskData.assignee_name || userName,
        created_by: user.email,
        created_by_name: userName,
        priority: taskData.priority || 'medium'
      }])
      .select()
      .single();

    if (insertError) {
      error.set(insertError.message);
      return null;
    }

    // Add the new task to the store
    tasks.update(currentTasks => [data, ...currentTasks]);
    return data;
  } catch (err) {
    error.set('Failed to create task');
    console.error('Error creating task:', err);
    return null;
  } finally {
    loading.set(false);
  }
}

// Update a task
export async function updateTask(taskId, updates) {
  loading.set(true);
  error.set(null);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      error.set('User not authenticated');
      return null;
    }

    const { data, error: updateError } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      error.set(updateError.message);
      return null;
    }

    // Update the task in the store
    tasks.update(currentTasks => 
      currentTasks.map(task => 
        task.id === taskId ? data : task
      )
    );
    return data;
  } catch (err) {
    error.set('Failed to update task');
    console.error('Error updating task:', err);
    return null;
  } finally {
    loading.set(false);
  }
}

// Delete a task
export async function deleteTask(taskId) {
  loading.set(true);
  error.set(null);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      error.set('User not authenticated');
      return false;
    }

    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      error.set(deleteError.message);
      return false;
    }

    // Remove the task from the store
    tasks.update(currentTasks => 
      currentTasks.filter(task => task.id !== taskId)
    );
    return true;
  } catch (err) {
    error.set('Failed to delete task');
    console.error('Error deleting task:', err);
    return false;
  } finally {
    loading.set(false);
  }
}

// Toggle task completion
export async function toggleTaskCompletion(taskId, completed) {
  return await updateTask(taskId, { completed });
}

// Get all users (for assignment dropdown)
export async function getUsers() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Get all unique users from tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('assignee_email, assignee_initial, assignee_name, created_by, created_by_name')
      .or(`assignee_email.eq.${user.email},created_by.eq.${user.email}`);

    if (!tasksData) return [];

    // Create unique users list
    const users = new Map();
    tasksData.forEach(task => {
      if (task.assignee_email && task.assignee_email !== 'unassigned') {
        users.set(task.assignee_email, {
          email: task.assignee_email,
          initial: task.assignee_initial,
          name: task.assignee_name || task.assignee_email.split('@')[0]
        });
      }
      if (task.created_by) {
        users.set(task.created_by, {
          email: task.created_by,
          initial: task.created_by_name ? task.created_by_name.charAt(0).toUpperCase() : task.created_by.charAt(0).toUpperCase(),
          name: task.created_by_name || task.created_by.split('@')[0]
        });
      }
    });

    return Array.from(users.values());
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
}
