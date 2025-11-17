<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { user } from '$lib/stores/userStore';
  import { getUserDisplayName } from '$lib/utils/format';
  import profileIcon from '$lib/assets/profile-icon.png';

  let fullName = '';
  let username = '';
  let email = '';
  let household_name = '';
  let household_admin = '';
  let avatarUrl = null;

  let loading = true;
  let error = null;

  let showLeaveModal = false;
  let leaveLoading = false;

  onMount(async () => {
    try {
      loading = true;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .single();

      if (profileError) throw profileError;

      fullName = profileData.full_name;
      username = profileData.username;
      email = profileData.email;
      household_name = profileData.household_name;
      household_admin = profileData.household_admin;
      avatarUrl = profileData.avatar_url;

    } catch (err) {
      error = 'Failed to load profile.';
      console.error(err);
    } finally {
      loading = false;
    }
  });

  async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const fileName = `${crypto.randomUUID()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      avatarUrl = urlData.publicUrl;

      await supabase.from('profiles').update({ avatar_url: avatarUrl });

    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  function showLeaveHouseholdModal() {
    showLeaveModal = true;
  }

  async function confirmLeaveHousehold() {
    try {
      leaveLoading = true;

      const { error: leaveError } = await supabase
        .from('profiles')
        .update({ household_name: null, household_admin: null });

      if (leaveError) throw leaveError;

      household_name = null;
      household_admin = null;
      showLeaveModal = false;

    } catch (err) {
      console.error(err);
      alert('Failed to leave household.');
    } finally {
      leaveLoading = false;
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

    <!-- Profile Photo Section -->
    <section class="profile-photo">
      <img class="profile-photo-img" src={avatarUrl || profileIcon} alt={fullName ? `${fullName}'s avatar` : 'User avatar'}/>

      <label class="upload-btn">
        Change Photo
        <input type="file" accept="image/*" on:change={uploadAvatar} />
      </label>
    </section>

    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <img class="avatar" src={avatarUrl || profileIcon} alt="Profile avatar" />
        <h1 class="name">{getUserDisplayName($user)}</h1>
      </div>

      <div class="header-actions">
        <button class="logout-btn" on:click={handleLogout}>
          Logout
        </button>
      </div>
    </header>

    <!-- Personal Info Card -->
    <section class="card">
      <h2 class="card-title">Personal Info</h2>

      <div class="info-item">
        <div class="info-label">Full Name</div>
        <div class="info-value">{fullName || 'Not set'}</div>
      </div>

      {#if username}
        <div class="info-item">
          <div class="info-label">Username</div>
          <div class="info-value">{username}</div>
        </div>
      {/if}

      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">{email || 'Not available'}</div>
      </div>
    </section>

    <!-- Household Card -->
    <section class="card">
      <h2 class="card-title">Household Info</h2>

      <div class="info-item">
        <div class="info-label">Household Name</div>
        <div class="info-value">{household_name || 'Not in a household'}</div>
      </div>

      <div class="info-item">
        <div class="info-label">Household Admin</div>
        <div class="info-value">{household_admin || 'N/A'}</div>
      </div>

      {#if household_name}
        <div class="card-actions">
          <button class="action-btn danger" on:click={showLeaveHouseholdModal}>
            Leave Household
          </button>
        </div>
      {/if}
    </section>
  {/if}

  {#if showLeaveModal}
    <div class="modal-overlay">
      <div class="modal-content">
        <h2 class="modal-title">Leave Household</h2>
        <p class="modal-message">
          Are you sure you want to leave this household?
        </p>

        <div class="modal-actions">
          <button class="modal-btn cancel" on:click={() => (showLeaveModal = false)}>
            Cancel
          </button>

          <button
            class="modal-btn confirm"
            disabled={leaveLoading}
            on:click={confirmLeaveHousehold}
          >
            {leaveLoading ? 'Leaving…' : 'Leave'}
          </button>
        </div>
      </div>
    </div>
  {/if}
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
    padding: 28px 20px 110px;
    min-height: 100vh;
    box-sizing: border-box;
  }

  /* --- PROFILE PHOTO SECTION --- */

  .profile-photo {
    text-align: center;
    margin-bottom: 32px;
  }

  .profile-photo-img {
    width: 120px;
    height: 120px;
    border-radius: 999px;
    object-fit: cover;
    border: 4px solid #eee;
    margin-bottom: 12px;
  }

  .upload-btn {
    display: inline-block;
    background: #f4f4f4;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    transition: background 0.2s;
  }

  .upload-btn:hover {
    background: #e3e3e3;
  }

  .upload-btn input {
    display: none;
  }

  /* --- END PROFILE PHOTO SECTION --- */

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

  .logout-btn {
    border: none;
    background: #f4f6f6;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    color: #444;
    font-weight: 600;
    font-size: 14px;
    transition: background 0.2s;
  }

  .logout-btn:hover {
    background: #e8eaea;
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

  .info-item {
    margin-bottom: 20px;
  }

  .info-item:last-child {
    margin-bottom: 0;
  }

  .info-label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .info-value {
    font-size: 16px;
    color: #222;
    font-weight: 500;
  }

  .card-actions {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(0,0,0,0.1);
  }

  .action-btn {
    width: 100%;
    padding: 12px 20px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn.danger {
    background: #ffebee;
    color: #c62828;
  }

  .action-btn.danger:hover {
    background: #ffcdd2;
  }

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
