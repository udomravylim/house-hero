<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';
  import { user, getUserDisplayName } from '$lib/stores/user.js';
  import { supabase } from '$lib/supabase.js';

  // UI state
  let loading = true;
  let saving = false;
  let error = '';
  let userId = null;
  let showLeaveModal = false;

  // Profile fields (editable)
  let display_name = '';
  let username = '';
  let email = '';
  let household_name = '';
  let household_admin = '';

  // Fetch the current user & profile on mount
  onMount(async () => {
    try {
      loading = true;
      error = '';

      // get current auth user
      const {
        data: { user },
        error: authErr
      } = await supabase.auth.getUser();

      if (authErr) throw authErr;
      if (!user) {
        // not logged in - redirect to homepage / login
        goto('/?message=login-required');
        return;
      }

      userId = user.id;
      email = user.email ?? '';

      // Fetch profile row from 'profiles' table (adjust table name if different)
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .single();

      if (profileErr && profileErr.code !== 'PGRST116') {
        // PGRST116: no rows returned on some setups — we'll allow missing profile
        throw profileErr;
      }

      if (profiles) {
        display_name = profiles.display_name ?? '';
        username = profiles.username ?? '';
        household_name = profiles.household_name ?? '';
        household_admin = profiles.household_admin ?? '';
      }
    } catch (err) {
      console.error('Profile load error', err);
      error = err?.message ?? 'Unable to load profile.';
    } finally {
      loading = false;
    }
  });

  // Save changes back to Supabase
  async function saveProfile() {
    try {
      saving = true;
      error = '';

      // Upsert to profiles table (id = auth user id)
      const updates = {
        id: userId,
        display_name,
        username,
        household_name,
        household_admin,
        updated_at: new Date().toISOString()
      };

      const { error: upsertErr } = await supabase.from('profiles').upsert(updates, { returning: 'minimal' });

      if (upsertErr) throw upsertErr;

      // Optionally show a little visual confirmation (not implemented here)
    } catch (err) {
      console.error('Save error', err);
      error = err?.message ?? 'Failed to save profile.';
    } finally {
      saving = false;
    }
  }

  // Show leave household confirmation modal
  function showLeaveHouseholdModal() {
    showLeaveModal = true;
  }

  // Close modal
  function closeLeaveModal() {
    showLeaveModal = false;
  }

  // Leave household: removes user from household_members and redirects to join page
  async function confirmLeaveHousehold() {
    try {
      showLeaveModal = false;
      saving = true;
      error = '';

      // Remove user from household_members table
      const { error: deleteErr } = await supabase
        .from('household_members')
        .delete()
        .eq('user_id', userId);

      if (deleteErr) throw deleteErr;

      // Optionally clear household fields from profile for consistency
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ household_name: null, household_admin: null, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updErr) {
        console.warn('Profile update warning:', updErr);
        // Don't throw - the main operation (leaving household) succeeded
      }

      // Redirect to join household page
      goto('/join-household');
    } catch (err) {
      console.error('Leave household error', err);
      error = err?.message ?? 'Could not leave household.';
      saving = false;
    }
  }

  // Reset password: redirects to a password reset flow (open a modal / call supabase.auth.resetPasswordForEmail)
  async function resetPassword() {
    try {
      if (!email) {
        alert('No email available for this account.');
        return;
      }
      // This example triggers Supabase to send a password reset email.
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/reset-complete`
      });
      if (resetErr) throw resetErr;
      alert('Password reset email sent.');
    } catch (err) {
      console.error('Reset password error', err);
      alert(err?.message ?? 'Unable to send reset email.');
    }
  }
</script>

<main class="page">
  {#if loading}
    <div class="loader">Loading profile…</div>
  {:else}
    {#if error}
      <div class="error">{error}</div>
    {/if}

    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <img class="avatar" src={profileIcon} alt="Profile avatar" />
        <h1 class="name">{getUserDisplayName($user)}</h1>
      </div>

      <div class="header-actions">
        <button class="logout" on:click={async () => { await supabase.auth.signOut(); goto('/'); }}>
          Logout
        </button>
      </div>
    </header>

    <!-- Personal Info Card -->
    <section class="card">
      <h2 class="card-title">Personal Info</h2>

      <label class="label" for="username">Username</label>
      <input id="username" class="input" type="text" bind:value={username} />

      <label class="label" for="email">Email</label>
      <input id="email" class="input" type="email" bind:value={email} disabled />

      <div class="card-row right">
        <button class="link-btn" on:click={resetPassword}>Reset Password →</button>
      </div>
    </section>

    <!-- Household Card -->
    <section class="card">
      <h2 class="card-title">Household Info</h2>

      <label class="label" for="household-name">Household Name</label>
      <input id="household-name" class="input" type="text" bind:value={household_name} />

      <label class="label" for="household-admin">Household Admin</label>
      <input id="household-admin" class="input" type="text" bind:value={household_admin} />

      <div class="card-row right">
        <button class="link-btn danger" on:click={showLeaveHouseholdModal}>Leave Household →</button>
      </div>
    </section>

    <!-- Create Another Household -->
    <div class="create-row">
      <button class="ghost-btn" on:click={() => goto('/households/create')}>
        Create Another Household <span class="plus">+</span>
      </button>
    </div>

    <!-- Save Button -->
    <div class="save-row">
      <button class="save-btn" on:click={saveProfile} disabled={saving}>
        {#if saving}Saving…{:else}Save Changes{/if}
      </button>
    </div>
  {/if}

  <!-- Bottom nav (fixed) -->
  <BottomNav />
</main>

<!-- Leave Household Confirmation Modal -->
{#if showLeaveModal}
  <div 
    class="modal-overlay" 
    role="dialog" 
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    on:click={closeLeaveModal} 
    on:keydown={(e) => e.key === 'Escape' && closeLeaveModal()}
  >
    <div class="modal-content" role="region" aria-label="Confirmation dialog content">
      <h2 id="modal-title" class="modal-title">Leave Household?</h2>
      <p class="modal-message">
        Are you sure you want to leave {household_name || 'this household'}?
      </p>
      <div class="modal-actions">
        <button class="modal-btn cancel" on:click={closeLeaveModal} disabled={saving}>
          Cancel
        </button>
        <button class="modal-btn confirm" on:click={confirmLeaveHousehold} disabled={saving}>
          {saving ? 'Leaving...' : 'Leave'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    background: white;
    color: #111;
  }

  .page {
    max-width: 420px;
    margin: 0 auto;
    padding: 28px 20px 110px; /* bottom padding to allow nav */
    min-height: 100vh;
    box-sizing: border-box;
  }

  .loader {
    padding: 36px;
    text-align: center;
    color: #666;
  }

  .error {
    background: #ffebee;
    color: #b00020;
    padding: 10px;
    border-radius: 8px;
    margin-bottom: 12px;
    text-align: center;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 999px;
    padding: 6px;
    box-sizing: content-box;
  }

  .name {
    font-size: 34px;
    margin: 0;
    font-weight: 700;
    color: #222;
  }

  .header-actions .logout {
    border: none;
    background: #f4f6f6;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    color: #444;
    font-weight: 600;
  }

  .card {
    background: #f5f5f5;
    border-radius: 18px;
    padding: 22px;
    margin-bottom: 26px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.02);
  }

  .card-title {
    margin: 0 0 12px 0;
    font-size: 22px;
    font-weight: 700;
    color: #111;
  }

  .label {
    display: block;
    margin-bottom: 8px;
    color: #222;
    font-weight: 600;
    font-size: 14px;
  }

  .input {
    width: 100%;
    padding: 14px 16px;
    border-radius: 12px;
    border: none;
    font-size: 16px;
    margin-bottom: 16px;
    box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
    background: #fff;
  }

  .input:disabled {
    opacity: 0.8;
  }

  .card-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 6px;
  }

  .card-row.right {
    justify-content: flex-end;
  }

  .link-btn {
    background: transparent;
    border: none;
    color: #222;
    font-weight: 600;
    cursor: pointer;
    padding: 6px;
  }

  .link-btn.danger {
    color: #222;
  }

  .create-row {
    display: flex;
    justify-content: flex-start;
    margin: 8px 0 28px 0;
  }

  .ghost-btn {
    background: #f1f1f1;
    border-radius: 16px;
    padding: 10px 14px;
    border: none;
    font-weight: 600;
    color: #666;
    cursor: pointer;
  }

  .ghost-btn .plus {
    margin-left: 8px;
    font-weight: 700;
  }

  .save-row {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
  }

  .save-btn {
    background: #111;
    color: #fff;
    padding: 12px 26px;
    border-radius: 12px;
    border: none;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 6px 18px rgba(0,0,0,0.06);
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }


  /* small screens adjustments */
  @media (max-width: 420px) {
    .page {
      padding-left: 16px;
      padding-right: 16px;
    }
    .name {
      font-size: 28px;
    }
    .card {
      padding: 18px;
    }
    .avatar {
      width: 72px;
      height: 72px;
    }
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
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-title {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: #111;
  }

  .modal-message {
    font-size: 16px;
    color: #666;
    margin: 0 0 24px 0;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .modal-btn {
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .modal-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .modal-btn.cancel {
    background: #f5f5f5;
    color: #333;
  }

  .modal-btn.cancel:hover:not(:disabled) {
    background: #e9e9e9;
  }

  .modal-btn.confirm {
    background: #d32f2f;
    color: white;
  }

  .modal-btn.confirm:hover:not(:disabled) {
    background: #c62828;
  }
</style>
