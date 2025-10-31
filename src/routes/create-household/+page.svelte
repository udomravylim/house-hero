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

  async function handleCreateHousehold() {
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

      // Check if a household with this name and code already exists
      const { data: existingHousehold } = await supabase
        .from('households')
        .select('id')
        .eq('name', householdName)
        .eq('code', householdCode)
        .single();

      if (existingHousehold) {
        error = 'A household with this name and code already exists.';
        loading = false;
        return;
      }

      // Check if user is already in a household
      const { data: existingMembership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', currentUser.id)
        .single();

      if (existingMembership) {
        error = 'You are already a member of a household.';
        loading = false;
        return;
      }

      // Create the new household
      const { data: newHousehold, error: createError } = await supabase
        .from('households')
        .insert([
          {
            name: householdName,
            code: householdCode,
            created_by: currentUser.id,
            created_by_email: currentUser.email
          }
        ])
        .select()
        .single();

      if (createError) {
        error = createError.message;
        loading = false;
        return;
      }

      // Get user's display name
      const userName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];

      // Add the creator as a member of the household
      const { error: joinError } = await supabase
        .from('household_members')
        .insert([
          {
            household_id: newHousehold.id,
            user_id: currentUser.id,
            user_email: currentUser.email,
            user_name: userName,
            is_admin: true
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
      console.error('Create household error:', err);
    } finally {
      loading = false;
    }
  }

  async function handleSwitchAccount() {
    await supabase.auth.signOut();
    goto('/');
  }

</script>

<div class="page">
  <div class="container">
    <div class="header">
      <h1>Create Household</h1>
      <button class="switch-account-btn" on:click={handleSwitchAccount} title="Switch Account" disabled={loading}>
        Switch Account
      </button>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <form class="form" on:submit|preventDefault={handleCreateHousehold}>
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
        {loading ? 'Creating...' : 'Create'}
      </button>
    </form>
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

  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    text-align: center;
  }
</style>

