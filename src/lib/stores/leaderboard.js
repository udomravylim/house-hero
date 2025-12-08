import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// Create writable stores for leaderboard data
export const members = writable([]);
export const loading = writable(false);
export const error = writable(null);
export const householdGoal = writable(1000);

// Calculate streak based on consecutive days with completed tasks
function calculateStreak(completedTasks) {
  if (!completedTasks || completedTasks.length === 0) {
    return 0;
  }

  // Group by date
  const dates = new Set();
  completedTasks.forEach(task => {
    const date = new Date(task.updated_at).toDateString();
    dates.add(date);
  });

  const sortedDates = Array.from(dates)
    .map(d => new Date(d))
    .sort((a, b) => b - a);

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedDates.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    checkDate.setHours(0, 0, 0, 0);

    const dateStr = checkDate.toDateString();
    const hasTask = sortedDates.some(d => d.toDateString() === dateStr);

    if (hasTask) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// Fetch leaderboard data
export async function fetchLeaderboard() {
  loading.set(true);
  error.set(null);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      members.set([]);
      return;
    }

    // Get user's household
    const { data: householdMember } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (!householdMember) {
      members.set([]);
      return;
    }

    const householdId = householdMember.household_id;

    // Get all household members
    const { data: allMembers } = await supabase
      .from('household_members')
      .select('user_id, user_email, user_name, profile_picture_url')
      .eq('household_id', householdId);

    if (!allMembers || allMembers.length === 0) {
      members.set([]);
      return;
    }

    // Get points for all members - try RPC function first, fallback to direct query
    let pointsMap = {};
    
    try {
      const { data: pointsData } = await supabase.rpc('get_user_points', {
        p_household_id: householdId,
        p_user_email: null // null means get all users
      });

      if (pointsData) {
        pointsData.forEach(p => {
          pointsMap[p.user_email] = p.total_points || 0;
        });
      }
    } catch (rpcError) {
      // If RPC function doesn't exist, try direct query
      try {
        const { data: pointsData } = await supabase
          .from('user_points')
          .select('user_email, total_points')
          .eq('household_id', householdId);

        if (pointsData) {
          pointsData.forEach(p => {
            pointsMap[p.user_email] = p.total_points || 0;
          });
        }
      } catch (directError) {
        // If points table doesn't exist, all members will have 0 points
      }
    }

    // Fetch all completed tasks for streak calculation (single query for all members)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: allCompletedTasks } = await supabase
      .from('tasks')
      .select('assignee_email, updated_at')
      .eq('household_id', householdId)
      .eq('completed', true)
      .gte('updated_at', thirtyDaysAgo.toISOString());

    // Group completed tasks by user email
    const tasksByUser = {};
    if (allCompletedTasks) {
      allCompletedTasks.forEach(task => {
        if (!tasksByUser[task.assignee_email]) {
          tasksByUser[task.assignee_email] = [];
        }
        tasksByUser[task.assignee_email].push(task);
      });
    }

    // Build member data with points and streaks
    const membersData = allMembers.map((member) => {
      const points = pointsMap[member.user_email] || 0;
      const userTasks = tasksByUser[member.user_email] || [];
      const streak = calculateStreak(userTasks);

      return {
        id: member.user_id,
        name: member.user_name || member.user_email.split('@')[0],
        points: points, // Primary metric - points from completed tasks
        avatar: member.profile_picture_url || null,
        email: member.user_email,
        streak: streak, // Day streak calculated from completed tasks
        badges: [] // Default value (not calculated for performance)
      };
    });

    // Sort by points descending
    membersData.sort((a, b) => b.points - a.points);

    members.set(membersData);
  } catch (err) {
    error.set('Failed to fetch leaderboard');
    console.error('Error fetching leaderboard:', err);
    members.set([]);
  } finally {
    loading.set(false);
  }
}

// Set up real-time subscription for user_points changes
let pointsSubscription = null;
let tasksSubscription = null;

export async function subscribeToLeaderboardUpdates() {
  // Unsubscribe from previous subscriptions if they exist
  if (pointsSubscription) {
    supabase.removeChannel(pointsSubscription);
    pointsSubscription = null;
  }
  if (tasksSubscription) {
    supabase.removeChannel(tasksSubscription);
    tasksSubscription = null;
  }

  // Get current user's household
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: householdMember } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (!householdMember) return;

  // Subscribe to changes in user_points table (if it exists)
  try {
    pointsSubscription = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `household_id=eq.${householdMember.household_id}`
        },
        (payload) => {
          // Debounce leaderboard refresh to avoid excessive updates
          clearTimeout(window.leaderboardRefreshTimeout);
          window.leaderboardRefreshTimeout = setTimeout(() => {
            fetchLeaderboard();
          }, 500);
        }
      )
      .subscribe();
  } catch (err) {
    // Subscription failed - continue without real-time updates
  }

  // Subscribe to task completion changes
  try {
    tasksSubscription = supabase
      .channel('task-completion-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `household_id=eq.${householdMember.household_id}`
        },
        (payload) => {
          // Debounce leaderboard refresh to avoid excessive updates
          clearTimeout(window.leaderboardRefreshTimeout);
          window.leaderboardRefreshTimeout = setTimeout(() => {
            fetchLeaderboard();
          }, 500);
        }
      )
      .subscribe();
  } catch (err) {
    // Subscription failed - continue without real-time updates
  }
}

// Cleanup subscription
export function unsubscribeFromLeaderboardUpdates() {
  if (pointsSubscription) {
    supabase.removeChannel(pointsSubscription);
    pointsSubscription = null;
  }
  if (tasksSubscription) {
    supabase.removeChannel(tasksSubscription);
    tasksSubscription = null;
  }
}

