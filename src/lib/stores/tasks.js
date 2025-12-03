import { writable, get } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// Create a writable store for tasks
export const tasks = writable([]);
export const loading = writable(false);
export const error = writable(null);

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

// Award or deduct points to a user
async function updateUserPoints(householdId, userEmail, points) {
  if (!userEmail || userEmail === 'unassigned' || !householdId) {
    return;
  }

  try {
    const { error: pointsError } = await supabase.rpc('add_user_points', {
      p_household_id: householdId,
      p_user_email: userEmail,
      p_points: points
    });

    if (pointsError) {
      console.error('Error updating user points:', pointsError);
    }
  } catch (err) {
    console.error('Error updating user points:', err);
  }
}

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

    // Fetch profile pictures for assignees and creators
    if (data && data.length > 0) {
      // Get all household members to map emails to user_ids
      const { data: allMembers } = await supabase
        .from('household_members')
        .select('user_id, user_email')
        .eq('household_id', householdMember.household_id);

      if (allMembers && allMembers.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(allMembers.map(m => m.user_id))];
        
        // Fetch profile pictures for all household members
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, profile_picture_url')
          .in('id', userIds);

        // Create email to profile picture mapping
        const emailToPicture = {};
        if (profiles && allMembers) {
          allMembers.forEach(member => {
            const profile = profiles.find(p => p.id === member.user_id);
            if (profile?.profile_picture_url) {
              emailToPicture[member.user_email] = profile.profile_picture_url;
            }
          });
        }

        // Add profile picture URLs to tasks
        data.forEach(task => {
          if (task.assignee_email && task.assignee_email !== 'unassigned') {
            task.assignee_picture_url = emailToPicture[task.assignee_email] || null;
          }
          if (task.created_by) {
            task.created_by_picture_url = emailToPicture[task.created_by] || null;
          }
        });
      }
    }

    if (fetchError) {
      error.set(fetchError.message);
    } else {
      // Ensure completed is a boolean for all tasks
      const normalizedTasks = (data || []).map(task => ({
        ...task,
        completed: Boolean(task.completed)
      }));
      tasks.set(normalizedTasks);
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
    let assigneeEmail = taskData.assignee_email;
    if (!assigneeEmail || assigneeEmail === '' || assigneeEmail === 'me') {
      assigneeEmail = user.email;
    }
    const assigneeInitial = taskData.assignee_email === 'unassigned' ? null : (taskData.assignee_initial || userInitial);
    const assigneeName = taskData.assignee_email === 'unassigned' ? null : (taskData.assignee_name || userName);

    // Fetch profile picture URLs for assignee and creator
    let assigneePictureUrl = null;
    let createdByPictureUrl = null;

    // Get assignee profile picture if assigned
    if (assigneeEmail && assigneeEmail !== 'unassigned') {
      // If assigning to current user, use their ID directly
      if (assigneeEmail === user.email) {
        const { data: assigneeProfile } = await supabase
          .from('profiles')
          .select('profile_picture_url')
          .eq('id', user.id)
          .maybeSingle();
        
        if (assigneeProfile?.profile_picture_url) {
          assigneePictureUrl = assigneeProfile.profile_picture_url;
        }
      } else {
        // For other users, find them in household_members
        const { data: assigneeMember } = await supabase
          .from('household_members')
          .select('user_id')
          .eq('household_id', householdMember.household_id)
          .eq('user_email', assigneeEmail)
          .maybeSingle();
        
        if (assigneeMember) {
          const { data: assigneeProfile } = await supabase
            .from('profiles')
            .select('profile_picture_url')
            .eq('id', assigneeMember.user_id)
            .maybeSingle();
          
          if (assigneeProfile?.profile_picture_url) {
            assigneePictureUrl = assigneeProfile.profile_picture_url;
          }
        }
      }
    }

    // Get creator profile picture
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('profile_picture_url')
      .eq('id', user.id)
      .maybeSingle();
    
    if (creatorProfile?.profile_picture_url) {
      createdByPictureUrl = creatorProfile.profile_picture_url;
    }

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
        difficulty: taskData.difficulty || 'hard',
        household_id: householdMember.household_id
      }])
      .select()
      .single();

    // Add profile picture URLs to the returned task data
    if (data) {
      data.assignee_picture_url = assigneePictureUrl;
      data.created_by_picture_url = createdByPictureUrl;
    }

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
  // Don't set loading for task updates to avoid UI flicker
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
          
          // Fetch current user's profile picture
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('profile_picture_url')
            .eq('id', user.id)
            .maybeSingle();
          
          if (currentUserProfile?.profile_picture_url) {
            updates.assignee_picture_url = currentUserProfile.profile_picture_url;
          } else {
            updates.assignee_picture_url = null;
          }
        } else {
          // Find the assignee member info
          const { data: assigneeMember } = await supabase
            .from('household_members')
            .select('user_email, user_name, user_id')
            .eq('household_id', householdMember.household_id)
            .eq('user_email', updates.assignee_email)
            .single();

          if (assigneeMember) {
            const assigneeName = assigneeMember.user_name || updates.assignee_email.split('@')[0];
            updates.assignee_name = assigneeName;
            updates.assignee_initial = assigneeName.charAt(0).toUpperCase();
            
            // Fetch assignee profile picture
            const { data: assigneeProfile } = await supabase
              .from('profiles')
              .select('profile_picture_url')
              .eq('id', assigneeMember.user_id)
              .maybeSingle();
            
            if (assigneeProfile?.profile_picture_url) {
              updates.assignee_picture_url = assigneeProfile.profile_picture_url;
            } else {
              updates.assignee_picture_url = null;
            }
          }
        }
      }
    }

    // Ensure completed is a boolean
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    if (updates.completed !== undefined) {
      updateData.completed = Boolean(updates.completed);
    }

    const { data, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      error.set(updateError.message);
      return null;
    }

    // Ensure completed is a boolean in the returned data
    if (data) {
      data.completed = Boolean(data.completed);
      
      // If assignee_picture_url was updated, make sure it's included
      if (updates.assignee_picture_url !== undefined) {
        data.assignee_picture_url = updates.assignee_picture_url;
      }
      
      // Update the task in the store immediately
      tasks.update(currentTasks => {
        const updated = currentTasks.map(task => 
          task.id === taskId ? { ...task, ...data, completed: Boolean(data.completed) } : task
        );
        return updated;
      });
    }
    
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
  // Don't set loading to avoid UI flicker since we're doing optimistic updates
  error.set(null);
  
  try {
    // Get the current tasks from the store using get()
    const currentTasks = get(tasks);
    
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) {
      const result = await updateTask(taskId, { completed });
      return result;
    }

    // Check if completion status is actually changing
    const wasCompleted = Boolean(task.completed);
    const isNowCompleted = Boolean(completed);

    // Update database first (faster) - don't wait for points update
    const updatePromise = updateTask(taskId, { completed: isNowCompleted });
    
    // Update points in background (non-blocking)
    if (wasCompleted !== isNowCompleted) {
      updatePointsInBackground(task, isNowCompleted).catch(err => {
        console.error('Error updating points in background:', err);
      });
    }

    // Wait for the update to complete
    const result = await updatePromise;
    return result;
  } catch (err) {
    error.set('Failed to toggle task completion');
    console.error('Error toggling task completion:', err);
    // Revert optimistic update on error
    const currentTasks = get(tasks);
    const task = currentTasks.find(t => t.id === taskId);
    if (task) {
      tasks.update(currentTasks => 
        currentTasks.map(t => 
          t.id === taskId ? { ...t, completed: !completed } : t
        )
      );
    }
    return null;
  }
}

// Helper function to update points in the background
async function updatePointsInBackground(task, isNowCompleted) {
  const points = calculatePoints(task.priority || 'medium', task.difficulty || 'hard');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: householdMember } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (householdMember && task.assignee_email && task.assignee_email !== 'unassigned') {
    if (isNowCompleted) {
      // Award points when task is completed
      await updateUserPoints(householdMember.household_id, task.assignee_email, points);
    } else {
      // Deduct points when task is uncompleted
      await updateUserPoints(householdMember.household_id, task.assignee_email, -points);
    }
  }
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

    // Fetch profile pictures for household members
    const userIds = householdMembers.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, profile_picture_url')
      .in('id', userIds);

    // Create user_id to profile picture mapping
    const userIdToPicture = {};
    if (profiles) {
      profiles.forEach(profile => {
        if (profile.profile_picture_url) {
          userIdToPicture[profile.id] = profile.profile_picture_url;
        }
      });
    }

    // Return the household members as a list of users, excluding the current user
    // (since "Assign to me" option is separate in the UI)
    const users = householdMembers
      .filter(member => member.user_id !== user.id) // Exclude current user
      .map(member => ({
        email: member.user_email,
        name: member.user_name || member.user_email.split('@')[0],
        initial: (member.user_name || member.user_email.split('@')[0]).charAt(0).toUpperCase(),
        profile_picture_url: userIdToPicture[member.user_id] || null
      }));

    return users;
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
}

// Get user points for the current household
export async function getUserPoints(userEmail = null) {
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

    if (householdError || !householdMember) {
      console.error('Error fetching household member:', householdError);
      return [];
    }

    // Get points using the database function
    const { data, error: pointsError } = await supabase.rpc('get_user_points', {
      p_household_id: householdMember.household_id,
      p_user_email: userEmail
    });

    if (pointsError) {
      console.error('Error fetching user points:', pointsError);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching user points:', err);
    return [];
  }
}

// Get current user's total points
export async function getCurrentUserPoints() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return 0;
    }

    const points = await getUserPoints(user.email);
    if (points && points.length > 0) {
      return points[0].total_points || 0;
    }
    return 0;
  } catch (err) {
    console.error('Error fetching current user points:', err);
    return 0;
  }
}
