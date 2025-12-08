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

  // Profile fields (display only)
  let fullName = '';
  let username = '';
  let email = '';
  let household_name = '';
  let household_admin = '';
  let profilePictureUrl = null;
  let uploadingPicture = false;

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
      
      // Get full name from user metadata
      fullName = user.user_metadata?.full_name || '';

      // Fetch profile row from 'profiles' table
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();

      if (profileErr && profileErr.code !== 'PGRST116') {
        console.warn('Profile fetch warning:', profileErr);
      }

      if (profiles) {
        username = profiles.username ?? '';
        profilePictureUrl = profiles.profile_picture_url ?? null;
        // Use full_name from metadata if available, otherwise use display_name from profile
        if (!fullName && profiles.display_name) {
          fullName = profiles.display_name;
        }
      }

      // Fetch household information from household_members and households tables
      const { data: householdMember, error: memberErr } = await supabase
        .from('household_members')
        .select(`
          household_id,
          is_admin,
          households (
            id,
            name,
            created_by_email
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (memberErr && memberErr.code !== 'PGRST116') {
        console.warn('Household member fetch warning:', memberErr);
      }

      if (householdMember) {
        // Handle households as object (from join) or array
        const household = Array.isArray(householdMember.households) 
          ? householdMember.households[0] 
          : householdMember.households;
        
        if (household) {
          household_name = household.name || '';
          
          // Get household admin info
          if (householdMember.is_admin) {
            household_admin = fullName || email;
          } else {
            // Find the admin of this household
            const { data: adminMember } = await supabase
              .from('household_members')
              .select('user_name, user_email')
              .eq('household_id', householdMember.household_id)
              .eq('is_admin', true)
              .maybeSingle();
            
            if (adminMember) {
              household_admin = adminMember.user_name || adminMember.user_email || '';
            }
          }
        }
      }
    } catch (err) {
      console.error('Profile load error', err);
      error = err?.message ?? 'Unable to load profile.';
    } finally {
      loading = false;
    }
  });


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

  // Handle logout
  async function handleLogout() {
    await supabase.auth.signOut();
    goto('/');
  }

  // Handle profile picture upload
  async function handlePictureUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      error = 'Please select an image file';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error = 'Image size must be less than 5MB';
      return;
    }

    try {
      uploadingPicture = true;
      error = '';

      // Delete old picture if it exists
      if (profilePictureUrl) {
        const oldPath = profilePictureUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('profile-pictures').remove([oldPath]);
      }

      // Create a unique file path: userId/filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Update profile in database (trigger will sync to household_members)
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (updateError) throw updateError;
      
      // Also explicitly update household_members to ensure it's synced immediately
      // (the trigger should handle this, but this ensures it's updated right away)
      const { error: memberUpdateError } = await supabase
        .from('household_members')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', userId);
      
      if (memberUpdateError) {
        console.warn('Warning: Could not update household_members profile picture:', memberUpdateError);
        // Don't throw - the profile update succeeded, and the trigger should handle it
      }

      // Update local state
      profilePictureUrl = publicUrl;
    } catch (err) {
      console.error('Profile picture upload error', err);
      error = err?.message ?? 'Failed to upload profile picture';
    } finally {
      uploadingPicture = false;
      // Reset file input
      event.target.value = '';
    }
  }

  // Get profile picture source (use uploaded picture or default icon)
  function getProfilePictureSrc() {
    return profilePictureUrl || profileIcon;
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
        <label class="avatar-container" for="profile-picture-input">
          <img class="avatar" src={getProfilePictureSrc()} alt="Profile avatar" />
          {#if uploadingPicture}
            <div class="upload-overlay">
              <div class="upload-spinner"></div>
            </div>
          {:else}
            <div class="avatar-edit-icon" title="Change profile picture">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
          {/if}
        </label>
        <input
          id="profile-picture-input"
          type="file"
          accept="image/*"
          on:change={handlePictureUpload}
          style="display: none;"
          disabled={uploadingPicture}
        />
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
          <button class="action-btn danger" on:click={showLeaveHouseholdModal}>Leave Household</button>
        </div>
      {/if}
    </section>

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

  .avatar-container {
    position: relative;
    cursor: pointer;
    display: inline-block;
    border-radius: 999px;
    transition: transform 0.2s;
  }

  .avatar-container:hover {
    transform: scale(1.05);
  }

  .avatar-container:hover .avatar-edit-icon {
    opacity: 1;
  }

  .avatar {
    width: 64px;
    height: 64px;
    border-radius: 999px;
    padding: 6px;
    box-sizing: content-box;
    object-fit: cover;
    display: block;
  }

  .avatar-edit-icon {
    position: absolute;
    bottom: 0;
    right: 0;
    background: #4CAF50;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .upload-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .upload-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
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
