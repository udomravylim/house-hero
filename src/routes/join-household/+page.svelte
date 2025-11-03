<script>
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/user.js';
  import { onMount } from 'svelte';

  let householdName = '';
  let householdCode = '';
  let loading = false;
  let error = '';

  onMount(() => {
    // Check if user is authenticated
    if (!$user) {
      goto('/?message=login-required');
      return;
    }
  });

  async function handleJoinHousehold() {
    if (!householdName || !householdCode) {
      error = 'Please fill in all fields';
      return;
    }

    loading = true;
    error = '';

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        error = 'User not authenticated';
        return;
      }

      // Look for a household with matching name and code
      const { data: households, error: searchError } = await supabase
        .from('households')
        .select('id, name, code')
        .eq('name', householdName)
        .eq('code', householdCode)
        .single();

      if (searchError || !households) {
        error = 'Household not found. Please check the name and code.';
        loading = false;
        return;
      }

      // Check if user is already in a household
      const { data: existingMembership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      // If there's a membership and no error, user is already in a household
      if (existingMembership && !membershipError) {
        error = 'You are already a member of a household.';
        loading = false;
        return;
      }

      // If error is not "no rows found" (PGRST116), there's a real problem
      if (membershipError && membershipError.code !== 'PGRST116') {
        error = membershipError.message || 'Error checking household membership.';
        loading = false;
        return;
      }

      // Get user's display name
      const userName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];

      // Add user to the household
      const { error: joinError } = await supabase
        .from('household_members')
        .insert([
          {
            household_id: households.id,
            user_id: currentUser.id,
            user_email: currentUser.email,
            user_name: userName
          }
        ]);

      if (joinError) {
        error = joinError.message;
      } else {
        // Success! Redirect to tasks page
        goto('/tasks');
      }
    } catch (err) {
      error = 'An unexpected error occurred';
      console.error('Join household error:', err);
    } finally {
      loading = false;
    }
  }

  function handleCreateHousehold() {
    goto('/create-household');
  }

  async function handleSwitchAccount() {
    await supabase.auth.signOut();
    goto('/');
  }
</script>

<div class="page">
  <div class="container">
    <div class="header">
      <h1>Join Household</h1>
      <button class="switch-account-btn" on:click={handleSwitchAccount} title="Switch Account" disabled={loading}>
        Switch Account
      </button>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <form class="form" on:submit|preventDefault={handleJoinHousehold}>
      <label for="householdName">Household Name</label>
      <input
        type="text"
        id="householdName"
        placeholder="Enter household name"
        bind:value={householdName}
        required
        disabled={loading}
      />

      <label for="householdCode">Household Code</label>
      <input
        type="text"
        id="householdCode"
        placeholder="Enter household code"
        bind:value={householdCode}
        required
        disabled={loading}
      />

      <button type="submit" class="button primary" disabled={loading}>
        {loading ? 'Joining...' : 'Join Household'}
      </button>
    </form>

    <div class="divider">
      <span>or</span>
    </div>

    <button class="button secondary" on:click={handleCreateHousehold} disabled={loading}>
      Create Household
    </button>
  </div>
</div>

<style>
  .page {
    background-color: #a5d9d4;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .container {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  h1 {
    font-size: 1.75rem;
    font-weight: 600;
    color: #333;
    margin: 0;
    flex: 1;
    text-align: center;
  }

  .switch-account-btn {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    color: #6c757d;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .switch-account-btn:hover:not(:disabled) {
    background: #e9ecef;
    border-color: #adb5bd;
    color: #495057;
  }

  .switch-account-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    font-weight: 600;
    font-size: 0.9rem;
    color: #555;
  }

  input {
    border: 1px solid #ddd;
    outline: none;
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 1rem;
  }

  input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  .button {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .button.primary {
    background-color: #27ae60;
    color: white;
  }

  .button.primary:hover:not(:disabled) {
    background-color: #229954;
  }

  .button.secondary {
    background-color: #ffd54f;
    color: black;
  }

  .button.secondary:hover:not(:disabled) {
    background-color: #ffca28;
  }

  .divider {
    text-align: center;
    margin: 1.5rem 0;
    position: relative;
  }

  .divider span {
    background: white;
    padding: 0 1rem;
    color: #999;
  }

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    text-align: center;
  }
</style>

