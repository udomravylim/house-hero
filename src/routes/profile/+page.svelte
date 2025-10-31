<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import profileIcon from '$lib/assets/menu-icon-profile.svg';
  import homeIcon from '$lib/assets/menu-icon-home.svg';
  import addIcon from '$lib/assets/menu-icon-add.svg';
  import noteIcon from '$lib/assets/menu-icon-note.svg';
  import medalIcon from '$lib/assets/menu-icon-medal.svg';
  import { user, getUserDisplayName } from '$lib/stores/user.js';
  import { supabase } from '$lib/supabase.js';

  // UI state
  let loading = true;
  let saving = false;
  let error = '';
  let userId = null;

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

  // Leave household: clears household fields in profile (adjust logic to fit your schema)
  async function leaveHousehold() {
    try {
      const confirmed = confirm('Are you sure you want to leave this household?');
      if (!confirmed) return;

      saving = true;
      error = '';

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ household_name: null, household_admin: null, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updErr) throw updErr;

      household_name = '';
      household_admin = '';
    } catch (err) {
      console.error('Leave household error', err);
      error = err?.message ?? 'Could not leave household.';
    } finally {
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

      <label class="label">Username</label>
      <input class="input" type="text" bind:value={username} />

      <label class="label">Email</label>
      <input class="input" type="email" bind:value={email} disabled />

      <div class="card-row right">
        <button class="link-btn" on:click={resetPassword}>Reset Password →</button>
      </div>
    </section>

    <!-- Household Card -->
    <section class="card">
      <h2 class="card-title">Household Info</h2>

      <label class="label">Household Name</label>
      <input class="input" type="text" bind:value={household_name} />

      <label class="label">Household Admin</label>
      <input class="input" type="text" bind:value={household_admin} />

      <div class="card-row right">
        <button class="link-btn danger" on:click={leaveHousehold}>Leave Household →</button>
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
  <nav class="bottom-nav">
    <button type="button" class="nav-button" aria-label="Home" on:click={() => goto('/tasks')}><img src={homeIcon} alt="Home"/></button>
    <button type="button" class="nav-button" aria-label="Profile" on:click={() => goto('/profile')}><img src={profileIcon} alt="Profile"/></button>
    <button class="fab nav-button" on:click={() => (showAdd = !showAdd)} type="button" aria-label="Add new task"><img src={addIcon} alt="Add"/></button>
    <button type="button" class="nav-button" aria-label="Notes"><img src={noteIcon} alt="Notes"/></button>
    <button type="button" class="nav-button" aria-label="Achievements"><img src={medalIcon} alt="Achievements"/></button>
  </nav>
</main>

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

  /* bottom nav */
  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 76px;
    background: #bfe6e0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 40;
  }

  .nav-item, .nav-fab {
    background: transparent;
    border: none;
    padding: 8px;
    border-radius: 999px;
    cursor: pointer;
  }

  .nav-item img {
    width: 34px;
    height: 34px;
  }

  .nav-fab img {
    width: 62px;
    height: 62px;
    display: block;
    transform: translateY(-6px);
  }
  .bottom-nav {
    max-width: 420px;
    margin: 0 auto;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 72px;
    background: #9fe0d9;
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

    .nav-button {
    background: none;
    border: none;
    padding: 6px 12px;
    border-radius: 999px;
    cursor: pointer;
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
</style>
