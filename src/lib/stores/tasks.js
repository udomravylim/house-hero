import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// Create a writable store for tasks
export const tasks = writable([]);
export const loading = writable(false);
export const error = writable(null);

// Get all tasks for the current user's household
export async function fetchTasks() {
  loading.set(true);
  error.set(null);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      tasks.set([]);
      return;
    }

    // Get user's household
    const { data: householdMember } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (!householdMember) {
      tasks.set([]);
      return;
    }

    // Fetch tasks for the household
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdMember.household_id)
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

    // Get user's household
    const { data: householdMember } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (!householdMember) {
      error.set('User is not in a household');
      return null;
    }

    // Get user's display name for initial
    const userName = user.user_metadata?.full_name || user.email.split('@')[0];
    const userInitial = userName.charAt(0).toUpperCase();

    // Handle assignee data - if unassigned, set to null, otherwise use provided or default to current user
    const assigneeEmail = taskData.assignee_email || user.email;
    const assigneeInitial = taskData.assignee_email === 'unassigned' ? null : (taskData.assignee_initial || userInitial);
    const assigneeName = taskData.assignee_email === 'unassigned' ? null : (taskData.assignee_name || userName);

    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert([{
        title: taskData.title,
        description: taskData.description || '',
        due_date: taskData.due_date || null,
        assignee_email: assigneeEmail,
        assignee_initial: assigneeInitial,
        assignee_name: assigneeName,
        created_by: user.email,
        created_by_name: userName,
        priority: taskData.priority || 'medium',
        household_id: householdMember.household_id
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

    // If assignee_email is being updated, also update assignee_name and assignee_initial
    if (updates.assignee_email !== undefined) {
      // Get household members to find assignee info
      const { data: householdMember } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

      if (householdMember) {
        // Handle different assignee values
        if (updates.assignee_email === 'unassigned') {
          // Unassigned
          updates.assignee_email = 'unassigned';
          updates.assignee_name = null;
          updates.assignee_initial = null;
        } else if (!updates.assignee_email || updates.assignee_email === '' || updates.assignee_email === 'me') {
          // Assign to current user
          updates.assignee_email = user.email;
          const userName = user.user_metadata?.full_name || user.email.split('@')[0];
          updates.assignee_name = userName;
          updates.assignee_initial = userName.charAt(0).toUpperCase();
        } else {
          // Find the assignee member info
          const { data: assigneeMember } = await supabase
            .from('household_members')
            .select('user_email, user_name')
            .eq('household_id', householdMember.household_id)
            .eq('user_email', updates.assignee_email)
            .single();

          if (assigneeMember) {
            const assigneeName = assigneeMember.user_name || updates.assignee_email.split('@')[0];
            updates.assignee_name = assigneeName;
            updates.assignee_initial = assigneeName.charAt(0).toUpperCase();
          }
        }
      }
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

// Get all users from the household (for assignment dropdown)
export async function getUsers() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Error getting user:', authError);
      return [];
    }

    // Get user's household
    const { data: householdMember, error: householdError } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (householdError) {
      console.error('Error fetching household member:', householdError);
      return [];
    }

    if (!householdMember) {
      console.warn('User is not in a household');
      return [];
    }

    // Get all members of the same household
    const { data: householdMembers, error: membersError } = await supabase
      .from('household_members')
      .select('user_email, user_name, user_id')
      .eq('household_id', householdMember.household_id);

    if (membersError) {
      console.error('Error fetching household members:', membersError);
      return [];
    }

    if (!householdMembers || householdMembers.length === 0) {
      console.warn('No household members found');
      return [];
    }

    // Return the household members as a list of users, excluding the current user
    // (since "Assign to me" option is separate in the UI)
    const users = householdMembers
      .filter(member => member.user_id !== user.id) // Exclude current user
      .map(member => ({
        email: member.user_email,
        name: member.user_name || member.user_email.split('@')[0],
        initial: (member.user_name || member.user_email.split('@')[0]).charAt(0).toUpperCase()
      }));

    return users;
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
}
